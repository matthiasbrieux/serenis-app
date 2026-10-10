/* Lesson 2.2 — personalised diagnostics table */
(() => {
  "use strict";

  const DIAG_ROWS = [
    { key: "dpe",          name: "DPE — Diagnostic de Performance Énergétique", cond: "Toujours obligatoire",                               valid: "10 ans" },
    { key: "erp",          name: "État des risques et pollutions (ERP)",               cond: "Toujours obligatoire",                               valid: "6 mois" },
    { key: "amiante",      name: "Diagnostic amiante",                                     cond: "Construction avant 1997",                            valid: "Illimitée si négatif" },
    { key: "plomb",        name: "Diagnostic plomb (CREP)",                                cond: "Construction avant 1949",                            valid: "1 an si positif" },
    { key: "electricite",  name: "Diagnostic électricité",                        cond: "Installation > 15 ans",                         valid: "3 ans" },
    { key: "gaz",          name: "Diagnostic gaz",                                         cond: "Installation > 15 ans",                         valid: "3 ans" },
    { key: "carrez",       name: "Mesurage Loi Carrez",                                    cond: "Appartement en copropriété uniquement",     valid: "Permanent" },
    { key: "assainissement", name: null, cond: "Assainissement individuel (fosse, micro-station…)", valid: "3 ans (variable)" }
  ];

  const SVG_CHECK = "<svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"20 6 9 17 4 12\"/></svg>";
  const SVG_CLOCK = "<svg width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><polyline points=\"12 6 12 12 16 14\"/></svg>";
  const SVG_MINUS = "<svg width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"/></svg>";
  const SVG_HOME = "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/><polyline points=\"9 22 9 12 15 12 15 22\"/></svg>";
  const SVG_EDIT = "<svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\"/><path d=\"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z\"/></svg>";
  const SVG_INFO = "<svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"12\"/><line x1=\"12\" y1=\"16\" x2=\"12.01\" y2=\"16\"/></svg>";

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function hasGaz(p) {
    if (!p) return false;
    if (p.facture_gaz > 0) return true;
    if (p.heating_type && /\bgaz\b/i.test(p.heating_type)) return true;
    if (p.heating_mechanism && /\bgaz\b/i.test(p.heating_mechanism)) return true;
    return false;
  }

  function noGazExplicit(p) {
    if (!p || hasGaz(p)) return false;
    if (p.heating_type && /electr|pompe\s*a|pac|bois|pellet|fuel|fioul|charbon|solaire/i.test(p.heating_type)) return true;
    return false;
  }

  function classify(property) {
    const p = property || {};
    const type = String(p.type || "").trim();
    const year = p.year_built ? Number(p.year_built) : null;
    const isApartment = /appartement/i.test(type);
    const isMaison = /maison/i.test(type);
    const assain = String(p.assainissement_type || "").trim();
    const isIndividuel = /fosse|micro.station|individuel/i.test(assain);
    const isCollectif = /collectif|r.seau|tout..\s*l.egout|égout/i.test(assain);

    return {
      dpe:            "prevoir",
      erp:            "prevoir",
      amiante:        year === null ? "verifier" : (year < 1997 ? "prevoir" : "nc"),
      plomb:          year === null ? "verifier" : (year < 1949 ? "prevoir" : "nc"),
      electricite:    "verifier",
      gaz:            hasGaz(p) ? "verifier" : (noGazExplicit(p) ? "nc" : "verifier"),
      carrez:         isMaison ? "nc" : (isApartment ? "verifier" : "verifier"),
      assainissement: isIndividuel ? "prevoir" : (isCollectif ? "nc" : "verifier")
    };
  }

  function badge(status) {
    if (status === "prevoir")  return "<span class=\"diag-badge diag-badge-prevoir\">" + SVG_CHECK + " À prévoir</span>";
    if (status === "verifier") return "<span class=\"diag-badge diag-badge-verifier\">" + SVG_CLOCK + " À vérifier</span>";
    return "<span class=\"diag-badge diag-badge-nc\">" + SVG_MINUS + " Non concerné</span>";
  }

  function buildTable(property) {
    const statuses = classify(property);
    let rows = "";
    DIAG_ROWS.forEach(function(row) {
      const st = statuses[row.key] || "verifier";
      const isNc = st === "nc";
      const rowCls = isNc ? " diag-row-nc" : "";
      let nameCell;
      if (row.key === "assainissement") {
        nameCell = "<span class=\"fiche-link\" data-fiche=\"assainissement\">Contrôle Assainissement</span> "
          + SVG_INFO.replace("width=\"14\"", "width=\"12\"").replace("height=\"14\"", "height=\"12\"");
      } else {
        nameCell = esc(row.name);
      }
      rows += "<tr class=\"diag-row" + rowCls + "\" data-diag-key=\"" + row.key + "\">"
        + "<td class=\"diag-td-name\">" + nameCell + "</td>"
        + "<td class=\"diag-td-cond\">" + esc(row.cond) + "</td>"
        + "<td class=\"diag-td-valid\">" + esc(row.valid) + "</td>"
        + "<td class=\"diag-td-status\">" + badge(st) + "</td>"
        + "</tr>";
    });
    return "<div class=\"diag-table-wrap\"><table class=\"diag-table\">"
      + "<thead><tr>"
      + "<th>Diagnostic</th>"
      + "<th>Condition</th>"
      + "<th>Validité</th>"
      + "<th>Pour votre bien</th>"
      + "</tr></thead>"
      + "<tbody>" + rows + "</tbody>"
      + "</table></div>";
  }

  function buildBanner(property) {
    const p = property || {};
    const pills = [];
    const missing = [];

    if (p.type) pills.push(esc(p.type));
    else missing.push("type de bien");

    if (p.year_built) {
      const accord = /maison/i.test(p.type || "") ? "construite" : "construit";
      pills.push(accord + " en " + esc(String(p.year_built)));
    } else {
      missing.push("année de construction");
    }

    if (noGazExplicit(p)) pills.push("Sans installation de gaz");
    else if (hasGaz(p)) pills.push("Avec installation de gaz");

    const pillHtml = pills.length
      ? "<div class=\"diag-context-pill\">" + SVG_HOME.replace("width=\"18\"", "width=\"13\"").replace("height=\"18\"", "height=\"13\"") + " " + pills.join(" · ") + "</div>"
      : "<div class=\"diag-context-pill\" style=\"opacity:.6\">Caractéristiques non renseignées</div>";

    const noteHtml = "<p class=\"diag-context-note\">Les indications ci-dessous sont adaptées aux informations renseignées dans votre fiche descriptive. Vérifiez que celle-ci est complète et à jour.</p>";

    const missingNote = missing.length
      ? "<div class=\"diag-context-missing\">" + SVG_INFO.replace("width=\"14\"", "width=\"12\"").replace("height=\"14\"", "height=\"12\"")
        + " Renseignez " + missing.join(" et ") + " dans Mon bien pour affiner les statuts.</div>"
      : "";

    return "<div class=\"diag-context-wrap\">"
      + "<div class=\"diag-context-header\">"
      + "<div class=\"diag-context-left\">"
      + "<div class=\"diag-context-icon\">" + SVG_HOME + "</div>"
      + "<div class=\"diag-context-info\">" + pillHtml + noteHtml + "</div>"
      + "</div>"
      + "<a href=\"/mon-bien\" class=\"diag-context-btn\">" + SVG_EDIT + " Modifier les caractéristiques de mon bien</a>"
      + "</div>"
      + "<div class=\"diag-toggle-row\">"
      + "<span class=\"diag-toggle-label\">Afficher tous les diagnostics</span>"
      + "<div class=\"diag-toggle-right\">"
      + "<label class=\"diag-toggle-switch\">"
      + "<input type=\"checkbox\" id=\"diag-toggle-all\" checked>"
      + "<span class=\"diag-toggle-track\"></span>"
      + "</label>"
      + "<span class=\"diag-toggle-info\" title=\"Lorsque désactivé, les diagnostics Non concernés s'affichent de façon atténuée mais restent lisibles.\">" + SVG_INFO + "</span>"
      + "</div>"
      + "</div>"
      + missingNote
      + "</div>";
  }

  function wireToggle(container) {
    var chk = container.querySelector("#diag-toggle-all");
    if (!chk) return;
    function applyToggle() {
      var showAll = chk.checked;
      var ncRows = container.querySelectorAll(".diag-row-nc");
      ncRows.forEach(function(row) {
        if (showAll) row.classList.remove("diag-nc-dimmed");
        else row.classList.add("diag-nc-dimmed");
      });
    }
    chk.addEventListener("change", applyToggle);
    applyToggle();
  }

  function render(diagSection, property) {
    var banner = diagSection.querySelector("[data-diag-banner]");
    var tableSlot = diagSection.querySelector("[data-diag-table]");
    if (banner) banner.innerHTML = buildBanner(property);
    if (tableSlot) {
      tableSlot.innerHTML = buildTable(property);
      tableSlot.removeAttribute("aria-busy");
      wireToggle(diagSection.closest(".step-body") || document);
      // Re-wire fiche-links inside the new table
      tableSlot.querySelectorAll(".fiche-link[data-fiche]").forEach(function(el) {
        if (!el.dataset.wired) {
          el.dataset.wired = "1";
          el.style.cursor = "pointer";
          el.addEventListener("click", function() {
            var key = el.getAttribute("data-fiche");
            if (window._openFiche) window._openFiche(key);
            else {
              var btn = document.querySelector(".fiche-link[data-fiche='" + key + "']:not([data-wired='1'])");
              if (btn) btn.click();
            }
          });
        }
      });
    }
  }

  window.initDiagnostics = function() {
    var section = document.querySelector("#step-1-1.lesson-selected .diag-context-section");
    if (!section || section.dataset.started) return;
    section.dataset.started = "true";
    fetch("/api/property", { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then(function(r) { return r.ok ? r.json() : { property: null }; })
      .catch(function() { return { property: null }; })
      .then(function(data) { render(section, data && data.property ? data.property : null); });
  };

  var _diagObs = new MutationObserver(function() { window.initDiagnostics(); });
  var _modCont = document.getElementById("modContainer");
  if (_modCont) _diagObs.observe(_modCont, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  window.initDiagnostics();
})();
