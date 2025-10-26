from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = ROOT / 'docs' / '_layouts' / 'default.html'
INDEX = ROOT / 'docs' / 'index.md'
HEADER = ROOT / 'docs' / '_includes' / 'header.html'
INCLUDE = ROOT / 'docs' / '_includes' / 'analytics.html'

DOMAIN = 'scripts.simpleanalyticscdn.com/latest.js'
PIXEL = 'queue.simpleanalyticscdn.com/noscript.gif'


def test_layout_includes_analytics_single():
    html = LAYOUT.read_text(encoding='utf-8')
    assert html.count('{% include analytics.html %}') == 1


def test_simpleanalytics_script_only_in_include():
    for p in (LAYOUT, INDEX, HEADER):
        assert DOMAIN not in p.read_text(encoding='utf-8')
    inc = INCLUDE.read_text(encoding='utf-8')
    assert inc.count(DOMAIN) == 1
    assert inc.count(PIXEL) == 1

