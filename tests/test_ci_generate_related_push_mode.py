from pathlib import Path

WF = Path(__file__).resolve().parents[1] / '.github' / 'workflows' / 'generate-related-min.yml'


def test_generate_related_uses_embeddings_on_push():
    y = WF.read_text(encoding='utf-8')
    assert 'RELATED_ONLY_MISSING=1' in y
    assert 'RELATED_MODE=owner' not in y

