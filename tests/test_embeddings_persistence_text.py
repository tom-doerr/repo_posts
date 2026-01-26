from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEN = ROOT / 'tools' / 'generate_related.py'
WF = ROOT / '.github' / 'workflows' / 'generate-related-min.yml'


def test_generator_mentions_embeddings_npz():
    t = GEN.read_text(encoding='utf-8')
    assert 'embeddings.npz' in t
    assert 'np.savez_compressed' in t


def test_workflow_commits_embeddings_file():
    """Workflow commits docs/_data/* which includes embeddings.npz."""
    y = WF.read_text(encoding='utf-8')
    assert "docs/_data/*" in y

