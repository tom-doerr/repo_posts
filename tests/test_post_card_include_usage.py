from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'docs' / 'index.md'
INC = ROOT / 'docs' / '_includes' / 'post_card.html'


def test_post_card_include_exists():
    assert INC.exists()
    html = INC.read_text(encoding='utf-8')
    assert '<article class="post"' in html


def test_index_uses_post_card_include():
    txt = INDEX.read_text(encoding='utf-8')
    assert '{% include post_card.html' in txt
