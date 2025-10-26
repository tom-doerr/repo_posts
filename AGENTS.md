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

