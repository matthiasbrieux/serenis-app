#!/usr/bin/env python3
"""
Convertit tous les hex palette/terracotta en var() CSS dans les pages vendeur.
Traite uniquement les blocs <style> et attributs style="".
Laisse les blocs <script> en hex (JS ne résout pas les CSS custom properties).
"""

import re, os, glob

SELLER_DIR = '/Users/brieuxmatthias/serenis-app/views/seller'

# ─── Remplacements solides (case-insensitive) ────────────────────────────────
# Ordre : parasites en premier, puis palette principale
SOLID = [
    # Parasites introduits par le script précédent
    ('#5C1F0A', 'var(--terracotta-dark)'),
    ('#3D1008', 'var(--noir)'),
    ('#8A4A3A', 'var(--terracotta-dark)'),

    # Variantes sombres near-terracotta-dark (#7A2B12)
    ('#7A2E0A', 'var(--terracotta-dark)'),
    ('#7A3A0A', 'var(--terracotta-dark)'),
    ('#7A3A1E', 'var(--terracotta-dark)'),
    ('#7A3A20', 'var(--terracotta-dark)'),
    ('#7A3D24', 'var(--terracotta-dark)'),
    ('#702E1A', 'var(--terracotta-dark)'),
    ('#5A2E0A', 'var(--terracotta-dark)'),
    ('#4A2E10', 'var(--terracotta-dark)'),
    ('#3A2510', 'var(--terracotta-dark)'),
    ('#2C1A08', 'var(--noir)'),

    # Variantes near-terracotta (#9E3A18)
    ('#9A3A05', 'var(--terracotta)'),
    ('#9A3E00', 'var(--terracotta)'),

    # Palette principale → var()
    ('#9E3A18', 'var(--terracotta)'),
    ('#7A2B12', 'var(--terracotta-dark)'),
    ('#E8C39E', 'var(--sable-dore)'),
    ('#1C0804', 'var(--noir)'),
    ('#FFFFFF', 'var(--blanc)'),

    # Hover-states terracotta → var(--terracotta-dark) (états actifs/survol)
    ('#C4785A', 'var(--terracotta-dark)'),  # ancien terracotta original
    ('#D4785A', 'var(--terracotta-dark)'),
    ('#8B3A22', 'var(--terracotta-dark)'),
    ('#A8482E', 'var(--terracotta-dark)'),
    ('#A84E2E', 'var(--terracotta-dark)'),
    ('#A85540', 'var(--terracotta-dark)'),
    ('#A85A40', 'var(--terracotta-dark)'),
    ('#A93226', 'var(--terracotta-dark)'),
    ('#B85840', 'var(--terracotta-dark)'),
    ('#B56747', 'var(--terracotta-dark)'),
    ('#B36A4D', 'var(--terracotta-dark)'),
    ('#B0522E', 'var(--terracotta-dark)'),
    ('#B05430', 'var(--terracotta-dark)'),
    ('#C4602A', 'var(--terracotta)'),
    ('#5A3A1A', 'var(--terracotta-dark)'),

    # Textes sombres bruns → var(--noir)
    ('#5A4A3A', 'var(--noir)'),
    ('#5A4A2E', 'var(--noir)'),

    # Accents sable/terracotta clair → var(--sable-dore)
    ('#D4A882', 'var(--sable-dore)'),
    ('#E8956A', 'var(--sable-dore)'),
    ('#E8A07A', 'var(--sable-dore)'),
    ('#F0A882', 'var(--sable-dore)'),

    # Accents dorés/caramel → var(--terracotta) (brand accent text)
    ('#6B4C18', 'var(--terracotta)'),
    ('#8B6A3A', 'var(--terracotta)'),

    # Tints clairs terracotta → rgba (aucune var disponible)
    ('#F0C8A8', 'rgba(158,58,24,0.25)'),  # bordures hover
    ('#F0D5C8', 'rgba(158,58,24,0.18)'),  # bordures badges
    ('#F0C8B4', 'rgba(158,58,24,0.14)'),
    ('#E8C4B0', 'rgba(158,58,24,0.16)'),
    ('#E8C5B0', 'rgba(158,58,24,0.16)'),
    ('#E8C4A8', 'var(--sable-dore)'),     # très proche sable-doré
    ('#E8D8CE', 'rgba(158,58,24,0.12)'),
    ('#EDD8CE', 'rgba(158,58,24,0.14)'),
    ('#F5E4DC', 'rgba(158,58,24,0.12)'),
    ('#F5E8E0', 'rgba(158,58,24,0.10)'),
    ('#FBF0EB', 'rgba(158,58,24,0.06)'),
    ('#FDF0EB', 'rgba(158,58,24,0.06)'),
    ('#FDF4F0', 'rgba(158,58,24,0.04)'),
]

# ─── Normalisations rgba parasites (bases introduites par script précédent) ──
RGBA_FIXES = [
    # rgba(92,31,10,X) = #5C1F0A → rgba terracotta canonical
    (r'rgba\(\s*92\s*,\s*31\s*,\s*10\s*,', 'rgba(158,58,24,'),
    # rgba(61,16,8,X) = #3D1008 → rgba noir canonical
    (r'rgba\(\s*61\s*,\s*16\s*,\s*8\s*,',  'rgba(28,8,4,'),
    # rgba(138,74,58,X) = #8A4A3A → rgba terracotta
    (r'rgba\(\s*138\s*,\s*74\s*,\s*58\s*,', 'rgba(158,58,24,'),
]

# ─── DPE + succès + erreurs : JAMAIS touchés ────────────────────────────────
# (les blocs <style> ne sont pas filtrés sur ces valeurs — elles ne font pas
#  partie des SOLID remplacements, donc elles resteront intactes)


def fix_css(text: str) -> str:
    for old, new in SOLID:
        text = re.sub(re.escape(old), new, text, flags=re.IGNORECASE)
    for pattern, repl in RGBA_FIXES:
        text = re.sub(pattern, repl, text)
    return text


def process_file(fp: str) -> tuple[bool, int]:
    content = open(fp, encoding='utf-8').read()
    original = content
    replacements = 0

    # ── 1. Blocs <style>…</style> ─────────────────────────────────────────
    def replace_style_block(m):
        nonlocal replacements
        before = m.group(2)
        after  = fix_css(before)
        replacements += before != after
        return m.group(1) + after + m.group(3)

    content = re.sub(
        r'(<style[^>]*>)(.*?)(</style>)',
        replace_style_block, content, flags=re.DOTALL
    )

    # ── 2. Attributs style="…" inline ────────────────────────────────────
    def replace_inline(m):
        nonlocal replacements
        before = m.group(2)
        after  = fix_css(before)
        replacements += before != after
        return m.group(1) + after + m.group(3)

    content = re.sub(r'(style=")([^"]*?)(")', replace_inline, content)
    content = re.sub(r"(style=')([^']*?)(')", replace_inline, content)

    changed = content != original
    if changed:
        open(fp, 'w', encoding='utf-8').write(content)
    return changed, replacements


# ─── Audit post-run : hex terracotta/marron restants ─────────────────────────
def audit(fp: str) -> list[str]:
    """Retourne les hex brownish qui restent dans les contextes CSS."""
    content = open(fp, encoding='utf-8').read()

    # Extraire uniquement les zones CSS (hors script)
    css_zones = []
    css_zones += re.findall(r'<style[^>]*>(.*?)</style>', content, re.DOTALL)
    css_zones += re.findall(r'style="([^"]*?)"', content)

    suspects = []
    KEEP = {
        # DPE
        '#00a651','#55be55','#1a9e5a','#4cb84c','#b5d332','#aad255',
        '#f5c518','#f5a818','#e05a1a','#cc1a1a',
        # Succès
        '#2e7d32','#e8f5e9','#c8e6c9','#a5d6a7','#27ae60','#059669',
        '#ecfdf5','#a7f3d0','#4caf50','#22c55e','#16a34a','#1b6b35',
        '#2a6b3e','#2a7a47','#15803d','#166534','#1b5e20','#065f46',
        '#f0fdf4','#f0fff4','#d1fae5','#dcfce7','#c8e6d4','#25d366',
        # Teal non-vert
        '#80cbc4','#00796b',
        # Palettes légitimes (post-remplacement)
        # (aucun hex palette ne devrait rester — c'est le but)
    }

    for zone in css_zones:
        hexes = re.findall(r'#[0-9A-Fa-f]{6}', zone)
        for h in hexes:
            hl = h.lower()
            if hl in KEEP:
                continue
            r = int(hl[1:3],16); g = int(hl[3:5],16); b = int(hl[5:7],16)
            # brownish/terracotta: R dominant, non-blanc, non-gris
            if r > g + 15 and r > b + 15 and r < 245 and not (r > 200 and g > 180 and b > 180):
                suspects.append(hl)
    return sorted(set(suspects))


# ─── Main ────────────────────────────────────────────────────────────────────
files = sorted(glob.glob(os.path.join(SELLER_DIR, '*.html')))

print("=== Remplacement ===")
total_changed = 0
for fp in files:
    changed, n = process_file(fp)
    name = os.path.basename(fp)
    if changed:
        print(f"  ✓ {name}  ({n} zones modifiées)")
        total_changed += 1
    else:
        print(f"  — {name}  (aucun changement)")

print(f"\n{total_changed}/{len(files)} fichiers modifiés.")

print("\n=== Audit post-run : hex terracotta/marron restants dans CSS ===")
any_suspect = False
for fp in files:
    suspects = audit(fp)
    if suspects:
        any_suspect = True
        print(f"  {os.path.basename(fp)}: {suspects}")

if not any_suspect:
    print("  ✓ Aucun hex terracotta/marron en dehors des variables.")
