from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
README = ROOT / 'README.md'
WF = ROOT / '.github' / 'workflows' / 'generate-related.yml'


def test_readme_has_coverage_markers():
    t = README.read_text(encoding='utf-8')
    assert '<!-- related-coverage:start -->' in t
    assert '<!-- related-coverage:end -->' in t


def test_workflow_updates_readme_badge():
    y = WF.read_text(encoding='utf-8')
    assert 'Update README related coverage badge' in y
    assert 'commit_message: ' in y and 'related coverage badge' in y
    assert 'Recs shown:' in y
