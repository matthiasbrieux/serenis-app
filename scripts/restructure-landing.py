#!/usr/bin/env python3
"""Restructure landing page: section IDs, nav anchors, CTAs, fears move."""

with open('/Users/brieuxmatthias/serenis-app/public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

original = content

# ─── 1. CSS: scroll-margin-top for anchored sections ─────────────────────
content = content.replace(
    '    html { scroll-behavior: smooth; }',
    '    html { scroll-behavior: smooth; }\n    section[id] { scroll-margin-top: 72px; }'
)

# ─── 2. Desktop nav: hrefs ────────────────────────────────────────────────
content = content.replace(
    '<li><a href="#benefices">Pourquoi Vendu Par Moi</a></li>\n      <li><a href="#comment-ca-marche">Comment ça marche</a></li>\n      <li><a href="#offres">Tarifs</a></li>',
    '<li><a href="#pourquoi">Pourquoi Vendu Par Moi</a></li>\n      <li><a href="#comment-ca-marche">Comment ça marche</a></li>\n      <li><a href="#tarifs">Tarifs</a></li>'
)

# ─── 3. Desktop nav: button onclick + text ───────────────────────────────
content = content.replace(
    "onclick=\"document.getElementById('offres').scrollIntoView({behavior:'smooth'})\">\n        Démarrer ma vente\n      </button>\n    </div>",
    "onclick=\"document.getElementById('tarifs').scrollIntoView({behavior:'smooth'})\">\n        Choisir mon pack\n      </button>\n    </div>"
)

# ─── 4. Mobile nav: hrefs ─────────────────────────────────────────────────
content = content.replace(
    '<a href="#benefices" class="mobile-link">Pourquoi Vendu Par Moi</a>\n    <a href="#comment-ca-marche" class="mobile-link">Comment ça marche</a>\n    <a href="#offres" class="mobile-link">Tarifs</a>',
    '<a href="#pourquoi" class="mobile-link">Pourquoi Vendu Par Moi</a>\n    <a href="#comment-ca-marche" class="mobile-link">Comment ça marche</a>\n    <a href="#tarifs" class="mobile-link">Tarifs</a>'
)

# ─── 5. Mobile nav: button onclick + text ────────────────────────────────
content = content.replace(
    "onclick=\"document.getElementById('offres').scrollIntoView({behavior:'smooth'})\">\n      Démarrer ma vente\n    </button>\n  </div>",
    "onclick=\"document.getElementById('tarifs').scrollIntoView({behavior:'smooth'})\">\n      Choisir mon pack\n    </button>\n  </div>"
)

# ─── 6. Section IDs ──────────────────────────────────────────────────────
content = content.replace(
    '<section class="benefits" id="benefices"',
    '<section class="benefits" id="pourquoi"'
)
content = content.replace(
    '<section class="simulator" id="simulateur"',
    '<section class="simulator" id="economie"'
)
content = content.replace(
    '<section class="pricing" id="offres"',
    '<section class="pricing" id="tarifs"'
)
content = content.replace(
    '<section class="testimonials" aria-label="Témoignages clients">',
    '<section class="testimonials" id="temoignages" style="display:none" aria-label="Témoignages clients">'
)
content = content.replace(
    '<section class="founders" aria-label="Les fondateurs">',
    '<section class="founders" id="fondateurs" aria-label="Les fondateurs">'
)

# ─── 7. All remaining getElementById('offres') → 'tarifs' ────────────────
content = content.replace(
    "document.getElementById('offres')",
    "document.getElementById('tarifs')"
)

# ─── 8. CTA at end of benefits section ───────────────────────────────────
CTA_BTN = (
    "      <div style=\"text-align:center;margin-top:48px;\" class=\"reveal\">\n"
    "        <button style=\"background:#9E3A18;color:#F5F2ED;border:none;border-radius:8px;"
    "padding:14px 36px;font-size:0.95rem;font-weight:600;font-family:'DM Sans',sans-serif;"
    "cursor:pointer;letter-spacing:0.03em;transition:opacity .2s;\""
    " onmouseover=\"this.style.opacity='0.85'\" onmouseout=\"this.style.opacity='1'\""
    " onclick=\"document.getElementById('comment-ca-marche').scrollIntoView({behavior:'smooth'})\">"
    "Voir comment ça marche →</button>\n"
    "      </div>\n"
)
content = content.replace(
    '      </div>\n    </div>\n  </section>\n\n  <section class="stats"',
    '      </div>\n\n' + CTA_BTN + '    </div>\n  </section>\n\n  <section class="stats"'
)

# ─── 9. CTA at end of how section ────────────────────────────────────────
CTA_BTN_HOW = (
    "      <div style=\"text-align:center;margin-top:48px;\" class=\"reveal\">\n"
    "        <button style=\"background:#9E3A18;color:#F5F2ED;border:none;border-radius:8px;"
    "padding:14px 36px;font-size:0.95rem;font-weight:600;font-family:'DM Sans',sans-serif;"
    "cursor:pointer;letter-spacing:0.03em;transition:opacity .2s;\""
    " onmouseover=\"this.style.opacity='0.85'\" onmouseout=\"this.style.opacity='1'\""
    " onclick=\"document.getElementById('economie').scrollIntoView({behavior:'smooth'})\">"
    "Calculer mon économie →</button>\n"
    "      </div>\n"
)
content = content.replace(
    '      </div>\n    </div>\n  </section>\n\n  <!-- ─── COMPARATIF TABLE',
    '      </div>\n\n' + CTA_BTN_HOW + '    </div>\n  </section>\n\n  <!-- ─── COMPARATIF TABLE'
)

# ─── 10. Move fears section just before FAQ ───────────────────────────────
fears_marker_start = '  <!-- ─── 3 PEURS DES VENDEURS ─── -->'
temoignages_marker = '\n\n  <!-- ─── TÉMOIGNAGES'
faq_comment = '  <!-- ─── FAQ ─── -->'

idx_fears_start = content.index(fears_marker_start)
idx_temoignages = content.index(temoignages_marker, idx_fears_start)

fears_html = content[idx_fears_start:idx_temoignages]

# Remove fears from current position
content = content[:idx_fears_start] + content[idx_temoignages:]

# Insert fears just before FAQ comment (position shifted after removal)
idx_faq = content.index(faq_comment)
content = content[:idx_faq] + fears_html + '\n\n  ' + content[idx_faq:]

# ─── 11. CTA at end of FAQ section ───────────────────────────────────────
CTA_BTN_FAQ = (
    "      <div style=\"text-align:center;margin-top:48px;\" class=\"reveal\">\n"
    "        <button style=\"background:#9E3A18;color:#F5F2ED;border:none;border-radius:8px;"
    "padding:14px 36px;font-size:0.95rem;font-weight:600;font-family:'DM Sans',sans-serif;"
    "cursor:pointer;letter-spacing:0.03em;transition:opacity .2s;\""
    " onmouseover=\"this.style.opacity='0.85'\" onmouseout=\"this.style.opacity='1'\""
    " onclick=\"document.getElementById('tarifs').scrollIntoView({behavior:'smooth'})\">"
    "Choisir mon pack →</button>\n"
    "      </div>\n"
)
content = content.replace(
    '      </div>\n    </div>\n  </section>\n\n  <!-- ─── CTA BANDE',
    '      </div>\n\n' + CTA_BTN_FAQ + '    </div>\n  </section>\n\n  <!-- ─── CTA BANDE'
)

# ─── 12. Footer nav: update all anchors ──────────────────────────────────
content = content.replace(
    '          <li><a href="#benefices">Pourquoi Vendu Par Moi</a></li>\n'
    '          <li><a href="#comment-ca-marche">Comment ça marche</a></li>\n'
    '          <li><a href="#offres">Tarifs</a></li>\n'
    '          <li><a href="#faq">FAQ</a></li>',
    '          <li><a href="#pourquoi">Pourquoi Vendu Par Moi</a></li>\n'
    '          <li><a href="#comment-ca-marche">Comment ça marche</a></li>\n'
    '          <li><a href="#economie">Calculer mon économie</a></li>\n'
    '          <li><a href="#tarifs">Tarifs</a></li>\n'
    '          <li><a href="#fondateurs">Les fondateurs</a></li>\n'
    '          <li><a href="#faq">FAQ</a></li>'
)

# ─── Done ─────────────────────────────────────────────────────────────────
changed = content != original
print(f"Changed: {changed}")
if changed:
    with open('/Users/brieuxmatthias/serenis-app/public/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Written.")
else:
    print("WARNING: no changes made!")
