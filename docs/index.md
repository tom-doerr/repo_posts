---
layout: default
title: Repository Showcase
---

{% include analytics.html %}
<blockquote>
  <strong>Contributions:</strong> We don’t accept repository recommendations or content additions via PRs/issues. The site is curated and generated automatically.
</blockquote>
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
