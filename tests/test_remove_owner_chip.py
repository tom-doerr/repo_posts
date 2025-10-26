from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = ROOT / 'docs' / '_layouts' / 'default.html'


def test_no_owner_chip_in_post_layout():
    html = LAYOUT.read_text(encoding='utf-8')
    assert 'class="chips"' not in html
    assert '@{{ owner }}' not in html

