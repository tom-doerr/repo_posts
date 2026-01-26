from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WF = ROOT / '.github' / 'workflows' / 'generate-related-min.yml'


def test_generate_related_has_concurrency_and_force_with_lease():
    y = WF.read_text(encoding='utf-8')
    assert 'concurrency:' in y and 'related-${{ github.ref }}' in y
    assert "push_options: '--force-with-lease'" in y

