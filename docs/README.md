---
layout: default
title: GitHub Repository Showcase
---

<div align="center">

# GitHub Repository Showcase

[![Website](https://img.shields.io/website?url=https%3A%2F%2Ftom-doerr.github.io%2Frepo_posts%2F&label=site&style=for-the-badge)](https://tom-doerr.github.io/repo_posts/)
[![RSS](https://img.shields.io/badge/RSS-feed-orange?logo=rss&style=for-the-badge)](https://tom-doerr.github.io/repo_posts/feed.xml)
[![Status](https://img.shields.io/badge/Status-page-blue?style=for-the-badge)](https://tom-doerr.github.io/repo_posts/status.html)
[![RSS Smoke](https://img.shields.io/github/actions/workflow/status/tom-doerr/repo_posts/rss-smoke.yml?branch=main&label=RSS%20smoke&style=for-the-badge)](https://github.com/tom-doerr/repo_posts/actions/workflows/rss-smoke.yml)
[![Related Data](https://img.shields.io/github/actions/workflow/status/tom-doerr/repo_posts/generate-related-min.yml?branch=main&label=Related%20data&style=for-the-badge)](https://github.com/tom-doerr/repo_posts/actions/workflows/generate-related-min.yml)
[![Deploy](https://img.shields.io/github/actions/workflow/status/tom-doerr/repo_posts/jekyll.yml?branch=main&label=Deploy&style=for-the-badge)](https://github.com/tom-doerr/repo_posts/actions/workflows/jekyll.yml)
[![Feed 200](https://img.shields.io/website?url=https%3A%2F%2Ftom-doerr.github.io%2Frepo_posts%2Ffeed.xml&label=feed%20200&style=for-the-badge)](https://tom-doerr.github.io/repo_posts/feed.xml)
[![License](https://img.shields.io/github/license/tom-doerr/repo_posts?style=for-the-badge)](../LICENSE)

</div>

A curated collection of interesting GitHub repositories, automatically updated with new discoveries.

## Licensing
- Code and configuration in this repository are MIT licensed (see [LICENSE](../LICENSE)).
- Site content (screenshots in `docs/assets/`, third‑party text snippets in `docs/_posts/`) is not covered by MIT and remains the property of the respective owners. See [CONTENT-LICENSE](../CONTENT-LICENSE.md).

## Latest Repositories

{% for post in site.posts %}
<article class="post">
  <p class="post-meta">{{ post.date | date: "%Y-%m-%d" }}</p>
  {{ post.content }}
  {% if post.image %}
  <img src="{{ post.image | relative_url }}" alt="{{ post.title }} screenshot">
  {% endif %}
  <h4><a href="{{ post.url | relative_url }}"></a></h4>
  <hr>
</article>
{% endfor %}

## About

This site showcases interesting GitHub repositories that catch our attention. Each post includes:
- Repository name and link
- Brief description
- Visual preview
- Direct link to the repository

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contribution Guidelines

We don't accept repository suggestions via Issues/PRs. The site is curated automatically. Please use issues only for site bugs and improvements.

If you want to propose a site/infrastructure change, open a focused issue with a clear description.

<!-- CI trigger: touch README to run generate-related and smoke tests -->
