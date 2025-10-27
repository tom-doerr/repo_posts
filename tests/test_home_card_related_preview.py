from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POST_CARD = ROOT / 'docs' / '_includes' / 'post_card.html'
RELATED_INC = ROOT / 'docs' / '_includes' / 'related_item.html'


def test_home_card_renders_related_preview_block():
    html = POST_CARD.read_text(encoding='utf-8')
    assert 'related-list' in html
    assert 'limit:3' in html
    # Uses the related_item include
    assert 'include related_item.html' in html

