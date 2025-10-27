from pathlib import Path

WF = Path(__file__).resolve().parents[1] / '.github' / 'workflows' / 'assets-report.yml'


def test_assets_report_workflow_exists_and_has_summary():
    y = WF.read_text(encoding='utf-8')
    assert 'docs/assets/**' in y
    assert 'GITHUB_STEP_SUMMARY' in y
    assert 'Top 20 assets by size' in y or 'Assets report' in y

