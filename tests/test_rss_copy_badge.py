from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = ROOT / 'docs' / '_layouts' / 'default.html'
CSS = ROOT / 'docs' / 'assets' / 'css' / 'site.css'


def test_layout_has_rss_copy_button_and_script():
    html = LAYOUT.read_text(encoding='utf-8')
    assert 'id="rss-copy"' in html
    assert 'navigator.clipboard.writeText' in html
    assert 'Copy RSS URL' in html


def test_rss_link_has_basic_styling():
    """Verify .rss-link is basic styling (margin), not fixed positioning."""
    css = CSS.read_text(encoding='utf-8')
    assert '.rss-link' in css
    # Ensure it's just margin/decoration, not fixed positioning
    rss_idx = css.find('.rss-link')
    rss_block = css[rss_idx:css.find('}', rss_idx)]
    assert 'position' not in rss_block
