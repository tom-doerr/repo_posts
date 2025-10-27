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
    <a href="{{ post.url | relative_url }}">{{ post.title | default: post.slug }}</a>
  </li>
{% endfor %}
</ul>

