from pathlib import Path

WF = Path(__file__).resolve().parents[1] / '.github' / 'workflows' / 'generate-related.yml'


def test_workflow_writes_job_summary_and_env():
    y = WF.read_text(encoding='utf-8')
    assert 'GITHUB_STEP_SUMMARY' in y
    assert 'GITHUB_ENV' in y
    assert 'Related coverage' in y


def test_workflow_fails_on_missing_for_schedule():
    y = WF.read_text(encoding='utf-8')
    assert "github.event_name == 'schedule'" in y
    assert 'Missing related entries' in y
    assert 'exit 1' in y

