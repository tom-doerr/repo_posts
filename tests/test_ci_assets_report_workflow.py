from pathlib import Path

WF = Path(__file__).resolve().parents[1] / '.github' / 'workflows' / 'image-compress.yml'


def test_image_compress_workflow_exists():
    """Verify image compression workflow for assets."""
    y = WF.read_text(encoding='utf-8')
    assert 'docs/assets/**' in y
    assert 'GITHUB_STEP_SUMMARY' in y

