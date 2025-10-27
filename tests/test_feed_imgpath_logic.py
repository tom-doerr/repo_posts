from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEED = ROOT / 'docs' / 'feed.xml'


def test_feed_uses_include_for_abs_image_url():
    xml = FEED.read_text(encoding='utf-8')
    assert 'include img_abs_url.html' in xml
    assert '<img src="{% include img_abs_url.html path=post.image %}"' in xml
    # media:thumbnail now uses captured absimg
    assert '<media:thumbnail url="{{ absimg | strip }}" />' in xml


def test_feed_no_old_relative_absolute_chain():
    xml = FEED.read_text(encoding='utf-8')
    assert '| relative_url | absolute_url' not in xml
