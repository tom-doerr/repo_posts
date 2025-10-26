---
layout: default
title: Repository Showcase
---

{% include analytics.html %}
{% for post in site.posts %}
<article class="post" id="{{ post.date | date: '%Y-%m-%d' }}-{{ post.slug }}">
  <p class="post-meta">{{ post.date | date: "%Y-%m-%d" }}</p>
  <h2 class="post-title"><a href="{{ post.url | relative_url }}">{{ post.title | default: post.slug }}</a></h2>
  {{ post.content }}
  {% if post.image %}
  <a class="post-image-link" href="{{ post.url | relative_url }}">
    <img src="{{ post.image | relative_url }}" alt="{{ post.title }} screenshot" loading="lazy">
  </a>
  {% endif %}
  <hr>
</article>
{% endfor %}
