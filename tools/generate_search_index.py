#!/usr/bin/env python3
"""
Builds a tiny client-side search index at docs/assets/search-index.json.
Fields per entry:
  t: title + owner/repo (lowercased, for substring search)
  u: post URL (permalink)
  d: yyyy-mm-dd
"""
from __future__ import annotations
from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[1]
POSTS = ROOT / "docs" / "_posts"
OUT = ROOT / "docs" / "assets" / "search-index.json"

def _url(stem: str) -> str:
    y,m,d,rest = stem.split('-', 3)
    return f"/{y}/{m}/{d}/{rest}.html"

def _extract(md: str) -> str:
    m = re.search(r"^#\s+(.+)$", md, re.M)
    return m.group(1).strip() if m else ""

def main() -> None:
    rows = []
    for p in sorted(POSTS.glob('*.md')):
        stem = p.stem
        title = _extract(p.read_text(encoding='utf-8', errors='ignore')) or stem
        owner_repo = stem.split('-', 3)[-1]
        rows.append({
            't': (title + ' ' + owner_repo).lower(),
            'u': _url(stem),
            'd': '-'.join(stem.split('-', 3)[:3]),
        })
    OUT.write_text(json.dumps(rows, ensure_ascii=False, separators=(',',':')), encoding='utf-8')
    print(f"Wrote {OUT} with {len(rows)} entries")

if __name__ == '__main__':
    main()

