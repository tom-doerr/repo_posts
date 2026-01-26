# Claude Notes - repo_posts

## Project Overview

Jekyll static site showcasing GitHub repos with semantic search.
Live: https://tom-doerr.github.io/repo_posts/

## Key Files

- `tools/generate_related.py` - Generates embeddings and related.json
- `tools/generate_search_index.py` - Builds client-side search index
- `tools/export_embeddings_bin.py` - Exports embeddings for browser semantic search
- `docs/assets/js/sem.js` - Browser-based semantic search (WebGPU/ONNX)

## Semantic Search Architecture

1. `generate_related.py` creates `docs/_data/embeddings.npz` (float16)
2. `export_embeddings_bin.py` converts to `docs/assets/embeddings.f32` + `.meta.json`
3. `sem.js` loads binary embeddings in browser, uses Xenova/transformers for query embedding
4. Cosine similarity computed client-side via dot product (pre-normalized vectors)

## Issues Found (2026-01-02)

### Semantic search was broken
- Root cause: `generate-related-min.yml` ran `export_embeddings_bin.py` but didn't commit output
- Fix: Added `docs/assets/embeddings.*` to workflow's `file_pattern`
- Files needed: `embeddings.f32` (~10MB) and `embeddings.meta.json` (~264KB)

### Tests referenced old workflow files
- Tests pointed to `jekyll.yml`, `generate-related.yml`, `assets-report.yml`
- Actual files: `pages-min.yml`, `generate-related-min.yml`, `image-compress.yml`

## Workflows

- `generate-related-min.yml` - push to docs/_posts or tools → embeddings, search index
- `pages-min.yml` - push to docs → build and deploy Jekyll
- `rss-smoke.yml` - after pages deploy → validate site health
- `image-compress.yml` - PR to docs/assets → optimize images

## SEO

- `docs/_includes/meta-description.html` - Extracts post description for meta tag
- `docs/_includes/schema-software.html` - SoftwareSourceCode JSON-LD schema
- Both included in `docs/_layouts/default.html`

## Development

Run tests: `python -m pytest tests/ -q`
Generate embeddings locally: `python tools/export_embeddings_bin.py`
Embedding model: `sentence-transformers/all-MiniLM-L6-v2` (384 dims)
