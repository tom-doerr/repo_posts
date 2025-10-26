---
layout: default
title: GitHub Repository Showcase
---

<div align="center">

# GitHub Repository Showcase

[![Website](https://img.shields.io/website?url=https%3A%2F%2Ftom-doerr.github.io%2Frepo_posts%2F&label=site&style=for-the-badge)](https://tom-doerr.github.io/repo_posts/)
[![RSS](https://img.shields.io/badge/RSS-feed-orange?logo=rss&style=for-the-badge)](https://tom-doerr.github.io/repo_posts/feed.xml)
[![License](https://img.shields.io/github/license/tom-doerr/repo_posts?style=for-the-badge)](../LICENSE)

</div>

A curated collection of interesting GitHub repositories, automatically updated with new discoveries.

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
