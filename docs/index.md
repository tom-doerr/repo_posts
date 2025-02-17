---
layout: default
title: Repository Showcase
---


## Latest Posts

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
