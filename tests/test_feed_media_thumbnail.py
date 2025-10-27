from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEED = ROOT / 'docs' / 'feed.xml'


def test_feed_declares_media_namespace_and_thumbnail():
    xml = FEED.read_text(encoding='utf-8')
    assert 'xmlns:media="http://search.yahoo.com/mrss/"' in xml
    assert '<media:thumbnail url="{{ post.image | relative_url | absolute_url }}" />' in xml

