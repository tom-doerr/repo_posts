from pathlib import Path

CFG = Path(__file__).resolve().parents[1] / 'docs' / '_config.yml'


def test_plugins_include_seo_and_sitemap():
    y = CFG.read_text(encoding='utf-8')
    assert 'jekyll-seo-tag' in y
    assert 'jekyll-sitemap' in y

