from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / 'docs' / 'assets' / 'css' / 'site.css'


def test_has_fadein_animation_and_reduced_motion_guard():
    css = CSS.read_text(encoding='utf-8')
    assert '@keyframes fadeIn' in css
    assert 'body { animation: fadeIn' in css
    assert '(prefers-reduced-motion: reduce)' in css

