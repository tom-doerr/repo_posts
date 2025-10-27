from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = ROOT / 'docs' / '_layouts' / 'default.html'


def test_layout_post_header_uses_first_github_link():
    html = LAYOUT.read_text(encoding='utf-8')
    # Computes first link from markdownified content
    assert "page.collection == 'posts'" in html
    assert "_href_parts = _html | split: 'href=\"'" in html
    assert "_first_link = _href_parts[1] | split: '\"' | first" in html
    # Uses the computed link when it contains github.com
    assert "_first_link contains 'github.com'" in html
    assert '<a href="{{ _first_link }}">View the Project on GitHub' in html

