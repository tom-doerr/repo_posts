from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = ROOT / 'docs' / '_layouts' / 'default.html'


def test_hash_reassertion_script_present():
    html = LAYOUT.read_text(encoding='utf-8')
    assert 'location.hash' in html
    assert 'scrollIntoView' in html
    assert 'addEventListener(\'load\'' in html or 'addEventListener("load"' in html

