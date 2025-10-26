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
import json, re
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

def main() -> None:
    files = sorted(POSTS.glob("*.md"))
    items = []
    for p in files:
        title, desc = _extract(p)
        items.append({
            "slug": _slug(p),
            "url": _url(p),
            "title": title,
            "text": (title + "\n\n" + desc)[:2000],
        })

    model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    embs = model.encode([it["text"] for it in items], convert_to_tensor=True, normalize_embeddings=True)
    hits = util.semantic_search(embs, embs, top_k=6)  # include self as best hit

    related: dict[str,list[dict]] = {}
    for i, it in enumerate(items):
        top = []
        for h in hits[i]:
            j = h["corpus_id"]
            if j == i:
                continue  # skip self
            score = float(h["score"]) if isinstance(h["score"], (int, float)) else float(h["score"].item())
            top.append({"url": items[j]["url"], "title": items[j]["title"], "score": round(score, 4)})
            if len(top) == 5:
                break
        related[it["slug"]] = top

    OUT.write_text(json.dumps(related, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {OUT}")

if __name__ == "__main__":
    main()
