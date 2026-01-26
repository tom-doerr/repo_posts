from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
README = ROOT / 'README.md'


def test_readme_links_to_status_page():
    """README links to status page for coverage stats instead of inline markers."""
    t = README.read_text(encoding='utf-8')
    assert 'Status page' in t
    assert 'status.html' in t
