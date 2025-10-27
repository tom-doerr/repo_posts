from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEN = ROOT / 'tools' / 'generate_related.py'


def test_owner_mode_skips_empty_entries():
    code = GEN.read_text(encoding='utf-8')
    # Ensure we guard writing related entries with a non-empty check
    assert 'if top:' in code and 'related[it["slug"]] = top' in code

