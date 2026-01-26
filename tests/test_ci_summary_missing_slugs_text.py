from pathlib import Path

WF = Path(__file__).resolve().parents[1] / '.github' / 'workflows' / 'generate-related-min.yml'


def test_workflow_commits_data_artifacts():
    """Verify workflow commits _data artifacts."""
    y = WF.read_text(encoding='utf-8')
    assert "file_pattern:" in y
    assert "docs/_data/*" in y

