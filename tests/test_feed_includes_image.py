from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEED = ROOT / 'docs' / 'feed.xml'


def test_feed_includes_post_image_when_present():
    xml = FEED.read_text(encoding='utf-8')
    assert '{% if post.image %}' in xml
    # Image uses absolute URL via include
    assert '<img src="{% include img_abs_url.html path=post.image %}"' in xml
    # Image is prepended before the HTML content
    assert xml.index('<img src="{% include img_abs_url.html path=post.image %}"') < xml.index('{{ html }}')
