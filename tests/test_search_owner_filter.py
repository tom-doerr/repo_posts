from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
SEARCH_JS = ROOT / 'docs' / 'assets' / 'js' / 'search.js'
INDEX_JSON = ROOT / 'docs' / 'assets' / 'search-index.json'


def test_search_js_has_owner_filter_logic():
    js = SEARCH_JS.read_text(encoding='utf-8')
    assert 'owner:' in js
    assert 'match(/(?:^|\\s)owner:([\\w-]+)/)' in js
    assert 'includes(`[${owner}/`)' in js
    assert 'qNoOwner' in js


def test_search_index_entries_include_owner_repo_pattern():
    data = json.loads(INDEX_JSON.read_text(encoding='utf-8'))
    assert isinstance(data, list) and len(data) > 0
    # At least one entry should contain "[owner/repo]" style in 't'
    assert any(isinstance(e, dict) and 't' in e and '[' in e['t'] and '/' in e['t'] for e in data)

