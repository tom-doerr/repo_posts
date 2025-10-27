from pathlib import Path

WF = Path(__file__).resolve().parents[1] / '.github' / 'workflows' / 'generate-related.yml'


def test_workflow_triggers_on_docs_changes_and_skips_bot_loops():
    y = WF.read_text(encoding='utf-8')
    assert "paths:" in y and "'docs/**'" in y
    assert "if: ${{ github.actor != 'github-actions[bot]' }}" in y

