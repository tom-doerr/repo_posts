from pathlib import Path

IDX = Path(__file__).resolve().parents[1] / 'docs' / 'assets' / 'search-index.json'


def test_search_index_exists_and_is_array_like():
    assert IDX.exists()
    size = IDX.stat().st_size
    assert size > 100
    with IDX.open('rb') as f:
        first = f.read(1)
    assert first == b'['


def test_search_index_contains_title_field():
    s = IDX.read_text(encoding='utf-8')
    assert '"title":' in s
