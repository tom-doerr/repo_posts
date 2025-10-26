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

We don’t accept repository recommendations or content additions via pull requests or issues. The site is curated and generated automatically from our pipeline. Please open issues only for site bugs (broken links, rendering problems) or infrastructure problems.

If you want to suggest policy or infrastructure changes, open a focused issue with a clear description.
