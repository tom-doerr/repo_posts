#!/usr/bin/env python3
"""Export 3D coordinates for semantic map visualization using UMAP."""
import json
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NPZ = ROOT / 'docs' / '_data' / 'embeddings.npz'
OUT = ROOT / 'docs' / 'assets' / 'embeddings.3d.json'

def slug_to_url(s):
    return f"/repo_posts/{s[:4]}/{s[5:7]}/{s[8:10]}/{s[11:]}.html"

def repo_from_slug(s):
    return s.split('-', 3)[3] if '-' in s else s

def main():
    import umap
    z = np.load(str(NPZ))
    E_all, slugs_all = z['E'].astype(np.float32), [s if isinstance(s,str) else s.decode() for s in z['slugs']]
    latest = {}
    for i,s in enumerate(slugs_all):
        r = repo_from_slug(s)
        if r not in latest or s > latest[r][0]: latest[r] = (s,i)
    keep = sorted([i for _,i in latest.values()])
    slugs, E = [slugs_all[i] for i in keep], E_all[keep]
    print(f"Loaded {len(slugs_all)}, deduplicated to {len(slugs)} repos")
    reducer = umap.UMAP(n_components=3, n_neighbors=15, min_dist=0.1, metric='cosine', random_state=42)
    coords = reducer.fit_transform(E)
    # Normalize to [-1, 1]
    coords = 2 * (coords - coords.min(0)) / (coords.max(0) - coords.min(0) + 1e-8) - 1
    data = {"coords": [[round(float(c), 4) for c in r] for r in coords], "urls": [slug_to_url(s) for s in slugs]}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(',', ':')))
    print(f"Saved to {OUT} ({OUT.stat().st_size // 1024} KB)")

if __name__ == '__main__':
    main()
