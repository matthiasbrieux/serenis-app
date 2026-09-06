#!/usr/bin/env python3
"""
Passe finale : corrige les hex restants y compris dans les event handlers
onmouseover/onmouseout et les JS qui set des styles via element.style.*
"""

import re, os, glob

SELLER_DIR = '/Users/brieuxmatthias/serenis-app/views/seller'

# ─── Phase A : Remplacements globaux (fichier entier, pas seulement CSS) ──────
# Seuls des cas sans ambiguïté (jamais utilisés comme identifiants / strings)
GLOBAL_REPLACEMENTS = [
    # Ancien vert parasite (toujours utilisé comme couleur hover/active)
    ('#2d4535', 'var(--terracotta-dark)'),
    ('#2D4535', 'var(--terracotta-dark)'),

    # Autres anciens verts similaires encore présents comme couleurs
    ('#2d4a38', 'var(--terracotta-dark)'),
    ('#2D4A38', 'var(--terracotta-dark)'),
    ('#243d2e', 'var(--terracotta-dark)'),
    ('#243D2E', 'var(--terracotta-dark)'),
]

# ─── Phase B : rgba parasites → base terracotta canonical ─────────────────────
RGBA_GLOBAL_FIXES = [
    # rgba(196,96,58,X) = #C4603A (ancien terracotta) → rgba terracotta
    (r'rgba\(\s*196\s*,\s*96\s*,\s*58\s*,', 'rgba(158,58,24,'),
    # rgba(196,120,90,X) = #C4785A (ancien terracotta) → rgba terracotta
    (r'rgba\(\s*196\s*,\s*120\s*,\s*90\s*,', 'rgba(158,58,24,'),
]

# ─── Phase C : CSS contexts + event handlers ──────────────────────────────────
# (appliqué dans style blocks, style="", onmouseover/onmouseout/onclick attrs)
CSS_ATTR_SOLID = [
    # Tints restants manqués au passage précédent
    ('#D4905A', 'var(--terracotta-dark)'),  # biblio doc-card bar accent
    ('#D0795A', 'var(--terracotta-dark)'),  # dashboard gradient end
    ('#7A4A0A', 'var(--terracotta)'),       # property DPE section title text
    ('#7A4A2A', 'var(--noir)'),             # property help text
    ('#B08070', 'rgba(158,58,24,0.45)'),   # library done-label (barré, volontairement atténué)
    ('#C4A882', 'var(--sable-dore)'),       # library card border accent
]

# ─── Fonctions de traitement ──────────────────────────────────────────────────

def apply_global(content: str) -> str:
    for old, new in GLOBAL_REPLACEMENTS:
        content = content.replace(old, new)
    for pattern, repl in RGBA_GLOBAL_FIXES:
        content = re.sub(pattern, repl, content)
    return content


def fix_css_value(text: str) -> str:
    for old, new in CSS_ATTR_SOLID:
        text = re.sub(re.escape(old), new, text, flags=re.IGNORECASE)
    return text


def process_file(fp: str) -> bool:
    content = open(fp, encoding='utf-8').read()
    original = content

    # Phase A : global
    content = apply_global(content)

    # Phase B : style blocks
    def replace_style_block(m):
        return m.group(1) + fix_css_value(m.group(2)) + m.group(3)
    content = re.sub(r'(<style[^>]*>)(.*?)(</style>)',
                     replace_style_block, content, flags=re.DOTALL)

    # Phase C : inline style="..." attributs
    def replace_inline(m):
        return m.group(1) + fix_css_value(m.group(2)) + m.group(3)
    content = re.sub(r'(style=")([^"]*?)(")', replace_inline, content)
    content = re.sub(r"(style=')([^']*?)(')", replace_inline, content)

    # Phase D : event handler attributes (onmouseover, onmouseout, onmouseenter, etc.)
    def replace_event_attr(m):
        return m.group(1) + fix_css_value(m.group(2)) + m.group(3)
    content = re.sub(r'(on(?:mouse(?:over|out|enter|leave)|click|focus|blur)=")([^"]*?)(")',
                     replace_event_attr, content)

    changed = content != original
    if changed:
        open(fp, 'w', encoding='utf-8').write(content)
    return changed


files = sorted(glob.glob(os.path.join(SELLER_DIR, '*.html')))
changed = 0
for fp in files:
    if process_file(fp):
        print(f'  ✓ {os.path.basename(fp)}')
        changed += 1

print(f'\n{changed}/{len(files)} fichiers modifiés.')

# ─── Vérification finale : verts résiduels (ne devrait rien trouver) ──────────
print('\n=== Vérification finale : anciens verts restants ===')
GREEN_SUSPECTS = re.compile(r'#(?:2[Dd]4[Aa]?35|1[Dd]3[Aa]28|3[Dd]5[Aa]47|0[Ff]1[Ee]13|2[Dd]4535|243[Dd]2[Cc]|2[Dd]4[Aa]38)', re.IGNORECASE)
any_green = False
for fp in files:
    content = open(fp).read()
    hits = GREEN_SUSPECTS.findall(content)
    if hits:
        any_green = True
        print(f'  {os.path.basename(fp)}: {set(h.lower() for h in hits)}')
if not any_green:
    print('  ✓ Aucun ancien vert.')

print('\n=== rgba parasites restants ===')
RGBA_OLD = re.compile(r'rgba\(\s*196\s*,\s*(?:96|120)\s*,\s*(?:58|90)\s*,')
any_rgba = False
for fp in files:
    content = open(fp).read()
    if RGBA_OLD.search(content):
        any_rgba = True
        print(f'  {os.path.basename(fp)}: rgba parasites trouvés')
if not any_rgba:
    print('  ✓ Aucun rgba parasite.')
