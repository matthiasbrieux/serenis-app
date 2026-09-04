#!/usr/bin/env python3
"""Strict 4-color palette lock for index.html.
   Palette: --blanc #FFFFFF · --terracotta #9E3A18 · --sable-dore #E8C39E · --noir #1C0804
"""
import re

with open('/Users/brieuxmatthias/serenis-app/public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

original = content

# ════════════════════════════════════════════════════════════════════════════
# PHASE 1 — Normalise les bases de rgba() parasites
# ════════════════════════════════════════════════════════════════════════════

# rgba crème → rgba blanc
content = re.sub(r'rgba\(245\s*,\s*242\s*,\s*237\s*,', 'rgba(255,255,255,', content)
# rgba lin → rgba blanc
content = re.sub(r'rgba\(229\s*,\s*222\s*,\s*211\s*,', 'rgba(255,255,255,', content)
# rgba(90,40,18) = #5A2812 → rgba noir
content = re.sub(r'rgba\(90\s*,\s*40\s*,\s*18\s*,', 'rgba(28,8,4,', content)
# rgba(80,22,8) terracotta sombre → rgba noir
content = re.sub(r'rgba\(80\s*,\s*22\s*,\s*8\s*,', 'rgba(28,8,4,', content)
# rgba(50,12,4) terracotta très sombre → rgba noir
content = re.sub(r'rgba\(50\s*,\s*12\s*,\s*4\s*,', 'rgba(28,8,4,', content)
# rgba(15,30,19) VESTIGE VERT → rgba noir
content = re.sub(r'rgba\(15\s*,\s*30\s*,\s*19\s*,', 'rgba(28,8,4,', content)
# rgba(12,25,16) VESTIGE VERT → rgba noir
content = re.sub(r'rgba\(12\s*,\s*25\s*,\s*16\s*,', 'rgba(28,8,4,', content)
# quasi-solide terra → solid
content = content.replace('rgba(158,58,24,0.98)', '#9E3A18')

# ════════════════════════════════════════════════════════════════════════════
# PHASE 2 — Normalise hex parasites → hex canonique
# ════════════════════════════════════════════════════════════════════════════

# Crème/beige → blanc
for c in ['#F5F2ED', '#E5DED3', '#EDE8E1', '#EAE5DE']:
    content = content.replace(c, '#FFFFFF')

# Terracotta variantes → #9E3A18
for c in ['#B84520', '#7A2B12', '#7A2E12', '#6A2410']:
    content = content.replace(c, '#9E3A18')

# Brun foncé → noir
for c in ['#5A2812', '#6B3020', '#2C2620', '#2A1006', '#2A1208']:
    content = content.replace(c, '#1C0804')

# ════════════════════════════════════════════════════════════════════════════
# PHASE 3 — Gris neutres UI → rgba(noir, opacité)
# Ciblés précisément par pattern pour éviter les faux positifs
# ════════════════════════════════════════════════════════════════════════════

# CSS rules (style block) : color: #999 / color: #bbb
content = content.replace('color: #999;', 'color: rgba(28,8,4,0.35);')
content = content.replace('color: #bbb;', 'color: rgba(28,8,4,0.18);')

# HTML inline style (callback modal)
content = content.replace('color:#888;', 'color:rgba(28,8,4,0.45);')
content = content.replace('color:#666;', 'color:rgba(28,8,4,0.5);')
content = content.replace('color:#555;', 'color:rgba(28,8,4,0.55);')
content = content.replace('solid #ddd;', 'solid rgba(28,8,4,0.1);')

# JS string contexts
content = content.replace("'#555'", "'rgba(28,8,4,0.55)'")
content = content.replace('"#555"', '"rgba(28,8,4,0.55)"')

# ════════════════════════════════════════════════════════════════════════════
# PHASE 4 — Hex canonique → var() partout sauf dans :root
# (sera réécrit proprement en phase 6)
# Les attributs SVG fill/stroke fonctionnent avec var() en HTML inline SVG
# ════════════════════════════════════════════════════════════════════════════

for old, new in [
    ('#9E3A18', 'var(--terracotta)'),
    ('#FFFFFF', 'var(--blanc)'),
    ('#E8C39E', 'var(--sable-dore)'),
    ('#1C0804', 'var(--noir)'),
]:
    content = content.replace(old, new)

# ════════════════════════════════════════════════════════════════════════════
# PHASE 5 — Remplace les anciennes références var(--X) par les nouvelles
# ════════════════════════════════════════════════════════════════════════════

aliases = [
    ('var(--cream)',        'var(--blanc)'),
    ('var(--ivory)',        'var(--blanc)'),
    ('var(--creme)',        'var(--blanc)'),
    ('var(--beige)',        'var(--blanc)'),
    ('var(--beige-light)',  'var(--blanc)'),
    ('var(--copper)',       'var(--blanc)'),
    ('var(--lin)',          'var(--blanc)'),
    ('var(--charcoal)',     'var(--noir)'),
    ('var(--stone)',        'var(--noir)'),
    ('var(--green-dark)',   'var(--noir)'),
    ('var(--terra)',        'var(--terracotta)'),
    ('var(--terra-dark)',   'var(--terracotta)'),
    ('var(--terra-deep)',   'var(--terracotta)'),
    ('var(--green)',        'var(--terracotta)'),
    ('var(--green-deep)',   'var(--terracotta)'),
    ('var(--green-mid)',    'var(--terracotta)'),
    ('var(--green-accent)', 'var(--terracotta)'),
    ('var(--dark)',         'var(--terracotta)'),
]
for old, new in aliases:
    content = content.replace(old, new)

# ════════════════════════════════════════════════════════════════════════════
# PHASE 6 — Réécrit :root proprement avec les 4 variables + layout
# (écrase les --variable: var(--variable) créés en phase 4)
# ════════════════════════════════════════════════════════════════════════════

NEW_ROOT = """:root {
      /* ── PALETTE : 4 couleurs, 4 variables, rien d'autre ─── */
      --blanc:      #FFFFFF;   /* fond clair · texte sur terracotta */
      --terracotta: #9E3A18;   /* fond terracotta · accents sur blanc */
      --sable-dore: #E8C39E;   /* accent chaud, uniquement sur terracotta */
      --noir:       #1C0804;   /* texte principal sur fond blanc */

      /* ── Layout & typographie ─── */
      --font-serif: 'Cormorant Garamond', Georgia, serif;
      --font-sans:  'DM Sans', system-ui, sans-serif;
      --max-w:      1100px;
      --section-py: clamp(72px, 10vw, 120px);
      --section-px: clamp(20px, 5vw, 48px);
    }"""

content = re.sub(r':root\s*\{[^}]+\}', NEW_ROOT, content, flags=re.DOTALL)

# ════════════════════════════════════════════════════════════════════════════
# Vérification post-remplacement : cherche des restes suspects
# ════════════════════════════════════════════════════════════════════════════

suspects = re.findall(r'#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}(?=[^0-9A-Fa-f])', content)
# Exclure ce qui est dans les définitions :root et dans les attributs SVG légitimes
# (les SVG fill/stroke avec var() sont gérés)
unique_suspects = sorted(set(suspects))
print("Hex restants après traitement:", unique_suspects)

changed = content != original
print(f"\nChanged: {changed}")
if changed:
    with open('/Users/brieuxmatthias/serenis-app/public/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Written.")
else:
    print("WARNING: no changes made!")
