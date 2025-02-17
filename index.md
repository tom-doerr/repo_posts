---
layout: default
title: GitHub Repository Showcase
---

# Latest Repositories

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
