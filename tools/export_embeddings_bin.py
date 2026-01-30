#!/usr/bin/env python3
import json
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NPZ = ROOT / 'docs' / '_data' / 'embeddings.npz'
OUT_BIN = ROOT / 'docs' / 'assets' / 'embeddings.f32'
OUT_META = ROOT / 'docs' / 'assets' / 'embeddings.meta.json'

def dated_slug_to_url(s: str) -> str:
    y, m, d = s[:4], s[5:7], s[8:10]
    slug = s[11:]
    return f"/repo_posts/{y}/{m}/{d}/{slug}.html"

def main():
    z = np.load(str(NPZ))
    E = z['E'].astype(np.float32)
    slugs = [s if isinstance(s, str) else s.decode('utf-8') for s in z['slugs']]
    # L2 normalize rows for cosine dot-products
    norms = np.linalg.norm(E, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    E = E / norms
    OUT_BIN.parent.mkdir(parents=True, exist_ok=True)
    E.tofile(OUT_BIN)
    urls = [dated_slug_to_url(s) for s in slugs]
    meta = {"dim": int(E.shape[1]), "count": int(E.shape[0]), "urls": urls}
    OUT_META.write_text(json.dumps(meta, ensure_ascii=False, separators=(',',':')), encoding='utf-8')

if __name__ == '__main__':
    main()

