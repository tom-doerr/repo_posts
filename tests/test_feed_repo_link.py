from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEED = ROOT / 'docs' / 'feed.xml'


def test_custom_feed_includes_related_repo_link_logic():
    xml = FEED.read_text(encoding='utf-8')
    assert 'rel="related"' in xml
    # Ensure we extract first href from content
    assert "split: 'href=\"'" in xml
    assert "split: '\"'" in xml

