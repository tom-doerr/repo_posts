from pathlib import Path

SEARCH_JS = Path(__file__).resolve().parents[1] / 'docs' / 'assets' / 'js' / 'search.js'


def test_search_js_has_front_matter_for_liquid():
    head = SEARCH_JS.read_text(encoding='utf-8').splitlines()[:3]
    assert head[0].strip() == '---' and head[1].strip() == '---'
