from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / 'docs' / 'assets' / 'css' / 'site.css'
LAYOUT = ROOT / 'docs' / '_layouts' / 'default.html'
INDEX = ROOT / 'docs' / 'index.md'
SEARCH_JS = ROOT / 'docs' / 'assets' / 'js' / 'search.js'


def test_scroll_margin_top_present():
    css = CSS.read_text(encoding='utf-8')
    assert '.post { scroll-margin-top:' in css


def test_related_block_liquid_present():
    html = LAYOUT.read_text(encoding='utf-8')
    assert 'site.data.related' in html
    assert 'Related repos' in html


def test_home_card_image_links_to_post_page():
    idx = INDEX.read_text(encoding='utf-8')
    assert 'class="post-image-link"' in idx
    assert 'href="{{ post.url | relative_url }}"' in idx


def test_search_js_keys_and_highlight_logic_present():
    js = SEARCH_JS.read_text(encoding='utf-8')
    for k in ("'j'","'k'","'Enter'","'Escape'"):
        assert k in js
    assert 'replace(/[.*+?^${}()|[' in js or 'replace(/[.*+?^${}()|[\\]\\\\]/g' in js


def test_rss_link_styled_in_css_not_inline():
    html = LAYOUT.read_text(encoding='utf-8')
    css = CSS.read_text(encoding='utf-8')
    assert '.rss-link{' in css
    assert '.rss-link' not in html or '<style>' not in html
