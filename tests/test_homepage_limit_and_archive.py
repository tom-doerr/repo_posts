from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'docs' / 'index.md'
ARCHIVE = ROOT / 'docs' / 'archive.md'


def test_index_limits_posts_to_100():
    txt = INDEX.read_text(encoding='utf-8')
    assert "for post in site.posts limit: 100" in txt


def test_archive_exists_and_lists_all_posts():
    assert ARCHIVE.exists()
    html = ARCHIVE.read_text(encoding='utf-8')
    assert html.strip().startswith('---') and 'layout: default' in html
    assert '<ul class="archive-list">' in html
    assert 'for post in site.posts' in html and 'limit:' not in html
    assert 'href="{{ post.url | relative_url }}"' in html

