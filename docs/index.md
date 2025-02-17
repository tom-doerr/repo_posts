---
layout: default
title: Repository Showcase
---

# Repository Showcase

Welcome to our curated collection of interesting GitHub repositories.

## Latest Posts

{% for post in site.posts %}
* {{ post.date | date: "%Y-%m-%d" }} - [{{ post.title }}]({{ post.url | relative_url }})
{% endfor %}
---
layout: default
title: Repository Showcase
---

# Repository Showcase

Welcome to our curated collection of interesting GitHub repositories.

## Latest Posts

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
