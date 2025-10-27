from pathlib import Path

WF = Path(__file__).resolve().parents[1] / '.github' / 'workflows' / 'generate-related.yml'


def test_workflow_summary_includes_top_missing_slugs():
    y = WF.read_text(encoding='utf-8')
    assert 'top-missing:' in y

