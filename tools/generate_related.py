#!/usr/bin/env python3
"""
Minimal offline script to generate docs/_data/related.json.

Heuristic: cosine similarity over sentence-transformers embeddings of
post title + first paragraph. Writes top-5 per slug.

Usage (local):
  pip install sentence-transformers
  python tools/generate_related.py
"""
from __future__ import annotations
import json, re, os
import numpy as np
from pathlib import Path

try:
    from sentence_transformers import SentenceTransformer, util
except ImportError:
    raise SystemExit("Install sentence-transformers to run this tool.")

ROOT = Path(__file__).resolve().parents[1]
POSTS = ROOT / "docs" / "_posts"
OUT = ROOT / "docs" / "_data" / "related.json"
EMB = ROOT / "docs" / "_data" / "embeddings.npz"

# Embedding model constants (avoid drift)
EMB_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMB_EXPECTED_DIM = 384

def _slug(p: Path) -> str:
    return p.stem  # e.g., 2025-10-21-owner-repo

def _url(p: Path) -> str:
    # Jekyll default permalink for posts
    y,m,d,rest = p.stem.split('-', 3)
    return f"/{y}/{m}/{d}/{rest}.html"

def _extract(p: Path) -> tuple[str,str]:
    s = p.read_text(encoding="utf-8", errors="ignore")
    # crude: title line starting with '# '
    m = re.search(r"^#\s+(.+)$", s, re.M)
    title = m.group(1).strip() if m else p.stem
    # first non-empty paragraph after title
    body = re.split(r"\n\s*\n", s, maxsplit=1)
    desc = body[1].strip() if len(body) > 1 else ""
    return title, desc

def _owner_from_slug(slug: str) -> str:
    # slug is 'YYYY-MM-DD-owner-repo'; owner may contain dashes, but we take the first token after date
    return slug.split('-', 3)[3].split('-')[0]


def main() -> None:
    files = sorted(POSTS.glob("*.md"))
    print(f"Found {len(files)} posts in {POSTS}")
    items = []
    for p in files:
        title, desc = _extract(p)
        items.append({
            "slug": _slug(p),
            "url": _url(p),
            "title": title,
            "text": (title + "\n\n" + desc)[:2000],
        })

    mode = os.environ.get("RELATED_MODE", "emb")
    only_missing = os.environ.get("RELATED_ONLY_MISSING")
    # Load existing related.json if present
    existing: dict[str, list[dict]] = {}
    if OUT.exists():
        try:
            existing = json.loads(OUT.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            existing = {}
    related: dict[str, list[dict]] = {}
    if mode == "owner":
        # Quick owner-based grouping
        from collections import defaultdict
        by_owner: dict[str, list[int]] = defaultdict(list)
        for i, it in enumerate(items):
            by_owner[_owner_from_slug(it["slug"])].append(i)
        for i, it in enumerate(items):
            owner = _owner_from_slug(it["slug"])
            peers = [j for j in by_owner.get(owner, []) if j != i]
            top = [{"url": items[j]["url"], "title": items[j]["title"], "score": 1.0} for j in peers[:5]]
            # Only write entries when we actually have peers; empty entries
            # are treated as missing by the scheduled embedding run.
            if top:
                related[it["slug"]] = top
    else:
        # Determine which indices to compute (only missing if requested)
        all_slugs = [it["slug"] for it in items]
        if only_missing:
            missing_idx = [i for i, s in enumerate(all_slugs) if not existing.get(s)]
            if not missing_idx:
                print("No missing related entries. Skipping.")
                # Preserve existing
                OUT.write_text(json.dumps(existing, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
                return
        else:
            missing_idx = list(range(len(items)))

        model = SentenceTransformer(EMB_MODEL_NAME)
        dim = model.get_sentence_embedding_dimension()
        assert dim == EMB_EXPECTED_DIM

        # Load persisted embeddings if present
        stored_slugs: list[str] = []
        stored_E: np.ndarray | None = None
        if EMB.exists():
            try:
                z = np.load(EMB, allow_pickle=False)
                stored_slugs = [str(x) for x in z["slugs"]]
                stored_E = z["E"].astype(np.float32)
            except (ValueError, KeyError, OSError):
                stored_slugs = []
                stored_E = None

        slug_to_idx = {s: i for i, s in enumerate(stored_slugs)}

        # Compute embeddings only for slugs missing in storage
        need = [s for s in all_slugs if s not in slug_to_idx]
        if need:
            texts = [items[all_slugs.index(s)]["text"] for s in need]
            new_E = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True).astype(np.float32)
            if new_E.ndim == 1:
                new_E = new_E.reshape(1, -1)
            assert new_E.shape[1] == dim
            if stored_E is None or not len(stored_slugs):
                stored_slugs = need.copy()
                stored_E = new_E
            else:
                stored_slugs.extend(need)
                stored_E = np.vstack([stored_E, new_E])

        # Reorder to current items order and persist compactly (float16)
        E_ordered = np.zeros((len(all_slugs), dim), dtype=np.float32)
        st = {s: i for i, s in enumerate(stored_slugs)}
        for i, s in enumerate(all_slugs):
            E_ordered[i] = stored_E[st[s]]
        np.savez_compressed(EMB, slugs=np.array(all_slugs, dtype='U80'), E=E_ordered.astype(np.float16))

        import torch
        corpus_embs = torch.from_numpy(E_ordered)
        query_embs = corpus_embs[missing_idx]
        hits = util.semantic_search(query_embs, corpus_embs, top_k=32)
        related = existing if only_missing else {}
        for qi, i in enumerate(missing_idx):
            it = items[i]
            # Deduplicate by repo (owner-repo) and prefer the newest dated post per repo.
            best_by_repo: dict[str, dict] = {}
            for h in hits[qi]:
                j = h["corpus_id"]
                if j == i:
                    continue
                score = float(h["score"]) if isinstance(h["score"], (int, float)) else float(h["score"].item())
                s = items[j]["slug"]  # YYYY-MM-DD-owner-repo
                date = s.split('-', 3)[:3]  # [YYYY, MM, DD]
                date_key = "-".join(date)
                repo_id = s.split('-', 3)[3]  # owner-repo
                cur = best_by_repo.get(repo_id)
                candidate = {
                    "url": items[j]["url"],
                    "title": items[j]["title"],
                    "score": round(score, 4),
                    "_date": date_key,
                }
                if cur is None or candidate["_date"] > cur["_date"]:
                    best_by_repo[repo_id] = candidate
            # Rank by score desc and cap at 10; drop internal fields
            out = sorted(best_by_repo.values(), key=lambda x: x["score"], reverse=True)[:10]
            for x in out:
                x.pop("_date", None)
            related[it["slug"]] = out

    OUT.write_text(json.dumps(related, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {OUT}")

if __name__ == "__main__":
    main()
