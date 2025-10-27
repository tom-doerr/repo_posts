from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEED = ROOT / 'docs' / 'feed.xml'


def test_feed_includes_post_image_when_present():
    xml = FEED.read_text(encoding='utf-8')
    assert '{% if post.image %}' in xml
    # Image uses absolute URL for readers
    assert '<img src="{{ post.image | relative_url | absolute_url }}"' in xml
    # Image is prepended before the HTML content
    assert xml.index('<img src="{{ post.image | relative_url | absolute_url }}"') < xml.index('{{ html }}')
