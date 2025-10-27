from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = ROOT / 'docs' / '_layouts' / 'default.html'


def test_layout_has_archive_link():
    html = LAYOUT.read_text(encoding='utf-8')
    assert "href=\"{{ '/archive.html' | relative_url }}\"" in html
    assert '>Archive<' in html

