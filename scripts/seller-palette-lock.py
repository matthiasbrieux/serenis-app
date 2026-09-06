#!/usr/bin/env python3
"""
Remplace les verts décoratifs hardcodés dans les HTML de l'espace vendeur.
NE TOUCHE PAS : DPE (#4CB84C/#1A9E5A/#B5D332/…), succès (#2e7d32/#059669/…).
"""
import re, glob, os

BASE = '/Users/brieuxmatthias/serenis-app/views/seller'
html_files = glob.glob(f'{BASE}/*.html')

# ── 1. Ancienne terracotta inline (palette update) ────────────────────────────
OLD_TERRA = [
    ('#C4785A', '#9E3A18'),
    ('#C4603A', '#9E3A18'),
]

# ── 2. Verts décoratifs → charte ─────────────────────────────────────────────
HEX_MAP = [
    # Très sombres → noir/dark terracotta
    ('#0C1910', '#1C0804'),
    ('#0F1E13', '#1C0804'),
    ('#1e3028', '#3D1008'),
    ('#1E3028', '#3D1008'),
    ('#1E3D29', '#3D1008'),
    ('#1e3d29', '#3D1008'),
    ('#243d2c', '#3D1008'),
    ('#243D2C', '#3D1008'),
    ('#1D3A28', '#5C1F0A'),
    ('#1d3a28', '#5C1F0A'),
    ('#2D4D38', '#5C1F0A'),
    ('#2d4d38', '#5C1F0A'),
    ('#2d4435', '#5C1F0A'),
    ('#2D4435', '#5C1F0A'),
    ('#2e4435', '#5C1F0A'),
    ('#2E4435', '#5C1F0A'),
    ('#28523a', '#7A2B12'),
    ('#28523A', '#7A2B12'),

    # Verts principaux → terracotta
    ('#3D5A47', '#9E3A18'),
    ('#3d5a47', '#9E3A18'),
    ('#3D6B4A', '#9E3A18'),
    ('#3d6b4a', '#9E3A18'),
    ('#3D8B5E', '#9E3A18'),
    ('#3d8b5e', '#9E3A18'),
    ('#4a6e55', '#7A2B12'),
    ('#4A6E55', '#7A2B12'),
    ('#4d7a58', '#7A2B12'),
    ('#4D7A58', '#7A2B12'),
    ('#4a7a5a', '#7A2B12'),
    ('#4A7A5A', '#7A2B12'),
    ('#4a8a5a', '#7A2B12'),
    ('#4A8A5A', '#7A2B12'),
    ('#4A6B56', '#7A2B12'),
    ('#4a6b56', '#7A2B12'),
    ('#5a8a6a', '#7A2B12'),
    ('#5A8A6A', '#7A2B12'),
    ('#5a8c6a', '#7A2B12'),
    ('#5A8C6A', '#7A2B12'),
    ('#5A7462', '#7A2B12'),
    ('#5a7462', '#7A2B12'),
    ('#5A7A62', '#7A2B12'),
    ('#5a7a62', '#7A2B12'),
    ('#5A6E5F', '#9E3A18'),
    ('#5a6e5f', '#9E3A18'),
    ('#5a7a65', '#9E3A18'),
    ('#5A7A65', '#9E3A18'),
    ('#5C7A65', '#9E3A18'),
    ('#5c7a65', '#9E3A18'),
    ('#6a9870', '#9E3A18'),
    ('#6A9870', '#9E3A18'),
    ('#6A8A74', '#9E3A18'),
    ('#6a8a74', '#9E3A18'),
    ('#6aa882', '#C4785A'),   # muted warm (texte sur fond clair)
    ('#6AA882', '#C4785A'),
    ('#6aab7a', '#C4785A'),
    ('#6AAB7A', '#C4785A'),
    ('#72956E', '#9E3A18'),
    ('#72956e', '#9E3A18'),

    # Accents verts clairs → sable-doré (accent sur fond sombre)
    ('#82D49A', '#E8C39E'),
    ('#82d49a', '#E8C39E'),
    ('#4DAF6A', '#9E3A18'),
    ('#4daf6a', '#9E3A18'),
    ('#4D9B60', '#9E3A18'),
    ('#4d9b60', '#9E3A18'),
    ('#6BBF82', '#E8C39E'),
    ('#6bbf82', '#E8C39E'),
    ('#7EC99A', '#E8C39E'),
    ('#7ec99a', '#E8C39E'),
    ('#A8D4B5', '#E8C39E'),
    ('#a8d4b5', '#E8C39E'),
    ('#8aab95', '#B08070'),   # muted done-state text
    ('#8AAB95', '#B08070'),

    # Tints légers → tints terracotta
    ('#D4E4D8', '#F5E4DC'),
    ('#d4e4d8', '#F5E4DC'),
    ('#D4E8DA', '#F5E4DC'),
    ('#d4e8da', '#F5E4DC'),
    ('#C8DDD0', '#F5E4DC'),
    ('#c8ddd0', '#F5E4DC'),
    ('#C5D9CB', '#F0C8A8'),
    ('#c5d9cb', '#F0C8A8'),
    ('#C4D8CA', '#F5E4DC'),
    ('#c4d8ca', '#F5E4DC'),
    ('#C4DDD0', '#F5E4DC'),
    ('#c4ddd0', '#F5E4DC'),
    ('#C5DDD0', '#F5E4DC'),
    ('#c5ddd0', '#F5E4DC'),
    ('#C8E0D0', '#F5E4DC'),
    ('#c8e0d0', '#F5E4DC'),
    ('#B8D8C2', '#F5E4DC'),
    ('#b8d8c2', '#F5E4DC'),
    ('#B8E0C4', '#F5E4DC'),
    ('#b8e0c4', '#F5E4DC'),
    ('#A8C8B0', '#F5E4DC'),
    ('#a8c8b0', '#F5E4DC'),
    ('#A8C8B4', '#F5E4DC'),
    ('#a8c8b4', '#F5E4DC'),
    ('#A8C8B8', '#F5E4DC'),
    ('#a8c8b8', '#F5E4DC'),
    ('#A8CEBA', '#F5E4DC'),
    ('#a8ceba', '#F5E4DC'),
    ('#A8CFA9', '#F5E4DC'),
    ('#a8cfa9', '#F5E4DC'),
    ('#A8D5BC', '#F5E4DC'),
    ('#a8d5bc', '#F5E4DC'),
    ('#A8D8BC', '#F5E4DC'),
    ('#a8d8bc', '#F5E4DC'),
    ('#9BB5A2', '#F5E4DC'),
    ('#9bb5a2', '#F5E4DC'),
    ('#9db8a4', '#F5E4DC'),
    ('#9DC4AA', '#F5E4DC'),
    ('#9dc4aa', '#F5E4DC'),
    ('#C8DECE', '#F5E4DC'),
    ('#c8dece', '#F5E4DC'),
    ('#C0DDC9', '#F5E4DC'),
    ('#c0ddc9', '#F5E4DC'),
    ('#CEE4D6', '#F5E4DC'),
    ('#cee4d6', '#F5E4DC'),
    ('#D0E4D8', '#F5E4DC'),
    ('#d0e4d8', '#F5E4DC'),
    ('#D8E8DC', '#F5E4DC'),
    ('#d8e8dc', '#F5E4DC'),
    ('#D8EAE0', '#F5E4DC'),
    ('#d8eae0', '#F5E4DC'),
    ('#D8EDDF', '#F5E4DC'),
    ('#d8eddf', '#F5E4DC'),
    ('#D8EDE0', '#F5E4DC'),
    ('#d8ede0', '#F5E4DC'),
    ('#D8EEDE', '#F5E4DC'),
    ('#d8eede', '#F5E4DC'),
    ('#DDE9E3', '#F5E4DC'),
    ('#dde9e3', '#F5E4DC'),
    ('#DFE9E1', '#F5E4DC'),
    ('#dfe9e1', '#F5E4DC'),
    ('#DFF0E5', '#FBF0EB'),
    ('#dff0e5', '#FBF0EB'),
    ('#DFF0E8', '#FBF0EB'),
    ('#dff0e8', '#FBF0EB'),
    ('#E0EDE5', '#FBF0EB'),
    ('#e0ede5', '#FBF0EB'),
    ('#E0EAE3', '#FBF0EB'),
    ('#e0eae3', '#FBF0EB'),
    ('#E0F0E8', '#FBF0EB'),
    ('#e0f0e8', '#FBF0EB'),
    ('#E2EDE7', '#FBF0EB'),
    ('#e2ede7', '#FBF0EB'),
    ('#E4F0E8', '#FBF0EB'),
    ('#e4f0e8', '#FBF0EB'),
    ('#E8F2EC', '#FBF0EB'),
    ('#e8f2ec', '#FBF0EB'),
    ('#E8F4EC', '#FBF0EB'),
    ('#e8f4ec', '#FBF0EB'),
    ('#E8F4EE', '#FBF0EB'),
    ('#e8f4ee', '#FBF0EB'),
    ('#E8F5EB', '#FBF0EB'),
    ('#e8f5eb', '#FBF0EB'),
    ('#E8F5ED', '#FBF0EB'),
    ('#e8f5ed', '#FBF0EB'),
    ('#E8F0E8', '#FBF0EB'),
    ('#e8f0e8', '#FBF0EB'),
    ('#E8F0E9', '#FBF0EB'),
    ('#e8f0e9', '#FBF0EB'),
    ('#EAF1EB', '#FBF0EB'),
    ('#eaf1eb', '#FBF0EB'),
    ('#EAF3ED', '#FBF0EB'),
    ('#eaf3ed', '#FBF0EB'),
    ('#EAF4EE', '#FBF0EB'),
    ('#eaf4ee', '#FBF0EB'),
    ('#EAF5EC', '#FBF0EB'),
    ('#eaf5ec', '#FBF0EB'),
    ('#EBF3EE', '#FBF0EB'),
    ('#ebf3ee', '#FBF0EB'),
    ('#EDF4EF', '#FBF0EB'),
    ('#edf4ef', '#FBF0EB'),
    ('#EDF5F0', '#FBF0EB'),
    ('#edf5f0', '#FBF0EB'),
    ('#EDF5EF', '#FBF0EB'),
    ('#edf5ef', '#FBF0EB'),
    ('#EDF7F1', '#FBF0EB'),
    ('#edf7f1', '#FBF0EB'),
    ('#EEF6F0', '#FBF0EB'),
    ('#eef6f0', '#FBF0EB'),
    ('#EEF7F0', '#FBF0EB'),
    ('#eef7f0', '#FBF0EB'),
    ('#EEF9F1', '#FBF0EB'),
    ('#eef9f1', '#FBF0EB'),
    ('#EFF6F2', '#FBF0EB'),
    ('#eff6f2', '#FBF0EB'),
    ('#F0F5F1', '#FBF0EB'),
    ('#f0f5f1', '#FBF0EB'),
    ('#F0F5F1', '#FBF0EB'),
    ('#F0F7F2', '#FDF4F0'),
    ('#f0f7f2', '#FDF4F0'),
    ('#F0F7F5', '#FDF4F0'),
    ('#f0f7f5', '#FDF4F0'),
    ('#F0F8F2', '#FDF4F0'),
    ('#f0f8f2', '#FDF4F0'),
    ('#F0FA F4', '#FDF4F0'),
    ('#F0FAF4', '#FDF4F0'),
    ('#f0faf4', '#FDF4F0'),
    ('#F3F8F4', '#FDF4F0'),
    ('#f3f8f4', '#FDF4F0'),
    ('#F4F6F4', '#FDF4F0'),
    ('#f4f6f4', '#FDF4F0'),
    ('#F4F9F5', '#FDF4F0'),
    ('#f4f9f5', '#FDF4F0'),
    ('#F4F9F6', '#FDF4F0'),
    ('#f4f9f6', '#FDF4F0'),
    ('#F4FBF6', '#FDF4F0'),
    ('#f4fbf6', '#FDF4F0'),
    ('#F5F9F6', '#FDF4F0'),
    ('#f5f9f6', '#FDF4F0'),
    ('#F5FAF6', '#FDF4F0'),
    ('#f5faf6', '#FDF4F0'),
    ('#F5FAF7', '#FDF4F0'),
    ('#f5faf7', '#FDF4F0'),
    ('#F5FCF6', '#FDF4F0'),
    ('#f5fcf6', '#FDF4F0'),
    ('#F6FAF7', '#FDF4F0'),
    ('#f6faf7', '#FDF4F0'),
    ('#F6FBF7', '#FDF4F0'),
    ('#f6fbf7', '#FDF4F0'),
    ('#F7FAF8', '#FDF4F0'),
    ('#f7faf8', '#FDF4F0'),
    ('#F7FBF8', '#FDF4F0'),
    ('#f7fbf8', '#FDF4F0'),
    ('#F7FCF9', '#FDF4F0'),
    ('#f7fcf9', '#FDF4F0'),
    ('#F7FDF8', '#FDF4F0'),
    ('#f7fdf8', '#FDF4F0'),
    ('#F8FCF9', '#FDF4F0'),
    ('#f8fcf9', '#FDF4F0'),
    ('#F8FDF9', '#FDF4F0'),
    ('#f8fdf9', '#FDF4F0'),
    ('#F8FFFE', '#FDF4F0'),
    ('#f8fffe', '#FDF4F0'),
    ('#FAFCFB', '#FDF4F0'),
    ('#fafcfb', '#FDF4F0'),
    ('#FAFFFE', '#FDF4F0'),
    ('#fafffe', '#FDF4F0'),
]

# ── 3. rgba verts → rgba terracotta / sable-doré ─────────────────────────────
RGBA_SUBS = [
    # vert principal → terracotta
    (re.compile(r'rgba\(\s*61\s*,\s*90\s*,\s*71\s*,\s*([0-9.]+)\s*\)'),
     lambda m: f'rgba(158,58,24,{m.group(1)})'),
    # rgba(40,82,58) → terracotta
    (re.compile(r'rgba\(\s*40\s*,\s*82\s*,\s*58\s*,\s*([0-9.]+)\s*\)'),
     lambda m: f'rgba(158,58,24,{m.group(1)})'),
    # rgba(91,155,107) → terracotta
    (re.compile(r'rgba\(\s*91\s*,\s*155\s*,\s*107\s*,\s*([0-9.]+)\s*\)'),
     lambda m: f'rgba(158,58,24,{m.group(1)})'),
    # rgba(77,155,96) → terracotta
    (re.compile(r'rgba\(\s*77\s*,\s*155\s*,\s*96\s*,\s*([0-9.]+)\s*\)'),
     lambda m: f'rgba(158,58,24,{m.group(1)})'),
    # rgba(29,58,40) (#1D3A28) → dark terracotta
    (re.compile(r'rgba\(\s*29\s*,\s*58\s*,\s*40\s*,\s*([0-9.]+)\s*\)'),
     lambda m: f'rgba(92,31,10,{m.group(1)})'),
    # rgba(168,212,181) (#A8D4B5) → sable-doré
    (re.compile(r'rgba\(\s*168\s*,\s*212\s*,\s*181\s*,\s*([0-9.]+)\s*\)'),
     lambda m: f'rgba(232,195,158,{m.group(1)})'),
    # rgba(107,191,130) (#6BBF82) → sable-doré
    (re.compile(r'rgba\(\s*107\s*,\s*191\s*,\s*130\s*,\s*([0-9.]+)\s*\)'),
     lambda m: f'rgba(232,195,158,{m.group(1)})'),
    # ancienne terracotta rgba → nouvelle terracotta
    (re.compile(r'rgba\(\s*196\s*,\s*120\s*,\s*90\s*,\s*([0-9.]+)\s*\)'),
     lambda m: f'rgba(158,58,24,{m.group(1)})'),
]

total_changed = 0

for fpath in sorted(html_files):
    with open(fpath, 'r', encoding='utf-8') as f:
        original = f.read()
    content = original

    # Ancienne terracotta
    for old, new in OLD_TERRA:
        content = content.replace(old, new)

    # Verts décoratifs hex
    for old, new in HEX_MAP:
        content = content.replace(old, new)

    # rgba
    for pattern, replacer in RGBA_SUBS:
        content = pattern.sub(replacer, content)

    if content != original:
        total_changed += 1
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ {os.path.basename(fpath)}")
    else:
        print(f"  {os.path.basename(fpath)} — no change")

print(f"\nFichiers modifiés : {total_changed}/{len(html_files)}")

# ── Vérification : verts suspects restants ────────────────────────────────────
KEEP = {
    '#00A651','#55BE55','#50B739','#9DCB3B','#4CB84C','#1A9E5A','#B5D332',
    '#27AE60','#2E7D32','#059059','#059669','#4CAF50','#22C55E','#16A34A',
    '#1B6B35','#1B5E20','#15803D','#166534','#256628','#1A9E5A',
    '#2A6B3E','#2A6E3A','#2A7A47','#065F46',
    '#25D366',
    '#E8F5E9','#ECFDF5','#A7F3D0','#C8E6C9','#D1FAE5','#DCFCE7',
}

all_content = ''
for fpath in html_files:
    with open(fpath) as f:
        all_content += f.read()

all_hex = re.findall(r'#[0-9A-Fa-f]{6}', all_content)
from collections import Counter
counts = Counter(h.upper() for h in all_hex)

print("\n── Verts suspects restants ──")
found_any = False
for h, n in counts.most_common():
    r, g, b = int(h[1:3],16), int(h[3:5],16), int(h[5:7],16)
    if g > r and g > b and g > 80 and h not in KEEP:
        print(f"  {h} — {n} occ")
        found_any = True
if not found_any:
    print("  Aucun vert décoratif détecté.")
