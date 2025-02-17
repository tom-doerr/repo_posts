---
layout: default
title: GitHub Repository Showcase
---

# GitHub Repository Showcase

A curated collection of interesting GitHub repositories, automatically updated with new discoveries.

## Latest Repositories

{% for post in site.posts %}
<article class="post">
  <h2><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h2>
  <p class="post-meta">{{ post.date | date: "%Y-%m-%d" }}</p>
  {{ post.content }}
  {% if post.image %}
  <img src="{{ post.image | relative_url }}" alt="{{ post.title }} screenshot">
  {% endif %}
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
