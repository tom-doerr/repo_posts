import json, re
from pathlib import Path

IDX = Path(__file__).resolve().parents[1] / 'docs' / 'assets' / 'search-index.json'


def test_index_schema_and_url_shape_sample():
    rows = json.loads(IDX.read_text(encoding='utf-8'))
    assert isinstance(rows, list) and len(rows) > 10
    for row in rows[:50]:
        assert set(['t','u','d','title','s']).issubset(row.keys())
        assert re.match(r'^/\d{4}/\d{2}/\d{2}/.+\.html$', row['u'])
        assert re.match(r'^\d{4}-\d{2}-\d{2}$', row['d'])
