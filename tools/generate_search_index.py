#!/usr/bin/env python3
"""
Builds a tiny client-side search index at docs/assets/search-index.json.
Fields per entry:
  t: title + owner/repo (lowercased, for substring search)
  u: post URL (permalink)
  d: yyyy-mm-dd
  title: original title (for rendering)
  img: screenshot image path (optional)
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

def _desc(md: str) -> str:
    # First non-heading, non-empty line after the H1
    m = re.search(r"^#\s+.+$(?:\r?\n)+([^#\n][^\n]+)", md, re.M)
    return (m.group(1).strip() if m else "")[:160]

def _image(md: str) -> str:
    m = re.search(r"(?m)^image:\s*([^\n]+)\s*$", md)
    if not m:
        return ""
    v = m.group(1).strip().strip('"').strip("'")
    if not v:
        return ""
    # Posts store `image: assets/...`; keep the index baseurl-free and prefix baseurl client-side.
    v = v.lstrip('/')
    if v.startswith('assets/'):
        return '/' + v
    return '/' + v

def main() -> None:
    rows = []
    for p in sorted(POSTS.glob('*.md')):
        stem = p.stem
        md = p.read_text(encoding='utf-8', errors='ignore')
        title = _extract(md) or stem
        owner_repo = stem.split('-', 3)[-1]
        desc = _desc(md)
        row = {
            't': (title + ' ' + owner_repo + ' ' + desc).lower(),
            'u': _url(stem),
            'd': '-'.join(stem.split('-', 3)[:3]),
            'title': title,
            's': desc,
        }
        img = _image(md)
        if img:
            row['img'] = img
        rows.append(row)
    OUT.write_text(json.dumps(rows, ensure_ascii=False, separators=(',',':')), encoding='utf-8')
    print(f"Wrote {OUT} with {len(rows)} entries")

if __name__ == '__main__':
    main()
