from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = ROOT / 'docs' / '_layouts' / 'default.html'
INC = ROOT / 'docs' / '_includes' / 'related_item.html'


def test_related_block_filters_same_repo_by_slug():
    # Layout should use the include
    layout = LAYOUT.read_text(encoding='utf-8')
    assert 'include related_item.html' in layout

    # Include should compute slugs and guard against same repo
    inc = INC.read_text(encoding='utf-8')
    assert "assign item_slug = include.item.url | split: '/' | last | split: '.' | first" in inc
    assert "if item_slug != include.cur_slug" in inc
