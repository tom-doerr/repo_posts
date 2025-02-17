---
layout: default
title: GitHub Repository Showcase
---

# Latest GitHub Repositories

{% for post in site.posts %}
## [{{ post.title }}]({{ post.url | relative_url }})

{{ post.date | date: "%Y-%m-%d" }}

{% if post.image %}
![Preview]({{ post.image | relative_url }})
{% endif %}

{{ post.content }}

---
{% endfor %}
