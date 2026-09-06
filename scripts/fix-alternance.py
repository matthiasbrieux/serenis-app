#!/usr/bin/env python3
"""Fix alternance: Pricing blanc, Founders terra."""

with open('/Users/brieuxmatthias/serenis-app/public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

original = content

# ─── PRICING: #9E3A18 → #FFFFFF ──────────────────────────────────────────

# Section bg + base color
content = content.replace(
    '    .pricing {\n      background: #9E3A18;\n      color: var(--ivory);',
    '    .pricing {\n      background: #FFFFFF;\n      color: var(--charcoal);'
)
# Eyebrow
content = content.replace(
    '    .pricing .section-eyebrow { color: rgba(245,242,237,0.65); text-align: center; }',
    '    .pricing .section-eyebrow { color: #9E3A18; text-align: center; }'
)
# Title em (was cream on terra → terra on white)
content = content.replace(
    '    .pricing .section-title em { color: rgba(245,242,237,0.85); font-style: italic; font-weight: 400; }',
    '    .pricing .section-title em { color: var(--terra-dark); font-style: italic; font-weight: 400; }'
)
# Section lead
content = content.replace(
    '    .pricing .section-lead { text-align: center; margin-left: auto; margin-right: auto; color: rgba(245,242,237,0.48); }',
    '    .pricing .section-lead { text-align: center; margin-left: auto; margin-right: auto; color: rgba(90,40,18,0.6); }'
)
# Pricing cards: add border to stand out on white bg
content = content.replace(
    '    .pricing-card.featured {\n      background: #F5F2ED;\n      border: none;\n      box-shadow: 0 8px 40px rgba(0,0,0,0.18);\n    }',
    '    .pricing-card.featured {\n      background: #F5F2ED;\n      border: 1px solid rgba(158,58,24,0.12);\n      box-shadow: 0 8px 40px rgba(0,0,0,0.15);\n    }'
)
content = content.replace(
    '    .pricing-card.standard {\n      background: #F5F2ED;\n      border: none;\n      box-shadow: 0 4px 24px rgba(0,0,0,0.12);\n    }',
    '    .pricing-card.standard {\n      background: #F5F2ED;\n      border: 1px solid rgba(158,58,24,0.08);\n      box-shadow: 0 4px 24px rgba(0,0,0,0.10);\n    }'
)
# Trust items (were cream-tinted on terra → dark on white)
content = content.replace(
    '      color: rgba(245,242,237,0.32);\n    }\n\n    /* ─── FAQ',
    '      color: rgba(90,40,18,0.5);\n    }\n\n    /* ─── FAQ'
)

# HTML inline: pricing callback button (was cream border/text on terra → terra border/text on white)
content = content.replace(
    'style="background:none;border:1.5px solid rgba(245,242,237,0.4);border-radius:10px;color:rgba(245,242,237,0.7);padding:11px 28px;font-size:.88rem;font-weight:600;cursor:pointer;font-family:\'DM Sans\',sans-serif;transition:.2s;" onmouseover="this.style.borderColor=\'rgba(196,120,90,.8)\';this.style.color=\'#9E3A18\'" onmouseout="this.style.borderColor=\'rgba(245,242,237,0.4)\';this.style.color=\'rgba(245,242,237,0.7)\'"',
    'style="background:none;border:1.5px solid rgba(158,58,24,0.3);border-radius:10px;color:rgba(158,58,24,0.7);padding:11px 28px;font-size:.88rem;font-weight:600;cursor:pointer;font-family:\'DM Sans\',sans-serif;transition:.2s;" onmouseover="this.style.borderColor=\'#9E3A18\';this.style.color=\'#9E3A18\'" onmouseout="this.style.borderColor=\'rgba(158,58,24,0.3)\';this.style.color=\'rgba(158,58,24,0.7)\'"'
)

# ─── FOUNDERS: #FFFFFF → #9E3A18 ─────────────────────────────────────────

# Section bg + base color
content = content.replace(
    '    .founders {\n      background: #FFFFFF;\n      color: var(--charcoal);',
    '    .founders {\n      background: #9E3A18;\n      color: var(--cream);'
)
# Eyebrow (was terra-dark → cream-tinted)
content = content.replace(
    '    .founders .section-eyebrow { color: var(--terra-dark); }',
    '    .founders .section-eyebrow { color: rgba(245,242,237,0.65); }'
)
# Title
content = content.replace(
    '    .founders .section-title { color: var(--charcoal); }',
    '    .founders .section-title { color: var(--cream); }'
)
# Founder cards: cream → white (contrast on terra)
content = content.replace(
    '    .founder-card {\n      background: #F5F2ED; border: 1px solid rgba(158,58,24,0.08);',
    '    .founder-card {\n      background: #FFFFFF; border: 1px solid rgba(255,255,255,0.15);'
)
# Founder avatar: terra bg + cream letter → white bg + terra letter
content = content.replace(
    '      background: #9E3A18;\n      display: flex; align-items: center; justify-content: center;\n      font-family: var(--font-serif); font-size: 1.65rem;\n      color: var(--cream); font-weight: 700; flex-shrink: 0;\n      border: 2px solid rgba(158,58,24,0.25);',
    '      background: #FFFFFF;\n      display: flex; align-items: center; justify-content: center;\n      font-family: var(--font-serif); font-size: 1.65rem;\n      color: #9E3A18; font-weight: 700; flex-shrink: 0;\n      border: 2px solid rgba(255,255,255,0.3);'
)
# Founder stats border-top (on white card, keep terra-tinted)
content = content.replace(
    '      padding-top: 14px; border-top: 1px solid rgba(158,58,24,0.08);',
    '      padding-top: 14px; border-top: 1px solid rgba(158,58,24,0.10);'
)
# Founders quote (on terra bg, was dark brown → cream)
content = content.replace(
    '      color: #5A2812; max-width: 580px;\n      margin: 0 auto; line-height: 1.7;',
    '      color: rgba(245,242,237,0.85); max-width: 580px;\n      margin: 0 auto; line-height: 1.7;'
)

# HTML inline: founders h2 em color (was terra-dark → cream on terra bg)
content = content.replace(
    '        <em style="color:var(--terra-dark);font-style:italic;font-weight:400">pour les particuliers.</em>',
    '        <em style="color:rgba(245,242,237,0.85);font-style:italic;font-weight:400">pour les particuliers.</em>'
)
# HTML inline: founders intro text (was dark brown → cream on terra)
content = content.replace(
    '      <p style="font-size:0.95rem;color:#5A2812;max-width:520px;margin:0 0 40px;line-height:1.75;" class="reveal">\n        Nous avons',
    '      <p style="font-size:0.95rem;color:rgba(245,242,237,0.75);max-width:520px;margin:0 0 40px;line-height:1.75;" class="reveal">\n        Nous avons'
)

changed = content != original
print(f"Changed: {changed}")
if changed:
    with open('/Users/brieuxmatthias/serenis-app/public/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Written.")
else:
    print("WARNING: no changes made!")
