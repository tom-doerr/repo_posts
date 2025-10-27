from pathlib import Path

GEN = Path(__file__).resolve().parents[1] / 'tools' / 'generate_related.py'


def test_generate_related_has_model_constants_and_assert():
    s = GEN.read_text(encoding='utf-8')
    assert 'EMB_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"' in s
    assert 'EMB_EXPECTED_DIM = 384' in s
    assert 'SentenceTransformer(EMB_MODEL_NAME)' in s
    assert 'assert dim == EMB_EXPECTED_DIM' in s

