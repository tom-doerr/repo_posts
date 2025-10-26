from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WF = ROOT / '.github' / 'workflows' / 'rss-smoke.yml'


def test_smoke_has_related_link_curl_and_analytics_single_check():
    yml = WF.read_text(encoding='utf-8')
    assert 'Check first related link returns 200' in yml
    assert "awk '/<ul class=\"related-list\">/,/<\\/ul>/" in yml
    assert "grep -o 'scripts.simpleanalyticscdn.com' post2.html | wc -l" in yml

