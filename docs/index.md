---
layout: default
title: Repository Showcase
---

{% include analytics.html %}
<blockquote>
  We don't accept repository suggestions via Issues/PRs. The site is curated automatically. Please use issues only for site bugs and improvements.
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
