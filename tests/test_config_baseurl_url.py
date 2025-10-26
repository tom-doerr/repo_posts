from pathlib import Path

CFG = Path(__file__).resolve().parents[1] / 'docs' / '_config.yml'


def test_config_has_baseurl_and_url():
    y = CFG.read_text(encoding='utf-8')
    assert 'baseurl:' in y
    assert 'url:' in y
