from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = ROOT / 'docs' / '_layouts' / 'default.html'
SEARCH_JS = ROOT / 'docs' / 'assets' / 'js' / 'search.js'


def test_layout_references_search_js():
    html = LAYOUT.read_text(encoding='utf-8')
    assert "/assets/js/search.js" in html


def test_search_links_prefix_baseurl_in_anchor():
    js = SEARCH_JS.read_text(encoding='utf-8')
    assert "site.baseurl" in js
    assert 'href="${BASE}${e.u}"' in js


def test_search_enter_uses_baseurl_prefix():
    js = SEARCH_JS.read_text(encoding='utf-8')
    assert 'window.location = BASE + current[active].u' in js
