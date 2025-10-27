from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
README = ROOT / 'README.md'


def test_readme_documents_liquid_numeric_gotcha():
    t = README.read_text(encoding='utf-8')
    assert 'Liquid numeric gotcha' in t
    assert 'times: 100.0' in t or 'times: 1.0' in t
    assert 'divided_by: s.posts' in t

