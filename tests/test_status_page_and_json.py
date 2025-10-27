from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
STATUS_PAGE = ROOT / 'docs' / 'status.md'
STATUS_JSON = ROOT / 'docs' / '_data' / 'status.json'
LAYOUT = ROOT / 'docs' / '_layouts' / 'default.html'


def test_status_json_has_fields():
    data = json.loads(STATUS_JSON.read_text(encoding='utf-8'))
    int_keys = (
        'posts','related_keys','nonempty','missing','related_renderable',
        'embeddings_count','embeddings_size_bytes','embeddings_dim',
        'search_index_entries','search_index_size_bytes'
    )
    for k in int_keys:
        assert k in data and isinstance(data[k], int) and data[k] >= 0
    assert isinstance(data.get('embeddings_model', ''), str)


def test_status_page_reads_site_data():
    html = STATUS_PAGE.read_text(encoding='utf-8')
    assert 'site.data.status' in html
    assert 'Posts:' in html
    assert 'Embeddings:' in html
    assert 'Pages with recommendations' in html
    assert 'Model:' in html
    # Percent expression for recommendations exists
    assert 'times: 100 | divided_by: s.posts' in html
    assert 'Search index:' in html


def test_layout_has_status_link():
    html = LAYOUT.read_text(encoding='utf-8')
    assert "href=\"{{ '/status.html' | relative_url }}\"" in html
    assert '>Status<' in html
