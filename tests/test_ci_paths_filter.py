from pathlib import Path

WF = Path(__file__).resolve().parents[1] / '.github' / 'workflows' / 'jekyll.yml'


def test_pages_workflow_has_paths_filter_and_dispatch():
    y = WF.read_text(encoding='utf-8')
    assert "paths:" in y
    assert "'docs/**'" in y
    assert "workflow_dispatch:" in y

