---
layout: default
title: Status
permalink: /status.html
---

<h2>Site Status</h2>

{% assign s = site.data.status %}
<ul>
  <li>Posts: {{ s.posts }}</li>
  <li>Related entries: {{ s.related_keys }} (non-empty: {{ s.nonempty }}, missing: {{ s.missing }})</li>
  <li>Pages with recommendations (after filter):
    {{ s.related_renderable }} (
    {% if s.posts > 0 %}
      {{ s.related_renderable | times: 100 | divided_by: s.posts }}%
    {% else %}
      0%
    {% endif %}
    )
  </li>
  <li>Embeddings: {{ s.embeddings_count }} vectors, size: {{ s.embeddings_size_bytes | divided_by: 1048576.0 | round: 1 }} MB</li>
  <li>Model: {{ s.embeddings_model }} (dim: {{ s.embeddings_dim }})</li>
  <li>Search index: {{ s.search_index_entries }} entries, size: {{ s.search_index_size_bytes | divided_by: 1048576.0 | round: 1 }} MB</li>
  
</ul>
