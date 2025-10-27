from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = ROOT / 'docs' / '_layouts' / 'default.html'
INC = ROOT / 'docs' / '_includes' / 'related_item.html'


def test_layout_has_feed_meta_and_rss_link_relative():
    html = LAYOUT.read_text(encoding='utf-8')
    assert '{% feed_meta %}' in html
    assert 'href="{{ \'/feed.xml\' | relative_url }}"' in html


def test_related_uses_relative_url():
    # Accept in include
    html = (LAYOUT.read_text(encoding='utf-8') + INC.read_text(encoding='utf-8'))
    assert "item.url | relative_url" in html
