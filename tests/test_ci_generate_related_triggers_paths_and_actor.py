from pathlib import Path

WF = Path(__file__).resolve().parents[1] / '.github' / 'workflows' / 'generate-related-min.yml'


def test_workflow_triggers_on_docs_changes():
    """Verify workflow triggers on docs and tools changes."""
    y = WF.read_text(encoding='utf-8')
    assert "paths:" in y
    assert "'docs/_posts/**'" in y
    assert "'tools/**'" in y

