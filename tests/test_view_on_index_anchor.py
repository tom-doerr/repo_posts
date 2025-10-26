from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = ROOT / 'docs' / '_layouts' / 'default.html'
HEADER_INC = ROOT / 'docs' / '_includes' / 'header.html'
INDEX = ROOT / 'docs' / 'index.md'


def test_index_article_has_stable_anchor_id():
    idx = INDEX.read_text(encoding='utf-8')
    expect = "id=\"{{ post.date | date: '%Y-%m-%d' }}-{{ post.slug }}\""
    assert expect in idx


def test_view_on_index_href_points_to_baseurl_plus_anchor():
    # Accept either date-filter or url-split variants; we use url-split now
    for p in (LAYOUT, HEADER_INC):
        html = p.read_text(encoding='utf-8')
        ok = ("#{{ page.date | date: '%Y-%m-%d' }}-{{ page.slug }}" in html) or ("#{{ y }}-{{ m }}-{{ d }}-{{ page.slug }}" in html)
        assert ok
