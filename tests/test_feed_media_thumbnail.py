from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEED = ROOT / 'docs' / 'feed.xml'


def test_feed_declares_media_namespace_and_thumbnail():
    xml = FEED.read_text(encoding='utf-8')
    assert 'xmlns:media="http://search.yahoo.com/mrss/"' in xml
    assert '<media:thumbnail url="{% include img_abs_url.html path=post.image %}"' not in xml  # now uses captured absimg
    assert '<media:thumbnail url="{{ absimg | strip }}" />' in xml
    assert '<media:content url="{{ absimg | strip }}" medium="image" type="' in xml
    assert '<link rel="enclosure" type="' in xml and 'href="{{ absimg | strip }}"' in xml
