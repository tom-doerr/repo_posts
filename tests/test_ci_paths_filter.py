from pathlib import Path

WF = Path(__file__).resolve().parents[1] / '.github' / 'workflows' / 'pages-min.yml'


def test_pages_workflow_has_paths_filter():
    """Verify pages workflow has paths filter to avoid unnecessary builds."""
    y = WF.read_text(encoding='utf-8')
    assert "paths:" in y
    assert "'docs/**'" in y

