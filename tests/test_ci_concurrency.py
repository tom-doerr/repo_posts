from pathlib import Path

WF = Path(__file__).resolve().parents[1] / '.github' / 'workflows' / 'generate-related-min.yml'


def test_generate_related_workflow_has_concurrency_guard():
    """Verify concurrency guard on generate-related workflow."""
    yml = WF.read_text(encoding='utf-8')
    assert 'concurrency:' in yml
    assert 'group: related-${{ github.ref }}' in yml
    assert 'cancel-in-progress: true' in yml

