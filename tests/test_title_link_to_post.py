from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'docs' / 'index.md'
CSS = ROOT / 'docs' / 'assets' / 'css' / 'site.css'


def test_no_extra_post_title_link_on_homepage():
    idx = INDEX.read_text(encoding='utf-8')
    assert 'class="post-title"' not in idx


def test_homepage_does_not_hide_inner_h1():
    css = CSS.read_text(encoding='utf-8')
    assert '.home-page .post h1:first-child { display: none; }' not in css
