---
layout: home
title: GitHub Repository Showcase
---

Welcome to our curated collection of interesting GitHub repositories. Each post 
features a repository that caught our attention, with a brief description and 
visual preview.

## Latest Posts

{% for post in site.posts %}
* [{{ post.title }}]({{ post.url | relative_url }}) - {{ post.date | date: "%Y-%m-%d" }}
{% endfor %}
