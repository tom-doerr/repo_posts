---
layout: default
---

{% for post in site.posts %}
## [{{ post.title }}]({{ post.url | relative_url }})
{{ post.content }}
{% if post.image %}![Screenshot]({{ post.image | relative_url }}){% endif %}
{% endfor %}
