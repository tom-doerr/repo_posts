---
layout: default
title: GitHub Repository Showcase
---

# Latest GitHub Repositories

{% assign sorted_posts = site.posts | sort: 'date' | reverse %}
{% for post in sorted_posts %}

## [{{ post.title }}]({{ post.url | relative_url }})

Posted on: {{ post.date | date: "%Y-%m-%d" }}

{% if post.image %}
![{{ post.title }}]({{ post.image | relative_url }})
{% endif %}

{{ post.content }}

---
{% endfor %}
