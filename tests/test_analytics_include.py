from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = ROOT / 'docs' / '_layouts' / 'default.html'
INDEX = ROOT / 'docs' / 'index.md'
INCLUDE = ROOT / 'docs' / '_includes' / 'analytics.html'


def test_layout_includes_analytics_once():
    html = LAYOUT.read_text(encoding='utf-8')
    assert '{% include analytics.html %}' in html


def test_index_no_longer_includes_analytics_directly():
    idx = INDEX.read_text(encoding='utf-8')
    assert '{% include analytics.html %}' not in idx


def test_analytics_include_has_script_and_noscript_pixel():
    inc = INCLUDE.read_text(encoding='utf-8')
    assert 'scripts.simpleanalyticscdn.com/latest.js' in inc
    assert 'noscript' in inc and 'noscript.gif' in inc

