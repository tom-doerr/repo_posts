from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'docs' / 'archive.md'


def test_archive_links_use_clean_title_text():
    s = ARCHIVE.read_text(encoding='utf-8')
    # Ensure we sanitize title markdown to plain text for link labels
    assert 'post.title | markdownify | strip_html | strip' in s

