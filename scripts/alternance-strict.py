#!/usr/bin/env python3
"""
Alternance stricte blanc/terracotta.
1. Supprime cmp2-banner (bandeau blanc dans compare-table)
2. Réordonne: simulator→fears→testimonials→founders→pricing→faq
3. Rend testimonials visibles
4. Corrige TOUTES les couleurs (CSS + HTML inline) pour chaque section qui change de fond
"""

with open('/Users/brieuxmatthias/serenis-app/public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()
original = content

# ═══════════════════════════════════════════════════════════════════
# 1. SUPPRIMER cmp2-banner (le bloc blanc "12 500 €" + bouton)
# ═══════════════════════════════════════════════════════════════════
banner_start = '\n\n    <div class="cmp2-banner reveal">'
idx_b = content.find(banner_start)
if idx_b != -1:
    idx_sec_end = content.find('\n\n  </section>', idx_b)
    content = content[:idx_b] + content[idx_sec_end:]
    print("✓ cmp2-banner supprimé")
else:
    print("⚠ cmp2-banner non trouvé")

# ═══════════════════════════════════════════════════════════════════
# 2. RÉORDONNANCEMENT DES SECTIONS
#    Avant : testimonials → tarifs → fondateurs → fears → faq
#    Après : fears → testimonials → fondateurs → tarifs → faq
# ═══════════════════════════════════════════════════════════════════
TEMOIGNAGES = '\n\n  <!-- ─── TÉMOIGNAGES'
TARIFS      = '\n\n  <!-- ─── TARIFS'
FONDATEURS  = '\n\n  <!-- ─── FONDATEURS'
PEURS       = '\n\n  <!-- ─── 3 PEURS DES VENDEURS'
FAQ_M       = '\n\n  <!-- ─── FAQ'
CTA_M       = '\n\n  <!-- ─── CTA BANDE'

idx_start = content.find(TEMOIGNAGES)
idx_cta   = content.find(CTA_M)

if idx_start != -1 and idx_cta != -1:
    middle = content[idx_start:idx_cta]

    def get_sec(text, m1, m2):
        i1 = text.find(m1)
        i2 = text.find(m2, i1 + 1) if m2 else len(text)
        return text[i1:i2]

    s_temoignages = get_sec(middle, TEMOIGNAGES, TARIFS)
    s_tarifs      = get_sec(middle, TARIFS,      FONDATEURS)
    s_fondateurs  = get_sec(middle, FONDATEURS,  PEURS)
    s_peurs       = get_sec(middle, PEURS,        FAQ_M)
    s_faq         = get_sec(middle, FAQ_M,         None)

    new_middle = s_peurs + s_temoignages + s_fondateurs + s_tarifs + s_faq
    content = content[:idx_start] + new_middle + content[idx_cta:]
    print("✓ Sections réordonnées")
else:
    print("⚠ Marqueurs de sections non trouvés")

# ═══════════════════════════════════════════════════════════════════
# 3. TESTIMONIALS — rendre visible
# ═══════════════════════════════════════════════════════════════════
content = content.replace(
    '<section class="testimonials" id="temoignages" style="display:none" aria-label="Témoignages clients">',
    '<section class="testimonials" id="temoignages" aria-label="Témoignages clients">'
)

# ═══════════════════════════════════════════════════════════════════
# 4. CSS — SIMULATEUR (terra → BLANC)
# ═══════════════════════════════════════════════════════════════════
content = content.replace(
    '    .simulator {\n      background: #9E3A18;\n      color: var(--cream);',
    '    .simulator {\n      background: #FFFFFF;\n      color: var(--charcoal);'
)
content = content.replace(
    '    .simulator .section-eyebrow { color: rgba(245,242,237,0.65); }',
    '    .simulator .section-eyebrow { color: #9E3A18; }'
)
content = content.replace(
    '    .simulator .section-title { color: #FFFFFF; }',
    '    .simulator .section-title { color: #9E3A18; }'
)
content = content.replace(
    '    .sim-price-label {\n      font-size: 0.75rem;\n      font-weight: 600;\n      color: rgba(245,242,237,0.65);',
    '    .sim-price-label {\n      font-size: 0.75rem;\n      font-weight: 600;\n      color: rgba(158,58,24,0.7);'
)
content = content.replace(
    '    .sim-price-display {\n      font-family: var(--font-serif);\n      font-size: clamp(2.6rem, 6vw, 4rem);\n      font-weight: 700;\n      color: var(--cream);',
    '    .sim-price-display {\n      font-family: var(--font-serif);\n      font-size: clamp(2.6rem, 6vw, 4rem);\n      font-weight: 700;\n      color: #9E3A18;'
)
# Slider track
content = content.replace(
    'background: linear-gradient(to right, #FFFFFF 0%, #FFFFFF var(--pct, 22%), rgba(245,242,237,0.3) var(--pct, 22%), rgba(245,242,237,0.3) 100%);',
    'background: linear-gradient(to right, #9E3A18 0%, #9E3A18 var(--pct, 22%), rgba(158,58,24,0.15) var(--pct, 22%), rgba(158,58,24,0.15) 100%);'
)
# Slider thumb webkit
content = content.replace(
    '      background: #F5F2ED;\n      border: 3px solid #9E3A18;\n      box-shadow: 0 2px 10px rgba(0,0,0,0.2);\n      cursor: pointer;\n    }\n    .sim-slider::-moz-range-thumb {',
    '      background: #9E3A18;\n      border: 3px solid #FFFFFF;\n      box-shadow: 0 2px 10px rgba(158,58,24,0.25);\n      cursor: pointer;\n    }\n    .sim-slider::-moz-range-thumb {'
)
# Slider thumb moz
content = content.replace(
    '      background: #F5F2ED;\n      border: 3px solid #9E3A18;\n      box-shadow: 0 2px 10px rgba(0,0,0,0.2);\n      cursor: pointer;\n    }\n    .sim-range-labels {',
    '      background: #9E3A18;\n      border: 3px solid #FFFFFF;\n      box-shadow: 0 2px 10px rgba(158,58,24,0.25);\n      cursor: pointer;\n    }\n    .sim-range-labels {'
)
# Range labels
content = content.replace(
    '      color: rgba(245,242,237,0.6);\n      margin-bottom: 28px;\n    }\n    .sim-results {',
    '      color: rgba(158,58,24,0.5);\n      margin-bottom: 28px;\n    }\n    .sim-results {'
)
# Agency column (left — agence)
content = content.replace(
    '      background: rgba(245,242,237,0.12);\n      border: 1px solid rgba(245,242,237,0.25);\n      border-right: none;\n      border-bottom: none;\n      border-radius: 16px 0 0 0;',
    '      background: rgba(158,58,24,0.05);\n      border: 1px solid rgba(158,58,24,0.18);\n      border-right: none;\n      border-bottom: none;\n      border-radius: 16px 0 0 0;'
)
# VPM column (right — terracotta card)
content = content.replace(
    '      background: #FFFFFF;\n      border-radius: 0 16px 0 0;\n    }\n    .sim-result-col.vs-col {',
    '      background: #9E3A18;\n      border-radius: 0 16px 0 0;\n    }\n    .sim-result-col.vs-col {'
)
# VS column
content = content.replace(
    '      color: rgba(245,242,237,0.6);\n      padding: 0 10px;\n      background: rgba(245,242,237,0.1);\n      border-top: 1px solid rgba(245,242,237,0.1);',
    '      color: rgba(158,58,24,0.5);\n      padding: 0 10px;\n      background: rgba(158,58,24,0.04);\n      border-top: 1px solid rgba(158,58,24,0.08);'
)
content = content.replace(
    '    .sim-result-col.agency .sim-result-label { color: rgba(245,242,237,0.65); }',
    '    .sim-result-col.agency .sim-result-label { color: rgba(158,58,24,0.65); }'
)
content = content.replace(
    '    .sim-result-col.vpm-col .sim-result-label { color: rgba(158,58,24,0.7); }',
    '    .sim-result-col.vpm-col .sim-result-label { color: rgba(245,242,237,0.75); }'
)
content = content.replace(
    '    .sim-result-col.agency .sim-result-amount { color: var(--cream); }',
    '    .sim-result-col.agency .sim-result-amount { color: #9E3A18; }'
)
content = content.replace(
    '    .sim-result-col.vpm-col .sim-result-amount { color: #9E3A18; }',
    '    .sim-result-col.vpm-col .sim-result-amount { color: #FFFFFF; }'
)
content = content.replace(
    '    .sim-result-col.agency .sim-result-sub { color: rgba(245,242,237,0.55); }',
    '    .sim-result-col.agency .sim-result-sub { color: rgba(158,58,24,0.6); }'
)
content = content.replace(
    '    .sim-result-col.vpm-col .sim-result-sub { color: rgba(158,58,24,0.6); }',
    '    .sim-result-col.vpm-col .sim-result-sub { color: rgba(245,242,237,0.7); }'
)
# Bar save
content = content.replace(
    '      background: #FFFFFF;\n      transition: width 0.35s ease;\n      position: relative;\n    }\n    .sim-bar-cost {',
    '      background: #9E3A18;\n      transition: width 0.35s ease;\n      position: relative;\n    }\n    .sim-bar-cost {'
)
# Bar cost
content = content.replace(
    '      background: rgba(245,242,237,0.25);\n      flex: 1;\n    }\n    .sim-bar-labels {',
    '      background: rgba(158,58,24,0.12);\n      flex: 1;\n    }\n    .sim-bar-labels {'
)
# Bar labels
content = content.replace(
    '      color: rgba(245,242,237,0.6);\n      text-transform: uppercase;\n      letter-spacing: 0.1em;\n      margin-bottom: 16px;\n    }\n    .sim-bar-labels span:first-child {',
    '      color: rgba(158,58,24,0.5);\n      text-transform: uppercase;\n      letter-spacing: 0.1em;\n      margin-bottom: 16px;\n    }\n    .sim-bar-labels span:first-child {'
)
content = content.replace(
    '    .sim-bar-labels span:first-child { color: #FFFFFF; font-weight: 700; }',
    '    .sim-bar-labels span:first-child { color: #9E3A18; font-weight: 700; }'
)
# Savings banner — terra pour contraster avec fond blanc
content = content.replace(
    '    .sim-savings-banner {\n      background: #FFFFFF;',
    '    .sim-savings-banner {\n      background: #9E3A18;'
)
content = content.replace(
    '      color: rgba(158,58,24,0.7);\n      margin-bottom: 4px;\n    }\n    .sim-savings-amount {',
    '      color: rgba(245,242,237,0.7);\n      margin-bottom: 4px;\n    }\n    .sim-savings-amount {'
)
content = content.replace(
    '      color: #9E3A18;\n      line-height: 1;\n    }\n    .sim-cta-btn {',
    '      color: #FFFFFF;\n      line-height: 1;\n    }\n    .sim-cta-btn {'
)
# CTA button dans savings-banner : fond terra → crème
content = content.replace(
    '    .sim-cta-btn {\n      background: #9E3A18;\n      color: #F5F2ED;',
    '    .sim-cta-btn {\n      background: #F5F2ED;\n      color: #9E3A18;'
)
content = content.replace(
    '    .sim-cta-btn:hover { background: #7A2E12; transform: translateY(-1px); }',
    '    .sim-cta-btn:hover { background: #FFFFFF; transform: translateY(-1px); }'
)
# Mobile: agency border
content = content.replace(
    '      .sim-result-col.agency { border-radius: 16px 16px 0 0; border-right: 1px solid rgba(245,242,237,0.2); border-bottom: none; }',
    '      .sim-result-col.agency { border-radius: 16px 16px 0 0; border-right: 1px solid rgba(158,58,24,0.15); border-bottom: none; }'
)

# ═══════════════════════════════════════════════════════════════════
# 4b. HTML INLINE — SIMULATEUR (intro paragraph cream → terra)
# ═══════════════════════════════════════════════════════════════════
content = content.replace(
    'style="font-size:0.95rem;color:rgba(245,242,237,0.75);margin:0 auto 36px;max-width:520px;line-height:1.75;" class="reveal">\n        Faites glisser le curseur',
    'style="font-size:0.95rem;color:rgba(158,58,24,0.65);margin:0 auto 36px;max-width:520px;line-height:1.75;" class="reveal">\n        Faites glisser le curseur'
)

# ═══════════════════════════════════════════════════════════════════
# 5. CSS — FEARS (blanc → TERRA)
# ═══════════════════════════════════════════════════════════════════
content = content.replace(
    '    .fears {\n      background: #FFFFFF;\n      color: var(--charcoal);',
    '    .fears {\n      background: #9E3A18;\n      color: var(--cream);'
)
content = content.replace(
    '    .fears .section-eyebrow { color: #9E3A18; }',
    '    .fears .section-eyebrow { color: rgba(245,242,237,0.65); }'
)
# Cards → blanc sur fond terra
content = content.replace(
    '    .fear-card {\n      background: rgba(158,58,24,0.05);\n      border: 1px solid rgba(158,58,24,0.14);',
    '    .fear-card {\n      background: #FFFFFF;\n      border: 1px solid rgba(255,255,255,0.12);'
)
content = content.replace(
    '    .fear-card:hover { background: rgba(158,58,24,0.09); }',
    '    .fear-card:hover { background: rgba(255,255,255,0.97); }'
)

# ═══════════════════════════════════════════════════════════════════
# 5b. HTML INLINE — FEARS (titre + span + intro)
# ═══════════════════════════════════════════════════════════════════
content = content.replace(
    '<h2 class="section-title reveal" style="color:var(--charcoal);">\n        On a les réponses à <span style="color:#9E3A18;">vos questions</span>.',
    '<h2 class="section-title reveal" style="color:#FFFFFF;">\n        On a les réponses à <span style="color:rgba(245,242,237,0.85);">vos questions</span>.'
)
content = content.replace(
    'style="font-size:0.95rem;color:#5A2812;max-width:540px;margin:0 0 3rem;line-height:1.75;" class="reveal">\n        Voici ce que se disent',
    'style="font-size:0.95rem;color:rgba(245,242,237,0.75);max-width:540px;margin:0 0 3rem;line-height:1.75;" class="reveal">\n        Voici ce que se disent'
)

# ═══════════════════════════════════════════════════════════════════
# 6. CSS — TESTIMONIALS (terra → BLANC)
# ═══════════════════════════════════════════════════════════════════
content = content.replace(
    '    .testimonials {\n      background: #9E3A18;\n      color: var(--cream);',
    '    .testimonials {\n      background: #FFFFFF;\n      color: var(--charcoal);'
)
content = content.replace(
    '    .testimonials .section-eyebrow { color: rgba(245,242,237,0.65); }',
    '    .testimonials .section-eyebrow { color: #9E3A18; }'
)
content = content.replace(
    '    .testimonials .section-title { color: var(--cream); }',
    '    .testimonials .section-title { color: var(--charcoal); }'
)
# Cards — border visible sur blanc
content = content.replace(
    '      background: #FFFFFF; border: 1px solid rgba(255,255,255,0.85);\n      border-radius: 16px; padding: 26px 22px;\n      display: flex; flex-direction: column; gap: 13px;\n    }\n    .testi-card.testi-featured {',
    '      background: #FFFFFF; border: 1px solid rgba(158,58,24,0.12);\n      border-radius: 16px; padding: 26px 22px;\n      display: flex; flex-direction: column; gap: 13px;\n    }\n    .testi-card.testi-featured {'
)
content = content.replace(
    '    .testi-card.testi-featured { background: #FFFFFF; border-color: rgba(255,255,255,0.85); }',
    '    .testi-card.testi-featured { background: #FFFFFF; border-color: rgba(158,58,24,0.22); }'
)
# Stats bar — fond terra → fond blanc teinté
content = content.replace(
    '      background: rgba(245,242,237,0.15); border-radius: 14px; border: 1px solid rgba(245,242,237,0.2);\n    }',
    '      background: rgba(158,58,24,0.05); border-radius: 14px; border: 1px solid rgba(158,58,24,0.12);\n    }'
)
# Stat numbers : blanc → terra
content = content.replace(
    '      font-weight: 700; color: #FFFFFF; line-height: 1;\n    }\n    .testi-stat-l {',
    '      font-weight: 700; color: #9E3A18; line-height: 1;\n    }\n    .testi-stat-l {'
)
# Stat labels : crème → terra teinté
content = content.replace(
    '      font-size: 0.68rem; color: rgba(245,242,237,0.65);\n      text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px;\n    }',
    '      font-size: 0.68rem; color: rgba(158,58,24,0.6);\n      text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px;\n    }'
)

# ═══════════════════════════════════════════════════════════════════
# 6b. HTML INLINE — TESTIMONIALS (intro paragraph crème → terra)
# ═══════════════════════════════════════════════════════════════════
content = content.replace(
    'style="font-size:0.95rem;color:rgba(245,242,237,0.75);max-width:460px;margin:0 0 40px;line-height:1.75;" class="reveal">\n        Des particuliers comme vous',
    'style="font-size:0.95rem;color:rgba(158,58,24,0.65);max-width:460px;margin:0 0 40px;line-height:1.75;" class="reveal">\n        Des particuliers comme vous'
)

# ═══════════════════════════════════════════════════════════════════
# 7. CSS — FAQ (blanc → TERRA)
# ═══════════════════════════════════════════════════════════════════
content = content.replace(
    '    .faq {\n      background: #FFFFFF;\n      color: var(--charcoal);',
    '    .faq {\n      background: #9E3A18;\n      color: var(--cream);'
)
content = content.replace(
    '    .faq .section-eyebrow { color: #9E3A18; }',
    '    .faq .section-eyebrow { color: rgba(245,242,237,0.65); }\n    .faq .section-title { color: var(--cream); }'
)
content = content.replace(
    '    .faq-item {\n      border-bottom: 1px solid rgba(158,58,24,0.12);\n    }',
    '    .faq-item {\n      border-bottom: 1px solid rgba(245,242,237,0.15);\n    }'
)
content = content.replace(
    '      background: none; border: none;\n      text-align: left;\n      color: var(--charcoal);\n    }\n    .faq-question p {',
    '      background: none; border: none;\n      text-align: left;\n      color: var(--cream);\n    }\n    .faq-question p {'
)
content = content.replace(
    '    .faq-icon {\n      color: #9E3A18;',
    '    .faq-icon {\n      color: rgba(245,242,237,0.8);'
)
content = content.replace(
    '      font-size: 0.88rem;\n      line-height: 1.8;\n      color: #5A2812;\n    }\n\n    /* ─── CTA bande ─── */',
    '      font-size: 0.88rem;\n      line-height: 1.8;\n      color: rgba(245,242,237,0.85);\n    }\n\n    /* ─── CTA bande ─── */'
)

# ═══════════════════════════════════════════════════════════════════
# 7b. HTML INLINE — FAQ (span "savoir" terra → crème + bouton CTA)
# ═══════════════════════════════════════════════════════════════════
content = content.replace(
    'Tout ce que vous voulez <span style="color:#9E3A18;">savoir</span>.',
    'Tout ce que vous voulez <span style="color:rgba(245,242,237,0.9);">savoir</span>.'
)
# Bouton "Choisir mon pack" à la fin du FAQ : terra sur terra → crème
content = content.replace(
    'onclick="document.getElementById(\'tarifs\').scrollIntoView({behavior:\'smooth\'})">Choisir mon pack →</button>',
    'onclick="document.getElementById(\'tarifs\').scrollIntoView({behavior:\'smooth\'})">Choisir mon pack →</button>',
)
# Plus spécifique : cibler le bouton inline dans la div FAQ CTA
content = content.replace(
    '" onmouseover="this.style.opacity=\'0.85\'" onmouseout="this.style.opacity=\'1\'" onclick="document.getElementById(\'tarifs\').scrollIntoView({behavior:\'smooth\'})">Choisir mon pack →</button>',
    '" onmouseover="this.style.background=\'#FFFFFF\'" onmouseout="this.style.background=\'#F5F2ED\'" onclick="document.getElementById(\'tarifs\').scrollIntoView({behavior:\'smooth\'})">Choisir mon pack →</button>'
)
# Et le background/couleur du bouton lui-même (dans le div de fin de FAQ)
content = content.replace(
    '"background:#9E3A18;color:#F5F2ED;border:none;border-radius:8px;padding:14px 36px;font-size:0.95rem;font-weight:600;font-family:\'DM Sans\',sans-serif;cursor:pointer;letter-spacing:0.03em;transition:opacity .2s;"',
    '"background:#F5F2ED;color:#9E3A18;border:none;border-radius:8px;padding:14px 36px;font-size:0.95rem;font-weight:600;font-family:\'DM Sans\',sans-serif;cursor:pointer;letter-spacing:0.03em;transition:background .2s;"'
)

# ═══════════════════════════════════════════════════════════════════
# 8. CSS — PRICING CARDS (crème → blanc + bordure terra marquée)
# ═══════════════════════════════════════════════════════════════════
content = content.replace(
    '    .pricing-card.featured {\n      background: #F5F2ED;\n      border: 1px solid rgba(158,58,24,0.12);\n      box-shadow: 0 8px 40px rgba(0,0,0,0.15);\n    }',
    '    .pricing-card.featured {\n      background: #FFFFFF;\n      border: 2px solid #9E3A18;\n      box-shadow: 0 8px 40px rgba(158,58,24,0.18);\n    }'
)
content = content.replace(
    '    .pricing-card.standard {\n      background: #F5F2ED;\n      border: 1px solid rgba(158,58,24,0.08);\n      box-shadow: 0 4px 24px rgba(0,0,0,0.10);\n    }',
    '    .pricing-card.standard {\n      background: #FFFFFF;\n      border: 1.5px solid rgba(158,58,24,0.35);\n      box-shadow: 0 4px 24px rgba(0,0,0,0.06);\n    }'
)

# ═══════════════════════════════════════════════════════════════════
# DONE
# ═══════════════════════════════════════════════════════════════════
changed = content != original
print(f"Changed: {changed}")
if changed:
    with open('/Users/brieuxmatthias/serenis-app/public/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Written.")
else:
    print("WARNING: no changes made!")
