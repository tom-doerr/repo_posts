#!/usr/bin/env python3
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POSTS = ROOT / 'docs' / '_posts'
ASSETS = ROOT / 'docs'
OUT = ROOT / 'docs' / '_data' / 'image_dims.json'

img_map = {}
pat = re.compile(r'^image:\s*(.+)$', re.MULTILINE)

def find_image(md: str) -> str | None:
    m = pat.search(md)
    if not m:
        return None
    val = m.group(1).strip()
    # strip quotes if present
    if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
        val = val[1:-1]
    return val

def main():
    try:
        from PIL import Image
    except Exception as e:
        print("Pillow not installed:", e, file=sys.stderr)
        sys.exit(1)
    for md_path in sorted(POSTS.glob('*.md')):
        s = md_path.read_text(encoding='utf-8', errors='ignore')
        img_rel = find_image(s)
        if not img_rel:
            continue
        p = (ASSETS / img_rel).resolve()
        if not p.exists():
            continue
        try:
            with Image.open(p) as im:
                w, h = im.size
        except Exception:
            continue
        img_map[img_rel] = {"width": int(w), "height": int(h)}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(img_map, ensure_ascii=False, separators=(',',':')), encoding='utf-8')

if __name__ == '__main__':
    main()

