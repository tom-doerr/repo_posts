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

Proposed Continuation — Oct 26, 2025 (later)
1) Search results show titles
   - Change: emit `title` in `tools/generate_search_index.py`; render titles in `assets/js/search.js`.
   - Tests: assert `title` appears and is highlighted.
2) Max content width for readability
   - Change: `section{max-width:900px;margin:0 auto}` in `site.css`.
   - Tests: check rule presence; ensure no grid/fixed introduced.
3) Homepage limit + Archive page
   - Change: `index.md` shows last 100; new `archive.md` lists all (same markup); keep all posts online for SEO.
   - Tests: assert Liquid `limit:` exists; archive includes anchors.
4) Feed smoke: at least one <entry>
   - Change: add curl/grep to `rss-smoke.yml`.
   - Tests: optional unit asserting workflow text contains the grep.
5) Tiny perceived-speed bump
   - Change: add `<link rel="prefetch" href="{{ '/assets/search-index.json' | relative_url }}">` on home only.
   - Tests: assert tag present in layout.
Overlap fix — Oct 26, 2025
- Removed `.wrapper { display:flex; ... }` and related `section/footer` flex rules in `site.css` to restore theme layout and prevent wide-screen overlap with the left header.
- Tests: `tests/test_layout_no_flex_wrapper.py` ensures we don't reintroduce a flex wrapper; relaxed `test_layout_basic.py` to not require a `section { ... }` rule in custom CSS.
CI concurrency — Oct 26, 2025
- Added workflow `concurrency` to Deploy Jekyll site:
  ```yaml
  concurrency:
    group: pages-${{ github.ref }}
    cancel-in-progress: true
  ```
- Effect: ensures only one Pages deploy per branch runs at a time. If you push again while the previous deploy is still in progress, the older run gets auto-cancelled and the latest build deploys. This avoids the “deployment request failed due to in progress deployment” error we saw earlier.
- Test: `tests/test_ci_concurrency.py` asserts the guard is present.
Search UX — Oct 26, 2025
- Added "/" shortcut: pressing slash focuses the search input unless typing in an input/textarea or holding Ctrl/Meta/Alt. Test: `tests/test_search_slash_focus.py`.

Search tests — Oct 26, 2025
- `tests/test_search_ui_present.py`: input, panel, placeholder, and scripts loaded.
- `tests/test_search_js_behavior_strings.py`: fetch path, fuzzysort usage, 20-result render, highlight usage, BASE concatenation.
- `tests/test_search_index_file.py`: asserts index file exists and is a JSON array.
- `tests/test_search_index_schema.py`: sample validates `t,u,d,title` keys and URL/date format.
- `tests/test_search_js_front_matter.py`: ensures `search.js` gets Liquid front matter for baseurl injection.
- `tests/test_layout_rss_and_related.py`: checks `{% feed_meta %}`, RSS relative_url, and related links use `relative_url`.
Search titles — Oct 26, 2025
- `tools/generate_search_index.py` now emits a `title` field; `assets/js/search.js` renders titles and uses the same highlight logic.
- Tests updated to assert title rendering. Index regenerated and committed.

Search ranking — Oct 26, 2025
- Replaced char-level fuzzysort call with a minimal token-AND substring scorer for more intuitive matching: split query on whitespace (len>1 tokens), require all tokens to appear in `t`, and rank by earliest positions.
- Keeps highlight logic; retains 20 results render. Tests updated accordingly.
CI trigger scope — Oct 26, 2025
- Limited deploy triggers to site-related paths only to avoid churn on test-only commits:
  - `docs/**`, `docs/_data/**`, workflows file, and the two tools scripts.
  - Added `workflow_dispatch:` for manual deploys.
- Test: `tests/test_ci_paths_filter.py` asserts paths filter and manual dispatch.
