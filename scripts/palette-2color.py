#!/usr/bin/env python3
"""2-color palette: #FFFFFF and #9E3A18 as section backgrounds."""

with open('/Users/brieuxmatthias/serenis-app/public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

original = content

# ─── COMPARE-TABLE (cream #F5F2ED → terra #9E3A18) ───────────────────────

content = content.replace(
    '    .compare-table-section {\n      background: #F5F2ED;\n      color: var(--charcoal);\n      padding: var(--section-py) var(--section-px);\n    }',
    '    .compare-table-section {\n      background: #9E3A18;\n      color: var(--cream);\n      padding: var(--section-py) var(--section-px);\n    }'
)
content = content.replace(
    '    .compare-table-section .section-eyebrow { color: var(--terra-dark); }',
    '    .compare-table-section .section-eyebrow { color: rgba(245,242,237,0.65); }'
)
content = content.replace(
    '    .compare-table-section .section-title { color: var(--charcoal); }',
    '    .compare-table-section .section-title { color: var(--cream); }'
)
content = content.replace(
    '    .cmp2-th-blank { background: #EDE8E1; }',
    '    .cmp2-th-blank { background: rgba(245,242,237,0.1); }'
)
content = content.replace(
    '    .cmp2-th-vpm {\n      background: #9E3A18;\n      color: #F5F2ED;',
    '    .cmp2-th-vpm {\n      background: #FFFFFF;\n      color: #9E3A18;'
)
content = content.replace(
    '    .cmp2-th-agence {\n      background: #DDD7CF;\n      color: #888;',
    '    .cmp2-th-agence {\n      background: rgba(245,242,237,0.15);\n      color: rgba(245,242,237,0.65);'
)
content = content.replace(
    '      color: var(--charcoal);\n      background: #FDFAF7;\n      display: flex; align-items: center;\n      border-bottom: 1px solid #EDE8E1;\n    }',
    '      color: var(--cream);\n      background: rgba(245,242,237,0.1);\n      display: flex; align-items: center;\n      border-bottom: 1px solid rgba(245,242,237,0.1);\n    }'
)
content = content.replace(
    '    .cmp2-vpm {\n      background: #9E3A18;\n      padding: 16px 18px;',
    '    .cmp2-vpm {\n      background: #FFFFFF;\n      padding: 16px 18px;'
)
content = content.replace(
    '    .cmp2-age {\n      background: #EDE8E1;\n      padding: 16px 18px;\n      display: flex; align-items: center; justify-content: center;\n      text-align: center;\n      border-bottom: 1px solid #E5DED3;\n    }',
    '    .cmp2-age {\n      background: rgba(245,242,237,0.15);\n      padding: 16px 18px;\n      display: flex; align-items: center; justify-content: center;\n      text-align: center;\n      border-bottom: 1px solid rgba(245,242,237,0.1);\n    }'
)
content = content.replace(
    '      color: #F5F2ED; line-height: 1.45;\n    }\n    .cmp2-yes-chk {',
    '      color: #9E3A18; line-height: 1.45;\n    }\n    .cmp2-yes-chk {'
)
content = content.replace(
    '      background: rgba(255,255,255,0.22);\n      display: flex; align-items: center; justify-content: center;\n      font-size: 0.65rem; flex-shrink: 0; margin-top: 1px;\n    }',
    '      background: rgba(158,58,24,0.12);\n      display: flex; align-items: center; justify-content: center;\n      font-size: 0.65rem; flex-shrink: 0; margin-top: 1px;\n    }'
)
content = content.replace(
    '      font-size: 0.82rem; color: #888; line-height: 1.45;\n    }',
    '      font-size: 0.82rem; color: rgba(245,242,237,0.65); line-height: 1.45;\n    }'
)
content = content.replace(
    '      background: rgba(0,0,0,0.07); color: #bbb;\n',
    '      background: rgba(245,242,237,0.12); color: rgba(245,242,237,0.55);\n'
)
content = content.replace(
    '    .cmp2-pap {\n      background: #EDE8E1;\n      border-left: 3px solid #B8A898;',
    '    .cmp2-pap {\n      background: rgba(245,242,237,0.12);\n      border-left: 3px solid rgba(245,242,237,0.4);'
)
content = content.replace(
    '      color: var(--charcoal); margin-bottom: 6px;\n    }\n    .cmp2-pap-body {',
    '      color: var(--cream); margin-bottom: 6px;\n    }\n    .cmp2-pap-body {'
)
content = content.replace(
    '    .cmp2-pap-body { font-size: 0.84rem; line-height: 1.75; color: #6B4C3A; }',
    '    .cmp2-pap-body { font-size: 0.84rem; line-height: 1.75; color: rgba(245,242,237,0.75); }'
)
content = content.replace(
    '    .cmp2-banner {\n      background: #9E3A18;\n      border-radius: 14px;',
    '    .cmp2-banner {\n      background: #FFFFFF;\n      border-radius: 14px;'
)
content = content.replace(
    '    .cmp2-banner-label { font-size: 0.8rem; color: rgba(245,242,237,0.65); margin-bottom: 4px; }',
    '    .cmp2-banner-label { font-size: 0.8rem; color: rgba(158,58,24,0.7); margin-bottom: 4px; }'
)
content = content.replace(
    '      color: #F5F2ED; line-height: 1;\n    }\n    .cmp2-banner-source {',
    '      color: #9E3A18; line-height: 1;\n    }\n    .cmp2-banner-source {'
)
content = content.replace(
    '    .cmp2-banner-source { font-size: 0.68rem; color: rgba(245,242,237,0.45); margin-top: 5px; }',
    '    .cmp2-banner-source { font-size: 0.68rem; color: rgba(158,58,24,0.5); margin-top: 5px; }'
)
content = content.replace(
    '    .cmp2-banner-btn {\n      background: #F5F2ED; color: #9E3A18;',
    '    .cmp2-banner-btn {\n      background: #9E3A18; color: #F5F2ED;'
)
content = content.replace(
    '    .cmp2-banner-btn:hover { background: #EDE8E1; }',
    '    .cmp2-banner-btn:hover { background: #7A2E12; }'
)
# mobile responsive border
content = content.replace(
    '      .cmp2-label { border-bottom: 1px solid #EDE8E1; font-size: 0.9rem; }',
    '      .cmp2-label { border-bottom: 1px solid rgba(245,242,237,0.15); font-size: 0.9rem; }'
)
# HTML: compare-table intro color + h2 em color
content = content.replace(
    '<p style="font-size:0.95rem;color:#5A2812;max-width:520px;margin:0 0 36px;line-height:1.75;" class="reveal">\n        Une agence prend 4',
    '<p style="font-size:0.95rem;color:rgba(245,242,237,0.75);max-width:520px;margin:0 0 36px;line-height:1.75;" class="reveal">\n        Une agence prend 4'
)
content = content.replace(
    '<em style="color:var(--terra-dark);font-style:italic;font-weight:400">Ce que vous gardez avec nous.</em>',
    '<em style="color:rgba(245,242,237,0.85);font-style:italic;font-weight:400">Ce que vous gardez avec nous.</em>'
)

# ─── SIMULATOR (cream #F5F2ED → terra #9E3A18) ───────────────────────────

content = content.replace(
    '    .simulator {\n      background: #F5F2ED;\n      color: #9E3A18;',
    '    .simulator {\n      background: #9E3A18;\n      color: var(--cream);'
)
content = content.replace(
    '    .simulator .section-eyebrow { color: var(--terra-dark); }',
    '    .simulator .section-eyebrow { color: rgba(245,242,237,0.65); }'
)
content = content.replace(
    '    .simulator .section-title { color: var(--charcoal); }',
    '    .simulator .section-title { color: var(--cream); }'
)
content = content.replace(
    '      color: var(--stone);\n      text-transform: uppercase;\n      letter-spacing: 0.12em;\n      margin-bottom: 10px;\n    }',
    '      color: rgba(245,242,237,0.65);\n      text-transform: uppercase;\n      letter-spacing: 0.12em;\n      margin-bottom: 10px;\n    }'
)
content = content.replace(
    '      color: #9E3A18;\n      line-height: 1;\n      margin-bottom: 20px;\n    }',
    '      color: var(--cream);\n      line-height: 1;\n      margin-bottom: 20px;\n    }'
)
content = content.replace(
    '      background: linear-gradient(to right, #9E3A18 0%, #9E3A18 var(--pct, 22%), #E5DED3 var(--pct, 22%), #E5DED3 100%);',
    '      background: linear-gradient(to right, #FFFFFF 0%, #FFFFFF var(--pct, 22%), rgba(245,242,237,0.3) var(--pct, 22%), rgba(245,242,237,0.3) 100%);'
)
content = content.replace(
    '      background: #9E3A18;\n      border: 3px solid #F5F2ED;\n      box-shadow: 0 2px 10px rgba(158,58,24,0.3);\n      cursor: pointer;\n    }\n    .sim-slider::-moz-range-thumb {',
    '      background: #F5F2ED;\n      border: 3px solid #9E3A18;\n      box-shadow: 0 2px 10px rgba(0,0,0,0.2);\n      cursor: pointer;\n    }\n    .sim-slider::-moz-range-thumb {'
)
content = content.replace(
    '      background: #9E3A18;\n      border: 3px solid #F5F2ED;\n      box-shadow: 0 2px 10px rgba(158,58,24,0.3);\n      cursor: pointer;\n    }\n    .sim-range-labels {',
    '      background: #F5F2ED;\n      border: 3px solid #9E3A18;\n      box-shadow: 0 2px 10px rgba(0,0,0,0.2);\n      cursor: pointer;\n    }\n    .sim-range-labels {'
)
content = content.replace(
    '      font-size: 0.7rem;\n      color: var(--stone);\n      margin-bottom: 28px;\n    }',
    '      font-size: 0.7rem;\n      color: rgba(245,242,237,0.6);\n      margin-bottom: 28px;\n    }'
)
content = content.replace(
    '    .sim-result-col.agency {\n      background: rgba(158,58,24,0.06);\n      border: 1px solid rgba(158,58,24,0.14);\n      border-right: none;\n      border-bottom: none;\n      border-radius: 16px 0 0 0;\n    }',
    '    .sim-result-col.agency {\n      background: rgba(245,242,237,0.12);\n      border: 1px solid rgba(245,242,237,0.25);\n      border-right: none;\n      border-bottom: none;\n      border-radius: 16px 0 0 0;\n    }'
)
content = content.replace(
    '    .sim-result-col.vpm-col {\n      background: #9E3A18;\n      border-radius: 0 16px 0 0;\n    }',
    '    .sim-result-col.vpm-col {\n      background: #FFFFFF;\n      border-radius: 0 16px 0 0;\n    }'
)
content = content.replace(
    '      color: var(--stone);\n      padding: 0 10px;\n      background: #EAE5DE;\n      border-top: 1px solid #EAE5DE;\n    }',
    '      color: rgba(245,242,237,0.6);\n      padding: 0 10px;\n      background: rgba(245,242,237,0.1);\n      border-top: 1px solid rgba(245,242,237,0.1);\n    }'
)
content = content.replace(
    '    .sim-result-col.agency .sim-result-label { color: rgba(158,58,24,0.7); }',
    '    .sim-result-col.agency .sim-result-label { color: rgba(245,242,237,0.65); }'
)
content = content.replace(
    '    .sim-result-col.vpm-col .sim-result-label { color: rgba(245,242,237,0.75); }',
    '    .sim-result-col.vpm-col .sim-result-label { color: rgba(158,58,24,0.7); }'
)
content = content.replace(
    '    .sim-result-col.agency .sim-result-amount { color: #9E3A18; }',
    '    .sim-result-col.agency .sim-result-amount { color: var(--cream); }'
)
content = content.replace(
    '    .sim-result-col.vpm-col .sim-result-amount { color: #F5F2ED; }',
    '    .sim-result-col.vpm-col .sim-result-amount { color: #9E3A18; }'
)
content = content.replace(
    '    .sim-result-col.agency .sim-result-sub { color: var(--stone); }',
    '    .sim-result-col.agency .sim-result-sub { color: rgba(245,242,237,0.55); }'
)
content = content.replace(
    '    .sim-result-col.vpm-col .sim-result-sub { color: rgba(245,242,237,0.55); }',
    '    .sim-result-col.vpm-col .sim-result-sub { color: rgba(158,58,24,0.6); }'
)
content = content.replace(
    '    .sim-bar-save {\n      background: #9E3A18;\n      transition: width 0.35s ease;',
    '    .sim-bar-save {\n      background: #FFFFFF;\n      transition: width 0.35s ease;'
)
content = content.replace(
    '    .sim-bar-cost {\n      background: #E5DED3;\n      flex: 1;\n    }',
    '    .sim-bar-cost {\n      background: rgba(245,242,237,0.25);\n      flex: 1;\n    }'
)
content = content.replace(
    '      color: var(--stone);\n      text-transform: uppercase;\n      letter-spacing: 0.1em;\n      margin-bottom: 16px;\n    }\n    .sim-bar-labels span:first-child { color: #9E3A18;',
    '      color: rgba(245,242,237,0.6);\n      text-transform: uppercase;\n      letter-spacing: 0.1em;\n      margin-bottom: 16px;\n    }\n    .sim-bar-labels span:first-child { color: #FFFFFF;'
)
content = content.replace(
    '    .sim-savings-banner {\n      background: #9E3A18;\n      border-radius: 0 0 16px 16px;',
    '    .sim-savings-banner {\n      background: #FFFFFF;\n      border-radius: 0 0 16px 16px;'
)
content = content.replace(
    '      color: rgba(245,242,237,0.75);\n      margin-bottom: 4px;\n    }\n    .sim-savings-amount {',
    '      color: rgba(158,58,24,0.7);\n      margin-bottom: 4px;\n    }\n    .sim-savings-amount {'
)
content = content.replace(
    '      color: #F5F2ED;\n      line-height: 1;\n    }\n    .sim-cta-btn {',
    '      color: #9E3A18;\n      line-height: 1;\n    }\n    .sim-cta-btn {'
)
content = content.replace(
    '    .sim-cta-btn {\n      background: #F5F2ED;\n      color: #9E3A18;',
    '    .sim-cta-btn {\n      background: #9E3A18;\n      color: #F5F2ED;'
)
content = content.replace(
    '    .sim-cta-btn:hover { background: #EAE5DE; transform: translateY(-1px); }',
    '    .sim-cta-btn:hover { background: #7A2E12; transform: translateY(-1px); }'
)
# mobile
content = content.replace(
    '      .sim-result-col.agency { border-radius: 16px 16px 0 0; border-right: 1px solid rgba(158,58,24,0.15); border-bottom: none; }',
    '      .sim-result-col.agency { border-radius: 16px 16px 0 0; border-right: 1px solid rgba(245,242,237,0.2); border-bottom: none; }'
)
# HTML inline: simulator intro
content = content.replace(
    '<p style="font-size:0.95rem;color:#5A2812;margin:0 auto 36px;max-width:520px;line-height:1.75;" class="reveal">',
    '<p style="font-size:0.95rem;color:rgba(245,242,237,0.75);margin:0 auto 36px;max-width:520px;line-height:1.75;" class="reveal">'
)

# ─── FEARS (terra #9E3A18 → blanc #FFFFFF) ────────────────────────────────

content = content.replace(
    '    .fears {\n      background: #9E3A18;\n      color: var(--cream);',
    '    .fears {\n      background: #FFFFFF;\n      color: var(--charcoal);'
)
content = content.replace(
    '    .fears .section-eyebrow { color: rgba(245,242,237,0.65); }',
    '    .fears .section-eyebrow { color: #9E3A18; }'
)
content = content.replace(
    '    .fear-card {\n      background: rgba(245,242,237,0.14);\n      border: 1px solid rgba(245,242,237,0.30);\n      border-radius: 16px;\n      padding: 32px 26px;\n      display: flex;\n      flex-direction: column;\n      gap: 14px;\n      transition: background 0.2s;\n    }\n    .fear-card:hover { background: rgba(245,242,237,0.20); }',
    '    .fear-card {\n      background: rgba(158,58,24,0.05);\n      border: 1px solid rgba(158,58,24,0.14);\n      border-radius: 16px;\n      padding: 32px 26px;\n      display: flex;\n      flex-direction: column;\n      gap: 14px;\n      transition: background 0.2s;\n    }\n    .fear-card:hover { background: rgba(158,58,24,0.09); }'
)
content = content.replace(
    '      color: #F5F2ED;\n      line-height: 1.4;\n      padding-bottom: 14px;\n      border-bottom: 1px solid rgba(245,242,237,0.15);\n    }',
    '      color: var(--charcoal);\n      line-height: 1.4;\n      padding-bottom: 14px;\n      border-bottom: 1px solid rgba(158,58,24,0.12);\n    }'
)
content = content.replace(
    '      color: rgba(245,242,237,0.80);\n      font-weight: 700;\n    }',
    '      color: #9E3A18;\n      font-weight: 700;\n    }'
)
content = content.replace(
    '      color: rgba(245,242,237,0.90);\n      flex: 1;\n    }',
    '      color: #5A2812;\n      flex: 1;\n    }'
)
content = content.replace(
    '      background: rgba(245,242,237,0.12);\n      border: 1px solid rgba(245,242,237,0.35);\n      border-radius: 20px;\n      padding: 5px 13px;\n      font-size: 0.71rem;\n      color: #F5F2ED;\n      font-weight: 600;\n      align-self: flex-start;\n    }',
    '      background: rgba(158,58,24,0.08);\n      border: 1px solid rgba(158,58,24,0.25);\n      border-radius: 20px;\n      padding: 5px 13px;\n      font-size: 0.71rem;\n      color: #9E3A18;\n      font-weight: 600;\n      align-self: flex-start;\n    }'
)
# HTML: fears h2 and intro
content = content.replace(
    '      <h2 class="section-title reveal" style="color:#F5F2ED;">',
    '      <h2 class="section-title reveal" style="color:var(--charcoal);">'
)
content = content.replace(
    '<p style="font-size:0.95rem;color:rgba(245,242,237,0.75);max-width:540px;margin:0 0 3rem;line-height:1.75;" class="reveal">',
    '<p style="font-size:0.95rem;color:#5A2812;max-width:540px;margin:0 0 3rem;line-height:1.75;" class="reveal">'
)
# HTML: fear icon strokes
content = content.replace('stroke="rgba(245,242,237,0.85)"', 'stroke="#9E3A18"')

# ─── TESTIMONIALS (cream #F5F2ED → terra #9E3A18) ─────────────────────────

content = content.replace(
    '    .testimonials {\n      background: #F5F2ED;\n      color: #9E3A18;',
    '    .testimonials {\n      background: #9E3A18;\n      color: var(--cream);'
)
content = content.replace(
    '    .testimonials .section-eyebrow { color: var(--terra-dark); }',
    '    .testimonials .section-eyebrow { color: rgba(245,242,237,0.65); }'
)
content = content.replace(
    '    .testimonials .section-title { color: var(--charcoal); }',
    '    .testimonials .section-title { color: var(--cream); }'
)
content = content.replace(
    '    .testi-card {\n      background: #F5F2ED; border: 1px solid #EAE5DE;\n      border-radius: 16px; padding: 26px 22px;\n      display: flex; flex-direction: column; gap: 13px;\n    }\n    .testi-card.testi-featured { background: #F5F2ED; border-color: #EAE5DE; }',
    '    .testi-card {\n      background: #FFFFFF; border: 1px solid rgba(255,255,255,0.85);\n      border-radius: 16px; padding: 26px 22px;\n      display: flex; flex-direction: column; gap: 13px;\n    }\n    .testi-card.testi-featured { background: #FFFFFF; border-color: rgba(255,255,255,0.85); }'
)
content = content.replace(
    '      font-weight: 700; color: var(--green-dark);\n    }\n    .testi-card.testi-featured .testi-eco-amt { color: var(--green-dark); }',
    '      font-weight: 700; color: #9E3A18;\n    }\n    .testi-card.testi-featured .testi-eco-amt { color: #9E3A18; }'
)
content = content.replace(
    '      background: #E5DED3; border-radius: 14px; border: 1px solid #E5DED3;\n    }',
    '      background: rgba(245,242,237,0.15); border-radius: 14px; border: 1px solid rgba(245,242,237,0.2);\n    }'
)
content = content.replace(
    '      font-weight: 700; color: var(--green-dark); line-height: 1;\n    }',
    '      font-weight: 700; color: #FFFFFF; line-height: 1;\n    }'
)
content = content.replace(
    '      font-size: 0.68rem; color: #999;\n      text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px;\n    }',
    '      font-size: 0.68rem; color: rgba(245,242,237,0.65);\n      text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px;\n    }'
)
# HTML: testimonials intro
content = content.replace(
    '<p style="font-size:0.95rem;color:#5A2812;max-width:460px;margin:0 0 40px;line-height:1.75;" class="reveal">',
    '<p style="font-size:0.95rem;color:rgba(245,242,237,0.75);max-width:460px;margin:0 0 40px;line-height:1.75;" class="reveal">'
)

# ─── FOUNDERS (sand #E5DED3 → blanc #FFFFFF) ─────────────────────────────

content = content.replace(
    '    .founders {\n      background: #E5DED3;\n      color: #9E3A18;',
    '    .founders {\n      background: #FFFFFF;\n      color: var(--charcoal);'
)
content = content.replace(
    '      background: linear-gradient(135deg, var(--green-dark), var(--green-mid));\n      display: flex; align-items: center; justify-content: center;\n      font-family: var(--font-serif); font-size: 1.65rem;\n      color: var(--cream); font-weight: 700; flex-shrink: 0;\n      border: 2px solid rgba(158,58,24,0.25);',
    '      background: #9E3A18;\n      display: flex; align-items: center; justify-content: center;\n      font-family: var(--font-serif); font-size: 1.65rem;\n      color: var(--cream); font-weight: 700; flex-shrink: 0;\n      border: 2px solid rgba(158,58,24,0.25);'
)
content = content.replace(
    '    .founder-role-lbl {\n      font-size: 0.67rem; color: var(--green-mid); font-weight: 600;',
    '    .founder-role-lbl {\n      font-size: 0.67rem; color: #9E3A18; font-weight: 600;'
)
content = content.replace(
    '      color: var(--green-dark); font-weight: 700; line-height: 1;\n    }\n    .founder-stat-l {',
    '      color: #9E3A18; font-weight: 700; line-height: 1;\n    }\n    .founder-stat-l {'
)

# ─── FAQ (terra #9E3A18 → blanc #FFFFFF) ─────────────────────────────────

content = content.replace(
    '    .faq {\n      background: #9E3A18;\n      color: var(--ivory);',
    '    .faq {\n      background: #FFFFFF;\n      color: var(--charcoal);'
)
content = content.replace(
    '    .faq .section-eyebrow { color: rgba(245,242,237,0.65); }',
    '    .faq .section-eyebrow { color: #9E3A18; }'
)
content = content.replace(
    '    .faq-item {\n      border-bottom: 1px solid rgba(245,242,237,0.09);\n    }',
    '    .faq-item {\n      border-bottom: 1px solid rgba(158,58,24,0.12);\n    }'
)
content = content.replace(
    '      text-align: left;\n      color: var(--cream);\n    }\n    .faq-question p {',
    '      text-align: left;\n      color: var(--charcoal);\n    }\n    .faq-question p {'
)
content = content.replace(
    '    .faq-icon {\n      color: rgba(245,242,237,0.55);',
    '    .faq-icon {\n      color: #9E3A18;'
)
content = content.replace(
    '      color: rgba(245,242,237,0.52);\n    }\n\n    /* ─── CTA bande',
    '      color: #5A2812;\n    }\n\n    /* ─── CTA bande'
)

# ─── Verify and write ────────────────────────────────────────────────────

changed = content != original
print(f"File changed: {changed}")
if changed:
    with open('/Users/brieuxmatthias/serenis-app/public/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Written successfully.")
else:
    print("WARNING: No changes were made!")
