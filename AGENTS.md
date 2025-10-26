# Agents Notes — repo_posts (Oct 26, 2025)

- Minimal fix: prefix `site.baseurl` to search result links in `docs/_layouts/default.html` and Enter key navigation.
- Tests added: `tests/test_search_links_baseurl.py` to lock the behavior (anchor href + Enter navigation).
- CI/Deploy: Actions running; RSS smoke check passed; Pages deploy currently in progress and typically turns green within a minute after build.

Keep in mind
- Search JSON (`tools/generate_search_index.py`) keeps `u` as path like `/YYYY/MM/DD/slug.html`; client JS must always prefix `{{ site.baseurl }}`.
- Contribution policy lives in `README.md` only (not shown on the site header).

Next small items (safe to batch later)
- Optional: add `/` shortcut to focus the search input.
- Optional: render result title instead of slug (would require adding `title` to the index).

Added tests — Oct 26, 2025
- `tests/test_layout_basic.py`: blocks two-column grid; ensures per-post image and index link.
- `tests/test_layout_more.py`: scroll-margin rule, related block present, home image links to post, key handlers in search JS.
- `tests/test_search_links_baseurl.py`: search links prefixed with baseurl and Enter uses same.

CI — Oct 26, 2025
- Extended `rss-smoke.yml` to also curl a sample post, assert image + "View on index" are present, and verify `assets/search-index.json` and `assets/css/site.css` are reachable after a successful Pages deploy.

UX — Oct 26, 2025
- Added subtle page fade-in (0.15s) with reduced-motion guard.
- Homepage title now links to per-post page (`<h2 class="post-title"><a href="{{ post.url | relative_url }}">…</a></h2>`), and we hide the first inner H1 on the homepage only (`.home-page .post h1:first-child { display: none; }`) to avoid duplicate titles.
- Tests added: `tests/test_page_transition_css.py`, `tests/test_title_link_to_post.py`.

Maintainability — Oct 26, 2025
- Extracted inline search script into `docs/assets/js/search.js` (with Liquid front matter) and moved the inline RSS badge styles into `site.css`.
- Updated tests to read from `search.js` and assert layout references it.

Next Steps — Oct 26, 2025
1) Add "/" shortcut to focus search input (tiny JS + 1 test). [Recommended]
2) Render titles in search results (extend `generate_search_index.py` with `title`, adjust `search.js`; add 1–2 tests).
3) Add workflow `concurrency` to Deploy to avoid occasional "in progress" Pages conflicts.
4) Limit homepage to recent N posts and add a simple Archive page to cut initial load (keep all posts online).
5) Optional: add max content width (e.g., 900px) for readability; add 1 CSS test.
Overlap fix — Oct 26, 2025
- Removed `.wrapper { display:flex; ... }` and related `section/footer` flex rules in `site.css` to restore theme layout and prevent wide-screen overlap with the left header.
- Tests: `tests/test_layout_no_flex_wrapper.py` ensures we don't reintroduce a flex wrapper; relaxed `test_layout_basic.py` to not require a `section { ... }` rule in custom CSS.
