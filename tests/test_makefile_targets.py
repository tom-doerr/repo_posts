from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MK = ROOT / 'Makefile'


def test_makefile_exists_and_has_targets():
    assert MK.exists()
    t = MK.read_text(encoding='utf-8')
    for target in ('build:', 'serve:', 'test:'):
        assert target in t


def test_makefile_commands_are_simple():
    t = MK.read_text(encoding='utf-8')
    assert 'jekyll build -s docs' in t
    assert 'jekyll serve -s docs' in t
    assert 'pytest -q' in t

