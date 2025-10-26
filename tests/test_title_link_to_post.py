from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'docs' / 'index.md'
CSS = ROOT / 'docs' / 'assets' / 'css' / 'site.css'


def test_home_title_links_to_post_page():
    idx = INDEX.read_text(encoding='utf-8')
    assert 'class="post-title"' in idx
    assert 'href="{{ post.url | relative_url }}"' in idx


def test_home_hides_inner_h1_to_avoid_dup():
    css = CSS.read_text(encoding='utf-8')
    assert '.home-page .post h1:first-child { display: none; }' in css

