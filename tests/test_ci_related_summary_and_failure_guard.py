from pathlib import Path

WF = Path(__file__).resolve().parents[1] / '.github' / 'workflows' / 'generate-related-min.yml'


def test_workflow_writes_job_summary():
    """Verify workflow writes job runtime to summary."""
    y = WF.read_text(encoding='utf-8')
    assert 'GITHUB_STEP_SUMMARY' in y
    assert 'Job runtime' in y

