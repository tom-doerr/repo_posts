from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'docs' / 'archive.md'


def test_archive_links_use_post_text_after_h1():
    s = ARCHIVE.read_text(encoding='utf-8')
    # Use first paragraph after the H1 heading as the link label
    assert 'post.content | markdownify' in s
    assert "split: '</h1>' | last" in s
    assert "split: '</p>' | first" in s
