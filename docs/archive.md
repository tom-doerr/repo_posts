---
layout: default
title: Archive
permalink: /archive.html
---

<h2>All Posts</h2>
<ul class="archive-list">
{% for post in site.posts %}
  <li>
    <span class="post-date">{{ post.date | date: "%Y-%m-%d" }}</span>
    {% capture _snippet %}{% include post_snippet.html post=post %}{% endcapture %}
    <a href="{{ post.url | relative_url }}">{{ _snippet }}</a>
  </li>
{% endfor %}
</ul>
