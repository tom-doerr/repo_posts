from pathlib import Path

WF = Path(__file__).resolve().parents[1] / '.github' / 'workflows' / 'rss-smoke.yml'


def test_smoke_checks_first_feed_image():
    y = WF.read_text(encoding='utf-8')
    assert 'Check first feed image is reachable' in y
    assert 'awk -F' in y or 'src=\"' in y
    assert 'curl -fsSI' in y

