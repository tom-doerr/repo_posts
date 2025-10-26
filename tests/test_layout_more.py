from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / 'docs' / 'assets' / 'css' / 'site.css'
LAYOUT = ROOT / 'docs' / '_layouts' / 'default.html'
INDEX = ROOT / 'docs' / 'index.md'


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
    html = LAYOUT.read_text(encoding='utf-8')
    # Vim keys + Enter/Escape navigation exists
    for k in ("'j'","'k'","'Enter'","'Escape'"):
        assert k in html
    # Highlight function escapes regex characters
    assert 'replace(/[.*+?^${}()|[' in html or 'replace(/[.*+?^${}()|[\\]\\\\]/g' in html

