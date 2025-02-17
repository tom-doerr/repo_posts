---
layout: home
title: GitHub Repository Showcase
---

Welcome to our curated collection of interesting GitHub repositories. Each post 
features a repository that caught our attention, with a brief description and 
visual preview.

## Latest Posts

<ul class="post-list">
  {% for post in site.posts %}
    <li>
      <h2>
        <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
      </h2>
      <span class="post-meta">{{ post.date | date: "%B %-d, %Y" }}</span>
      {% if post.excerpt %}
        <p>{{ post.excerpt }}</p>
      {% endif %}
    </li>
  {% endfor %}
</ul>
