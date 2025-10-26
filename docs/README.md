---
layout: default
title: GitHub Repository Showcase
---

# GitHub Repository Showcase

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
