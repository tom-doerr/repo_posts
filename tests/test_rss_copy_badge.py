from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = ROOT / 'docs' / '_layouts' / 'default.html'
CSS = ROOT / 'docs' / 'assets' / 'css' / 'site.css'


def test_layout_has_rss_copy_button_and_script():
    html = LAYOUT.read_text(encoding='utf-8')
    assert 'id="rss-copy"' in html
    assert 'navigator.clipboard.writeText' in html
    assert 'Copy RSS URL' in html


def test_no_fixed_rss_badge_css_anymore():
    css = CSS.read_text(encoding='utf-8')
    assert '.rss-link' not in css
