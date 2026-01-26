from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
README = ROOT / 'README.md'


def test_readme_has_how_things_update_section():
    t = README.read_text(encoding='utf-8')
    assert '## How things update' in t
    assert 'Generate Related Data' in t
    assert 'Every 30 minutes' in t
    assert 'embeddings.npz' in t
    assert 'Status page' in t  # link to status page for coverage stats

