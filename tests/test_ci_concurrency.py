from pathlib import Path

WF = Path(__file__).resolve().parents[1] / '.github' / 'workflows' / 'jekyll.yml'


def test_pages_workflow_has_concurrency_guard():
    yml = WF.read_text(encoding='utf-8')
    assert 'concurrency:' in yml
    assert 'group: pages-${{ github.ref }}' in yml
    assert 'cancel-in-progress: true' in yml

