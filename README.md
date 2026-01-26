<div align="center">

# GitHub Repository Showcase

[![Website](https://img.shields.io/website?url=https%3A%2F%2Ftom-doerr.github.io%2Frepo_posts%2F&label=site&style=for-the-badge)](https://tom-doerr.github.io/repo_posts/)
[![RSS](https://img.shields.io/badge/RSS-feed-orange?logo=rss&style=for-the-badge)](https://tom-doerr.github.io/repo_posts/feed.xml)
[![Status](https://img.shields.io/badge/Status-page-blue?style=for-the-badge)](https://tom-doerr.github.io/repo_posts/status.html)
[![RSS Smoke](https://img.shields.io/github/actions/workflow/status/tom-doerr/repo_posts/rss-smoke.yml?branch=main&label=RSS%20smoke&style=for-the-badge)](https://github.com/tom-doerr/repo_posts/actions/workflows/rss-smoke.yml)
[![Related Data](https://img.shields.io/github/actions/workflow/status/tom-doerr/repo_posts/generate-related-min.yml?branch=main&label=Related%20data&style=for-the-badge)](https://github.com/tom-doerr/repo_posts/actions/workflows/generate-related-min.yml)
[![Pages](https://img.shields.io/github/deployments/tom-doerr/repo_posts/github-pages?label=Pages&style=for-the-badge)](https://github.com/tom-doerr/repo_posts/deployments/activity_log?environment=github-pages)
[![Feed 200](https://img.shields.io/website?url=https%3A%2F%2Ftom-doerr.github.io%2Frepo_posts%2Ffeed.xml&label=feed%20200&style=for-the-badge)](https://tom-doerr.github.io/repo_posts/feed.xml)
[![License](https://img.shields.io/github/license/tom-doerr/repo_posts?style=for-the-badge)](LICENSE)

</div>

Live site: https://tom-doerr.github.io/repo_posts/

- Feed (Atom): https://tom-doerr.github.io/repo_posts/feed.xml
- Status: Built via GitHub Pages (workflow in `.github/workflows/Deploy Jekyll site`).

## How things update
- On push to `main` that changes `docs/_posts/**`: the “Generate Related Data” workflow runs a quick owner-based related pass and rebuilds `docs/assets/search-index.json`.
- Every 30 minutes (schedule): the same workflow loads/stores embeddings (`docs/_data/embeddings.npz`), computes only missing neighbors, updates `docs/_data/related.json`, and writes `docs/_data/status.json`.
- After each run: the README coverage line between the markers below is updated, and the live Status page (`/status.html`) shows current counts and sizes.

## What this repo is
A Jekyll site stored under `docs/` using the Minimal theme. Posts live in `docs/_posts/` and screenshots in `docs/assets/`.

- Layout override: `docs/_layouts/default.html` (adds per‑post image and a link back to the index; auto dark mode).
- Homepage: `docs/index.md` (lists posts, adds anchors, lazy images, and an RSS link).
- Issue template: `.github/ISSUE_TEMPLATE/bug_report.yml`.

## Contribution policy
We don't accept repository suggestions via Issues/PRs. The site is curated automatically. Please use issues only for site bugs and improvements.

## Deploy
- Trigger: push to `main` builds `docs/` and deploys to Pages.
- Workflow: `.github/workflows/Deploy Jekyll site` (standard Pages Jekyll build).
- Optional CI: image compression runs on PRs that touch `docs/assets/**`.

## Structure
```
repo_posts/
  docs/
    _posts/      # content
    assets/      # images
    _layouts/    # layout override
    index.md     # homepage
  .github/
    ISSUE_TEMPLATE/
    workflows/
```

## License
MIT for code/config — see LICENSE.

Content licensing — see CONTENT-LICENSE.md. Screenshots in `docs/assets/` and third‑party text in `docs/_posts/` remain the property of their respective owners; no license is granted for those assets.

For current coverage stats, see the [Status page](https://tom-doerr.github.io/repo_posts/status.html).

## Liquid numeric gotcha (percentages)
Liquid math is integer by default. If you compute a percentage like:

```
{{ s.related_renderable | times: 100 | divided_by: s.posts }}%
```

it truncates to an integer. To get a decimal percentage, make one operand a float:

```
{{ s.related_renderable | times: 100.0 | divided_by: s.posts | round: 1 }}%
```

or:

```
{{ s.related_renderable | times: 1.0 | divided_by: s.posts | times: 100 | round: 1 }}%
```
