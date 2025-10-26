from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / 'docs' / 'assets' / 'css' / 'site.css'


def test_section_has_max_width_cap():
    css = CSS.read_text(encoding='utf-8')
    assert 'section {' in css
    assert 'max-width: 900px' in css

