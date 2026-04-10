#!/usr/bin/env python3
"""
audit_css.py — validate style.css before pushing
Checks for broken rules, missing components, brace balance.

Usage: python3 scripts/audit_css.py
"""
import re, sys
from pathlib import Path

css = Path('www/hub/style.css').read_text()

issues = []
warnings = []

# ── 1. Brace balance ──────────────────────────────────────────────────────
opens  = css.count('{')
closes = css.count('}')
if opens != closes:
    issues.append(f"Brace mismatch: {opens} open vs {closes} close (diff={opens-closes})")

# ── 2. Known-broken patterns from partial str_replace ─────────────────────
BROKEN = [
    ('overflow;letter',   'truncated overflow property'),
    ('overflow;color',    'truncated overflow property'),
    ('}:hidden',          'broken closing brace + :hidden'),
    ('};margin',          'merged rules'),
    (';font-size}',       'truncated font-size'),
    ('color:var}',        'truncated color value'),
    ('display:}',         'empty display value'),
]
for pattern, desc in BROKEN:
    if pattern in css:
        idx = css.find(pattern)
        issues.append(f"Broken CSS ({desc}) at char {idx}: ...{css[max(0,idx-20):idx+40]}...")

# ── 3. Required components (things we built this session) ─────────────────
REQUIRED = [
    ('.nav{',                  'nav bar'),
    ('.stats-bar{',            'stats bar'),
    ('.c-row{',                'list row'),
    ('.c-detail{',             'detail row'),
    ('.c-num{',                'company number badge'),
    ('.c-enrich{',             'enrich button'),
    ('.sort-bar{',             'sort bar'),
    ('.sort-sel{',             'sort dropdown'),
    ('.c-detail-item+.c-detail-item::before', 'detail separator'),
    ('.ai-quick{',             'AI quick chips'),
    ('.ai-qchip{',             'AI quick chip'),
    ('.ib-head{',              'company panel header'),
    ('.ib-facts{',             'facts table'),
    ('.ib-cta{',               'CTA buttons'),
    ('.ib-sec{',               'sections'),
    ('.console-panel{',        'console panel'),
    ('.console-panel.open{',   'console open state'),
    ('[data-demo]',            'demo mode console hiding'),
    ('.mc-col-a{',             'Meeseeks col-a'),
    ('.mc-col-b{',             'Meeseeks col-b'),
    ('.mc-col-c{',             'Meeseeks col-c'),
    ('.mc-pgrid{',             'Meeseeks persona grid'),
    ('.mc-co-search-inp{',     'Meeseeks company search'),
    ('.oa-tut-mini-pill{',     'Tutorial mini pill'),
    ('.aud-row{',              'Audience list row'),
    ('.aud-toolbar{',          'Audience toolbar'),
    ('.aud-row-name{',         'Audience row name'),
    ('.aud-detail-header{',    'Audience detail header'),
    ('.aud-member-row{',       'Audience member row'),
    ('.sys-chip{',             'List membership chip'),
    ('.sys-tag{',              'Company tag pill'),
    ('.sys-dd{',               'Dropdown menu'),
    ('.ib-sys-row{',           'Panel sys row'),
    ('.ll-header{',            'Lemlist panel header'),
    ('.ll-row{',               'Lemlist campaign row'),
    ('.ll-detail{',            'Lemlist detail panel'),
    ('.ll-table{',             'Lemlist leads table'),
    ('.vf-wrap{',              'Company finder panel'),
    ('.vf-card{',              'Company finder result card'),
    ('.vf-chip{',              'Company finder quick chips'),
]
def _css_compact(s: str) -> str:
    return "".join(s.split())


def component_present(css_text: str, selector: str) -> bool:
    """Match `.foo{` or `.foo {` in source; match complex selectors without relying on exact whitespace."""
    if selector.endswith("{"):
        base = selector[:-1].strip()
        return re.search(re.escape(base) + r"\s*\{", css_text) is not None
    return _css_compact(selector) in _css_compact(css_text)


for selector, name in REQUIRED:
    if not component_present(css, selector):
        issues.append(f"Missing CSS component: {name} ({selector})")

# ── 4. Typography checks — key values we set ─────────────────────────────
EXPECTED_VALUES = [
    ('font-size:19px',         'ib-name 19px'),
    ('font-size:12.5px',       'c-name 12.5px'),
    ('height:40px',            'stats-bar 40px'),
    ('font-weight:600',        'ib-name weight'),
    ('font-style:italic',      'c-note italic'),
]
for value, desc in EXPECTED_VALUES:
    if value not in css:
        warnings.append(f"Expected value missing: {desc} ({value})")

# ── 5. Duplicate selectors (common cause of confusion) ───────────────────
selectors = re.findall(r'([\.\#\[\w][^{]+)\{', css)
from collections import Counter
counts = Counter(s.strip() for s in selectors)
dupes = [(s, n) for s, n in counts.items() if n > 1 and len(s) > 3]
if dupes:
    for s, n in sorted(dupes, key=lambda x: -x[1])[:5]:
        warnings.append(f"Duplicate selector ({n}x): {s}")

# ── Report ────────────────────────────────────────────────────────────────
print(f"style.css: {len(css):,} chars, {opens} rules")
print()

if issues:
    print("ERRORS:")
    for i in issues:
        print(f"  ✗ {i}")
else:
    print("✓ No structural errors found")

if warnings:
    print("\nWARNINGS:")
    for w in warnings:
        print(f"  ⚠ {w}")

sys.exit(1 if issues else 0)
