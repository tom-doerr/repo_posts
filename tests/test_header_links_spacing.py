from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / 'docs' / 'assets' / 'css' / 'site.css'


def test_archive_and_status_links_have_spacing():
    css = CSS.read_text(encoding='utf-8')
    assert '.archive-link' in css and 'margin-left' in css
    assert '.status-link' in css and 'margin-left' in css

