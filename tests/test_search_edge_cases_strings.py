from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEARCH_JS = ROOT / 'docs' / 'assets' / 'js' / 'search.js'


def test_empty_query_early_return_and_clear_results():
    js = SEARCH_JS.read_text(encoding='utf-8')
    assert "if(!q){ current=[]; render(); return; }" in js


def test_single_char_tokens_not_highlighted_and_regex_escaped():
    js = SEARCH_JS.read_text(encoding='utf-8')
    assert "filter(t=>t.length>1)" in js  # tokens must be >1 to highlight
    assert "t.replace(/" in js and "\\$&" in js  # regex escaping
    assert "<mark>$1</mark>" in js


def test_multi_token_split_and_loop_present():
    js = SEARCH_JS.read_text(encoding='utf-8')
    assert "split(/\\s+/)" in js
    assert "for(const t of toks)" in js


def test_enter_does_nothing_when_no_results():
    js = SEARCH_JS.read_text(encoding='utf-8')
    assert "panel.hidden || !current.length" in js  # guard early exit
    assert "else if(e.key==='Enter'){ if(active>=0){" in js

