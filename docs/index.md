---
layout: default
title: Repository Showcase
---

{% include analytics.html %}
<p><a href="{{ '/feed.xml' | relative_url }}">RSS</a></p>
{% for post in site.posts %}
<article class="post" id="{{ post.date | date: '%Y-%m-%d' }}-{{ post.slug }}">
  <p class="post-meta">{{ post.date | date: "%Y-%m-%d" }}</p>
  {{ post.content }}
  {% if post.image %}
  <img src="{{ post.image | relative_url }}" alt="{{ post.title }} screenshot" loading="lazy">
  {% endif %}
  <hr>
</article>
{% endfor %}
