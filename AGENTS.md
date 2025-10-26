# Agents Notes — repo_posts (Oct 26, 2025)

- Minimal fix: prefix `site.baseurl` to search result links in `docs/_layouts/default.html` and Enter key navigation.
- Tests added: `tests/test_search_links_baseurl.py` to lock the behavior (anchor href + Enter navigation).
- CI/Deploy: Actions running; RSS smoke check passed; Pages deploy currently in progress and typically turns green within a minute after build.

Keep in mind
- Search JSON (`tools/generate_search_index.py`) keeps `u` as path like `/YYYY/MM/DD/slug.html`; client JS must always prefix `{{ site.baseurl }}`.
- Contribution policy lives in `README.md` only (not shown on the site header).

Oct 26, 2025 — Autoposter/Git Push
- Symptom: “new posts not appearing”. Root cause was non–fast‑forward push failures in the local publish step; pushes failed so Pages didn’t deploy.
- Fix: GitHubPublisher now fetches + pull --rebase and pushes with `--force-with-lease` before publishing.
- Behavior: autoposter continues even if GitHub push fails; it now logs an error and proceeds.

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
- Homepage shows only the original repo slug/title inside the post content; removed the extra homepage title link above.
- Tests updated: `tests/test_title_link_to_post.py` now asserts absence of the extra title and of the hide rule.

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
Layout tweak — Oct 26, 2025
- Removed the `@owner` chip above post images to avoid implying a Twitter handle.
- Test `tests/test_remove_owner_chip.py` ensures the chip markup stays removed.

EU‑Compliant Analytics — Oct 26, 2025
- Options (privacy‑first, cookie‑less):
  1) Plausible Cloud (EU isolation) with custom‑domain proxy; or self‑host in EU.
  2) Umami self‑host on an EU VPS; serve script from our subdomain.
  3) Matomo self‑host (EU) with IP anonymization + cookieless mode.
  4) Pirsch/Simple Analytics (EU vendors, cookie‑less) — SaaS.
  5) Cloudflare Web Analytics (cookie‑less, but US vendor) — least strict option.
- Recommended: Plausible Cloud (EU isolation) via custom‑domain proxy; fallback: Umami self‑host EU.
- Minimal implementation plan:
  - Add a `docs/_includes/analytics.html` with the vendor snippet.
  - Include it site‑wide via `docs/_layouts/default.html` (done Oct 26, 2025).
  - Update privacy note to state no cookies, IP anonymized.

Analytics changes — Oct 26, 2025
- Switched from index‑only include to layout include so posts are tracked.
- Added noscript pixel to `_includes/analytics.html`.
- Tests added: `tests/test_analytics_include.py` ensures layout includes analytics, index does not duplicate it, and noscript pixel exists.
- Duplication guard: `tests/test_analytics_no_duplicate.py` asserts the layout includes the analytics include exactly once and that the SA script/pixel only appear in the include.

"View on index" position — Oct 26, 2025
- Issue: anchor jump could land slightly off because homepage images load after the hash navigation, shifting content.
- Minimal fix: in `docs/_layouts/default.html` add a tiny script that, on `window.load`, re-applies the hash and calls `scrollIntoView()` for the target id. No smooth scroll, no dependencies.
- Tests added:
  - `tests/test_view_on_index_anchor.py` ensures href uses `{{ '/' | relative_url }}#{{ page.date | date: '%Y-%m-%d' }}-{{ page.slug }}` and index ids match `{{ post.date }}-{{ post.slug }}`.
  - `tests/test_view_on_index_position_js.py` asserts the presence of `location.hash` + `scrollIntoView` code.

RSS repo link — Oct 26, 2025
- Added a custom `docs/feed.xml` that keeps Atom output but also emits a direct repository link per entry as `<link rel="related" href="…" />`.
- Implementation: convert `post.content` to HTML via `markdownify`, split on `href="` to grab the first link (the H1 repo link), and include it as the related link.
- Test: `tests/test_feed_repo_link.py` checks the template contains `rel="related"` and the split logic strings.
