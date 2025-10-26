from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = ROOT / 'docs' / '_layouts' / 'default.html'


def test_search_links_prefix_baseurl_in_anchor():
    html = LAYOUT.read_text(encoding='utf-8')
    assert "site.baseurl" in html
    assert 'href="${BASE}${e.u}"' in html


def test_search_enter_uses_baseurl_prefix():
    html = LAYOUT.read_text(encoding='utf-8')
    assert 'window.location = BASE + current[active].u' in html

