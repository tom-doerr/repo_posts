from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEARCH_JS = ROOT / 'docs' / 'assets' / 'js' / 'search.js'


def test_js_fetch_index_and_limits_and_highlight_usage():
    js = SEARCH_JS.read_text(encoding='utf-8')
    assert '"/assets/search-index.json"' in js
    assert 'q.split(/\\s+/' in js  # tokenization
    assert 'indexOf(' in js         # substring matching
    assert 'scored.sort(' in js     # ranking
    assert 'current.slice(0,20)' in js
    assert 'highlight(e.title,currentQuery)' in js
    assert 'const BASE = ' in js
    assert 'window.location = BASE + current[active].u' in js
