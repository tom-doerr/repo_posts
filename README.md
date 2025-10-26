# GitHub Repository Showcase

Live site: https://tom-doerr.github.io/repo_posts/

- Feed (Atom): https://tom-doerr.github.io/repo_posts/feed.xml
- Status: Built via GitHub Pages (workflow in `.github/workflows/Deploy Jekyll site`).

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
MIT — see LICENSE.
