from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / 'docs' / 'assets' / 'css' / 'site.css'


def test_wrapper_not_flex_and_no_section_footer_flex():
    css = CSS.read_text(encoding='utf-8')
    # Guard against overlap regressions caused by flexing the theme wrapper
    assert '.wrapper { display:flex' not in css
    # Avoid flex on section/footer which depends on wrapper flex
    assert 'section { flex:' not in css
    assert 'footer { flex:' not in css

