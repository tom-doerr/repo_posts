from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = ROOT / 'docs' / '_layouts' / 'default.html'


def test_search_input_and_panel_exist_and_scripts_loaded():
    html = LAYOUT.read_text(encoding='utf-8')
    assert 'id="site-search"' in html
    assert 'id="search-results"' in html
    assert 'placeholder="Search repos…"' in html
    assert "/assets/js/fuzzysort.min.js" in html
    assert "/assets/js/search.js" in html

