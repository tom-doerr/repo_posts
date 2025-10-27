from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = ROOT / 'docs' / '_layouts' / 'default.html'
CSS = ROOT / 'docs' / 'assets' / 'css' / 'site.css'


def test_layout_has_rss_copy_badge_and_script():
    html = LAYOUT.read_text(encoding='utf-8')
    assert 'id="rss-badge"' in html
    assert 'navigator.clipboard.writeText' in html
    assert 'Copy RSS' in html


def test_css_rss_link_is_button_friendly():
    css = CSS.read_text(encoding='utf-8')
    assert '.rss-link' in css and 'cursor:pointer' in css
