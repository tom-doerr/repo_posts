from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / 'docs' / 'assets' / 'css' / 'site.css'
LAYOUT = ROOT / 'docs' / '_layouts' / 'default.html'


def test_no_two_column_grid_in_custom_css():
    css = CSS.read_text(encoding='utf-8')
    assert 'display:grid' not in css
    assert 'grid-template-columns' not in css


def test_no_fixed_or_absolute_position_on_content_wrappers():
    css = CSS.read_text(encoding='utf-8')
    # The site uses the theme's normal left header; we avoid fixed/absolute on wrappers
    assert 'position: fixed' not in css
    # Allow absolute-position for search dropdown, clear button, skip-link, stretched-link
    assert css.count('position:absolute') <= 5


def test_layout_contains_single_section_and_post_image_block():
    html = LAYOUT.read_text(encoding='utf-8')
    # Section may have id="main" for skip link accessibility
    assert html.count('<section') == 1
    # Per-post image + index link are present under the content
    assert 'class="post-image"' in html
    assert 'View on index' in html
