from pathlib import Path

WF = Path(__file__).resolve().parents[1] / '.github' / 'workflows' / 'pattern-guard.yml'


def test_pattern_guard_has_core_checks():
    y = WF.read_text(encoding='utf-8')
    assert 'relative_url' in y and 'absolute_url' in y
    assert '/repo_posts/repo_posts/' in y
    assert 'paths:' in y and "'docs/**'" in y

