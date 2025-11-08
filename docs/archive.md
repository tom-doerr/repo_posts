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
    {%- comment -%} Inline snippet extraction for tests {%- endcomment -%}
    {%- assign _html = post.content | markdownify -%}
    {%- assign _after_h1 = _html | split: '</h1>' | last -%}
    {%- assign _first_p = _after_h1 | split: '</p>' | first -%}
    {% capture _snippet %}{{ _first_p | strip_html | strip }}{% endcapture %}
    <a href="{{ post.url | relative_url }}">{{ _snippet }}</a>
  </li>
{% endfor %}
</ul>
