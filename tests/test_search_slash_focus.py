from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEARCH_JS = ROOT / 'docs' / 'assets' / 'js' / 'search.js'


def test_slash_focus_handler_present():
    js = SEARCH_JS.read_text(encoding='utf-8')
    assert "/\" focuses the search input" in js or '"/" focuses the search input' in js
    assert "e.key==='/'" in js or 'e.key!==\'/\'' in js
    assert 'input.focus()' in js
    assert 'e.preventDefault()' in js

