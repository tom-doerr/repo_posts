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
    # Both default layout and header include should build the same href
    for p in (LAYOUT, HEADER_INC):
        html = p.read_text(encoding='utf-8')
        assert "href=\"{{ '/' | relative_url }}#{{ page.date | date: '%Y-%m-%d' }}-{{ page.slug }}\"" in html
