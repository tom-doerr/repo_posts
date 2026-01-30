# Claude Notes - repo_posts

## Project Overview

Jekyll static site showcasing GitHub repos with semantic search.
Live: https://tom-doerr.github.io/repo_posts/

## Key Files

- `tools/generate_related.py` - Generates embeddings and related.json
- `tools/generate_search_index.py` - Builds client-side search index
- `tools/export_embeddings_bin.py` - Exports embeddings for browser semantic search
- `tools/export_3d_coords.py` - UMAP reduction to 3D for visualization
- `docs/assets/js/sem.js` - Browser-based semantic search (WebGPU/ONNX)
- `docs/assets/js/map3d.js` - Three.js 3D semantic map visualization

## Semantic Search Architecture

1. `generate_related.py` creates `docs/_data/embeddings.npz` (float16)
2. `export_embeddings_bin.py` converts to `docs/assets/embeddings.f32` + `.meta.json`
3. `sem.js` loads binary embeddings in browser, uses Xenova/transformers for query embedding
4. Cosine similarity computed client-side via dot product (pre-normalized vectors)

## Workflows

- `generate-related-min.yml` - push to docs/_posts or tools → embeddings, search index
- `pages-min.yml` - push to docs → build and deploy Jekyll
- `rss-smoke.yml` - after pages deploy → validate site health
- `image-compress.yml` - PR to docs/assets → optimize images

## SEO

- `docs/_includes/meta-description.html` - Extracts post description for meta tag
- `docs/_includes/schema-software.html` - SoftwareSourceCode JSON-LD schema
- Both included in `docs/_layouts/default.html`

## UX Features

- Search clear button (X), result count, empty state ("NO DATA" in EVA style)
- Skip link for accessibility, mobile responsive at <640px
- ARIA: `role="listbox"` on results, `role="option"` on items

## Development

Run tests: `python -m pytest tests/ -q`
Generate embeddings locally: `python tools/export_embeddings_bin.py`
Generate 3D coords: `python tools/export_3d_coords.py` (requires umap-learn)
Embedding model: `sentence-transformers/all-MiniLM-L6-v2` (384 dims)
Local server: `cd docs && python -m http.server 4000`
**Gotcha:** Do NOT create `docs/Gemfile` or commit `docs/vendor/` - breaks GitHub Pages

## Design System - MAGI//ARCHIVE (EVA Theme)

**Branding:** "MAGI//ARCHIVE" title, "// SURVEILLANCE FEED" tagline, "NERV // OPEN SOURCE DIVISION" footer
**Fonts:** Orbitron (headings), Roboto Mono (body/data)
**Colors:** `--eva-purple-deep:#1a0a2e`, `--eva-orange:#ff6611`, `--eva-green:#00ff41`, `--eva-red:#ff0040`
**Effects:** Scan lines, hexagon grid bg, glitch text on hover, pulsing status dot
**Cards:** "REC ●" indicator (red), date `YYYY.MM.DD`, entrance animation with rotation
**Accessibility:** All animations respect `prefers-reduced-motion`

## 3D Semantic Map

Interactive visualization at `/map.html` - posts float in 3D space arranged by semantic similarity.
- **Generation:** `tools/export_3d_coords.py` uses UMAP to reduce 384D embeddings → 3D
- **Output:** `docs/assets/embeddings.3d.json` (~855KB, 13K posts)
- **Rendering:** Three.js with InstancedMesh, OrbitControls
- **Interaction:** Hover for tooltip, click opens info box with "VIEW →" link
- **URLs:** All tools generate URLs with `/repo_posts/` prefix for GitHub Pages

