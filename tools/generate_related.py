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
from pathlib import Path

try:
    from sentence_transformers import SentenceTransformer, util
except Exception:
    raise SystemExit("Install sentence-transformers to run this tool.")

ROOT = Path(__file__).resolve().parents[1]
POSTS = ROOT / "docs" / "_posts"
OUT = ROOT / "docs" / "_data" / "related.json"

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
        except Exception:
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

        model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        corpus_embs = model.encode([it["text"] for it in items], convert_to_tensor=True, normalize_embeddings=True)
        query_embs = corpus_embs[missing_idx]
        hits = util.semantic_search(query_embs, corpus_embs, top_k=6)
        related = existing if only_missing else {}
        for qi, i in enumerate(missing_idx):
            it = items[i]
            top = []
            for h in hits[qi]:
                j = h["corpus_id"]
                if j == i:
                    continue
                score = float(h["score"]) if isinstance(h["score"], (int, float)) else float(h["score"].item())
                top.append({"url": items[j]["url"], "title": items[j]["title"], "score": round(score, 4)})
                if len(top) == 5:
                    break
            related[it["slug"]] = top

    OUT.write_text(json.dumps(related, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {OUT}")

if __name__ == "__main__":
    main()
