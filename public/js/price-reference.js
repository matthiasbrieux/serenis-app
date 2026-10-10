/* Read-only price reference — lesson 1.1 commune stats + lesson 1.2 comparables + benchmarks */
(() => {
  "use strict";
  let result;
  let communeResult;
  const euro = n => new Intl.NumberFormat("fr-FR", {style: "currency", currency: "EUR", maximumFractionDigits: 0}).format(n);
  const fmtDate = s => s.split("-").reverse().join("/");
  function escHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function addrParts(addr) {
    if (!addr || addr.precision === "inconnu" || !addr.label)
      return {street: null, locality: null, commune: false};
    if (addr.precision === "commune")
      return {street: null, locality: addr.label, commune: true};
    const idx = addr.label.lastIndexOf(", ");
    if (idx > 0)
      return {street: addr.label.slice(0, idx), locality: addr.label.slice(idx + 2), commune: false};
    return {street: addr.label, locality: null, commune: false};
  }

  function addrHtml(addr) {
    const p = addrParts(addr);
    if (!p.street && !p.locality)
      return "<span class=\"pr-na-addr\">Adresse non disponible</span>";
    const mainLine = p.street || p.locality;
    const subLine = p.street && p.locality ? p.locality : "";
    const commTag = p.commune ? " <span class=\"pr-addr-comm-tag\">(commune)</span>" : "";
    return "<span class=\"pr-addr-street\">" + escHtml(mainLine) + commTag + "</span>" +
      (subLine ? "<span class=\"pr-addr-locality\">" + escHtml(subLine) + "</span>" : "");
  }

  const I_HOUSE_LG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
  const I_HOUSE_SM = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
  const I_CAL = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
  const I_RESIZE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
  const I_EURO = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
  const I_TAG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`;
  const I_PIN = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
  const I_PIN_SM = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
  const I_DB = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`;
  const I_INFO = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  const I_CALC = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/></svg>`;

  /* ── Commune stats block — lesson 1.1 ── */
  function buildCommuneBlock(data) {
    if (!data || data.status !== "ok") {
      const msg = data ? escHtml(data.message || "Données insuffisantes.") : "Données indisponibles.";
      return "<div class=\"pr-summary-unavail\"><p class=\"pr-summary-msg\">" + msg + "</p></div>";
    }
    const surface = (data.surface != null) ? Number(data.surface) : null;
    const surfaceLbl = surface ? "Soit pour votre bien (" + surface + " m²)" : "Surface non renseignée";
    const fmtPer = d => { if (!d) return ""; const [y,m] = d.split("-"); return (m||"?") + "/" + (y||"?"); };
    const period = data.periodFrom && data.periodTo
      ? fmtPer(data.periodFrom) + " — " + fmtPer(data.periodTo)
      : "";
    const count = data.count || 0;
    const countLabel = count > 1 ? count + " ventes retenues" : count + " vente retenue";
    const I_DOWN = "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"/><polyline points=\"19 12 12 19 5 12\"/></svg>";
    const I_BARS = "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"18\" y1=\"20\" x2=\"18\" y2=\"10\"/><line x1=\"12\" y1=\"20\" x2=\"12\" y2=\"4\"/><line x1=\"6\" y1=\"20\" x2=\"6\" y2=\"14\"/></svg>";
    const I_UP = "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"12\" y1=\"19\" x2=\"12\" y2=\"5\"/><polyline points=\"5 12 12 5 19 12\"/></svg>";
    const I_RULER = "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"4\" y=\"2\" width=\"16\" height=\"20\" rx=\"2\"/><line x1=\"8\" y1=\"6\" x2=\"16\" y2=\"6\"/><line x1=\"8\" y1=\"10\" x2=\"16\" y2=\"10\"/><line x1=\"8\" y1=\"14\" x2=\"12\" y2=\"14\"/><line x1=\"8\" y1=\"18\" x2=\"12\" y2=\"18\"/></svg>";
    const card = (icon, mod, lbl, raw, indic) =>
      "<div class=\"pr-bench-card\">"
      + "<div class=\"pr-bench-card-hdr\">"
      + "<div class=\"pr-bench-card-icon " + mod + "\">" + icon + "</div>"
      + "<span class=\"pr-bench-card-lbl\">" + escHtml(lbl) + "</span>"
      + "</div>"
      + "<div class=\"pr-bench-card-pm2\">" + euro(raw) + "/m²</div>"
      + "<div class=\"pr-bench-card-indic\">"
      + "<div class=\"pr-bench-card-indic-lbl\">" + escHtml(surfaceLbl) + "</div>"
      + "<div class=\"pr-bench-card-indic-val\">" + (indic != null ? "≈ " + euro(indic) : "—") + "</div>"
      + "</div>"
      + "</div>";
    return "<div class=\"pr-commune-wrap\">"
      + "<div class=\"pr-bench-header\">"
      + "<div class=\"pr-bench-icon-box\">" + I_RULER + "</div>"
      + "<div class=\"pr-bench-header-text\">"
      + "<h3 class=\"pr-bench-title\">Le prix au m² dans " + escHtml(data.commune || data.city || "votre commune") + "</h3>"
      + "<p class=\"pr-bench-sub\">Toutes maisons vendues · " + escHtml(countLabel) + (period ? " · " + escHtml(period) : "") + "</p>"
      + "</div>"
      + "</div>"
      + "<div class=\"pr-bench-cards\">"
      + card(I_DOWN, "pr-bench-icon-low", "Prix au m² le plus bas", data.priceMin, data.indicMin)
      + card(I_BARS, "pr-bench-icon-mid", "Prix médian au m²", data.priceMed, data.indicMed)
      + card(I_UP, "pr-bench-icon-high", "Prix au m² le plus haut", data.priceMax, data.indicMax)
      + "</div>"
      + "</div>";
  }

  /* ── Three benchmarks — lesson 1.2 ── */
  function buildBenchmarks(comparables, data) {
    if (!Array.isArray(comparables) || !comparables.length) return "";
    const ratios = comparables.map(c => c.price / c.area);
    const minRaw = Math.min(...ratios);
    const maxRaw = Math.max(...ratios);
    const meanRaw = ratios.reduce((s, r) => s + r, 0) / ratios.length;
    const surface = (data && data.surface != null) ? Number(data.surface) : null;
    const surfaceLbl = surface ? "Soit pour votre bien (" + surface + " m²)" : "Surface non renseignée";
    const I_DOWN = "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"/><polyline points=\"19 12 12 19 5 12\"/></svg>";
    const I_BARS = "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"18\" y1=\"20\" x2=\"18\" y2=\"10\"/><line x1=\"12\" y1=\"20\" x2=\"12\" y2=\"4\"/><line x1=\"6\" y1=\"20\" x2=\"6\" y2=\"14\"/></svg>";
    const I_UP = "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"12\" y1=\"19\" x2=\"12\" y2=\"5\"/><polyline points=\"5 12 12 5 19 12\"/></svg>";
    const I_RULER = "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"4\" y=\"2\" width=\"16\" height=\"20\" rx=\"2\"/><line x1=\"8\" y1=\"6\" x2=\"16\" y2=\"6\"/><line x1=\"8\" y1=\"10\" x2=\"16\" y2=\"10\"/><line x1=\"8\" y1=\"14\" x2=\"12\" y2=\"14\"/><line x1=\"8\" y1=\"18\" x2=\"12\" y2=\"18\"/></svg>";
    const card = (icon, mod, lbl, raw) => {
      const priceDisp = Math.round(raw);
      const indic = surface ? Math.round(raw * surface) : null;
      const indicHtml = indic ? "≈ " + euro(indic) : "—";
      return "<div class=\"pr-bench-card\">"
        + "<div class=\"pr-bench-card-hdr\">"
        + "<div class=\"pr-bench-card-icon " + mod + "\">" + icon + "</div>"
        + "<span class=\"pr-bench-card-lbl\">" + escHtml(lbl) + "</span>"
        + "</div>"
        + "<div class=\"pr-bench-card-pm2\">" + euro(priceDisp) + "/m²</div>"
        + "<div class=\"pr-bench-card-indic\">"
        + "<div class=\"pr-bench-card-indic-lbl\">" + escHtml(surfaceLbl) + "</div>"
        + "<div class=\"pr-bench-card-indic-val\">" + indicHtml + "</div>"
        + "</div>"
        + "</div>";
    };
    return "<div class=\"pr-bench-wrap\">"
      + "<div class=\"pr-bench-header\">"
      + "<div class=\"pr-bench-icon-box\">" + I_RULER + "</div>"
      + "<div class=\"pr-bench-header-text\">"
      + "<h3 class=\"pr-bench-title\">Vos trois repères de prix selon les ventes du secteur</h3>"
      + "<p class=\"pr-bench-sub\">À partir des prix au m² observés autour de votre bien et de la surface habitable renseignée dans Mon bien, voici une fourchette de valeurs indicatives.</p>"
      + "</div>"
      + "</div>"
      + "<div class=\"pr-bench-cards\">"
      + card(I_DOWN, "pr-bench-icon-low", "Prix au m² le plus bas", minRaw)
      + card(I_BARS, "pr-bench-icon-mid", "Prix au m² proche de chez moi", meanRaw)
      + card(I_UP, "pr-bench-icon-high", "Prix au m² le plus haut", maxRaw)
      + "</div>"
      + "</div>";
  }

  function renderComparables(box, comparables, data) {
    const existing = box.querySelector(".pr-comp-wrap");
    if (existing) existing.remove();

    const count = (data && data.count != null) ? data.count : (Array.isArray(comparables) ? comparables.length : 0);
    const radius = data && data.radiusMeters ? data.radiusMeters : null;

    if (!Array.isArray(comparables) || !comparables.length) {
      const msg = data && data.message ? escHtml(data.message) : "Aucune vente comparable disponible pour votre bien.";
      box.insertAdjacentHTML("beforeend", `<div class="pr-comp-wrap"><p class="pr-comp-empty">${msg}</p></div>`);
      return;
    }

    const meanPriceM2Raw = comparables.reduce((sum, c) => sum + c.price / c.area, 0) / comparables.length;
    const meanPriceM2Display = Math.round(meanPriceM2Raw);
    const surface = (data && data.surface != null) ? Number(data.surface) : null;
    const indicativeValue = (surface && surface > 0) ? Math.round(meanPriceM2Raw * surface) : null;

    const hasStreet = comparables.some(c => c.addr && c.addr.precision === "rue");
    const hasCommune = comparables.some(c => c.addr && c.addr.precision === "commune");

    const addrNoteHtml = !hasStreet
      ? `<p class="pr-addr-note">${I_PIN_SM} Les adresses exactes ne sont pas disponibles dans DVF+ pour ces transactions. La commune est indiquée à la place.</p>`
      : hasCommune
      ? `<p class="pr-addr-note">${I_PIN_SM} Certaines adresses de rue sont indisponibles dans DVF+ et ont été remplacées par la commune.</p>`
      : "";

    const countLabel = count > 1 ? `${count} ventes retenues` : `${count} vente retenue`;
    const badgeHtml = `
      <div class="pr-count-badge">
        <span class="pr-count-icon">${I_DB}</span>
        <div>
          <span class="pr-count-num">${countLabel}</span>
          ${radius ? `<span class="pr-count-radius">dans un rayon de ${radius} m</span>` : ""}
        </div>
      </div>`;

    const rows = comparables.map(c => `
      <tr>
        <td class="pr-td-addr">${addrHtml(c.addr)}</td>
        <td class="pr-td-date pr-num">${fmtDate(c.date)}</td>
        <td class="pr-td-surface pr-num">${Math.round(c.area)} m²</td>
        <td class="pr-td-price pr-num">${euro(c.price)}</td>
        <td class="pr-td-ratio"><span class="pr-ratio-val">${euro(c.priceM2)}/m²</span></td>
        <td class="pr-td-dist"><span class="pr-dist-pill">${I_PIN_SM} ${c.distance} m</span></td>
      </tr>`).join("");

    const cards = comparables.map(c => {
      const p = addrParts(c.addr);
      const mainAddr = p.street || p.locality || "Adresse non disponible";
      const subAddr = p.street && p.locality ? p.locality : "";
      const commTag = p.commune ? " <span class=\"pr-card-comm-tag\">(commune)</span>" : "";
      return `
      <div class="pr-card">
        <div class="pr-card-head">
          <div>
            <span class="pr-card-street">${escHtml(mainAddr)}${commTag}</span>
            ${subAddr ? `<span class="pr-card-locality">${escHtml(subAddr)}</span>` : ""}
          </div>
        </div>
        <div class="pr-card-data">
          <div class="pr-card-row"><span class="pr-card-label">Date</span><span class="pr-card-val">${fmtDate(c.date)}</span></div>
          <div class="pr-card-row"><span class="pr-card-label">Surface</span><span class="pr-card-val">${Math.round(c.area)} m²</span></div>
          <div class="pr-card-row"><span class="pr-card-label">Prix vendu</span><span class="pr-card-val">${euro(c.price)}</span></div>
          <div class="pr-card-row"><span class="pr-card-label">Prix / m²</span><span class="pr-card-val pr-card-ratio">${euro(c.priceM2)}/m²</span></div>
          <div class="pr-card-row pr-card-dist-row"><span class="pr-card-label">Distance</span><span class="pr-card-val"><span class="pr-dist-pill">${I_PIN_SM} ${c.distance} m</span></span></div>
        </div>
      </div>`;
    }).join("");

    const surfaceHtml = surface ? `${surface} m²` : "Non renseignée";
    const indicativeHtml = indicativeValue ? euro(indicativeValue) : "—";
    const calcBoxHtml = `
      <div class="pr-calc-box">
        <div class="pr-calc-left">
          <span class="pr-calc-icon">${I_CALC}</span>
          <span class="pr-calc-title">Votre valeur indicative selon les ventes du secteur</span>
        </div>
        <div class="pr-calc-formula">
          <div class="pr-calc-item">
            <span class="pr-calc-label">Prix moyen au m²<br>(de ces ${count} ventes)</span>
            <span class="pr-calc-val">${euro(meanPriceM2Display)} / m²</span>
          </div>
          <span class="pr-calc-op">×</span>
          <div class="pr-calc-item">
            <span class="pr-calc-label">Surface de votre bien<br>(renseignée dans Mon bien)</span>
            <span class="pr-calc-val">${surfaceHtml}</span>
          </div>
          <span class="pr-calc-op">=</span>
          <div class="pr-calc-item">
            <span class="pr-calc-label">Valeur indicative</span>
            <span class="pr-calc-result">${indicativeHtml}</span>
          </div>
        </div>
        <p class="pr-calc-note">Calcul basé sur des surfaces bâties DVF+, qui peuvent différer de votre surface habitable. Premier repère indicatif, non une estimation définitive.</p>
      </div>`;

    const html = `
    <div class="pr-comp-wrap">
      <div class="pr-comp-header">
        <div class="pr-comp-header-left">
          <div class="pr-comp-icon-box">${I_HOUSE_LG}</div>
          <div class="pr-comp-header-text">
            <h3 class="pr-comp-title">Les ventes comparables autour de votre bien</h3>
            <p class="pr-comp-sub">Retrouvez les ventes immobilières qui ont servi à établir votre premier repère de prix.</p>
          </div>
        </div>
        ${badgeHtml}
      </div>
      ${addrNoteHtml}
      <div class="pr-desktop-table">
        <div class="pr-table-wrap">
          <table class="pr-table">
            <thead><tr>
              <th><span class="pr-th-icon-cell">${I_HOUSE_SM} Adresse du bien</span></th>
              <th><span class="pr-th-icon-cell">${I_CAL} Date de vente</span></th>
              <th><span class="pr-th-icon-cell">${I_RESIZE} Surface bâtie</span></th>
              <th><span class="pr-th-icon-cell">${I_EURO} Prix vendu</span></th>
              <th><span class="pr-th-icon-cell">${I_TAG} Prix / m²</span></th>
              <th><span class="pr-th-icon-cell">${I_PIN} Distance</span></th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
      <div class="pr-mobile-cards">${cards}</div>
      ${calcBoxHtml}
      <div class="pr-comp-footer">
        <span class="pr-footer-icon">${I_INFO}</span>
        <p>Ces ventes constituent des références de marché. Leur prix peut varier selon l'état du logement, ses équipements, sa configuration et ses prestations. Votre estimation doit donc être affinée en tenant compte des caractéristiques propres à votre bien.</p>
      </div>
    </div>`;

    box.insertAdjacentHTML("beforeend", html);
  }

  function showCommune(box, data) {
    const output = box.querySelector("[data-price-output]");
    if (!output) return;
    output.replaceChildren();
    output.insertAdjacentHTML("beforeend", buildCommuneBlock(data));
    box.removeAttribute("aria-busy");
  }

  function ensureResult() {
    result ||= fetch("/api/formation/price-reference", {credentials: "same-origin", headers: {Accept: "application/json"}}).then(async r => {
      if (r.status === 404) return {status: "unavailable", message: "Le serveur local n'a pas encore chargé cette fonctionnalité. Un redémarrage du serveur est nécessaire."};
      if (r.status === 401 || r.status === 403 || r.redirected) return {status: "unavailable", message: "Votre session ne permet pas de charger ce repère. Reconnectez-vous à votre espace vendeur."};
      let data;
      try { data = await r.json(); }
      catch { return {status: "unavailable", message: "Le serveur local ne renvoie pas la réponse attendue pour ce repère. Aucun prix n'a été calculé."}; }
      if (!r.ok) return {status: "unavailable", message: typeof data?.message === "string" ? data.message : "Le serveur local rencontre une erreur technique. Aucun prix n'a été calculé."};
      if (!data || typeof data.status !== "string") return {status: "unavailable", message: "La réponse du serveur local est incomplète. Aucun prix n'a été calculé."};
      return data;
    }).catch(() => ({status: "unavailable", message: "Impossible de joindre le serveur local. Vérifiez que votre application reste accessible, puis rechargez la page."}));
  }

  function ensureCommuneResult() {
    communeResult ||= fetch("/api/formation/commune-reference", {credentials: "same-origin", headers: {Accept: "application/json"}}).then(async r => {
      if (r.status === 404) return {status: "unavailable", message: "Le serveur local n'a pas encore chargé cette fonctionnalité."};
      if (r.status === 401 || r.status === 403 || r.redirected) return {status: "unavailable", message: "Votre session ne permet pas de charger ce repère."};
      let data;
      try { data = await r.json(); }
      catch { return {status: "unavailable", message: "Le serveur local ne renvoie pas la réponse attendue."}; }
      if (!r.ok) return {status: "unavailable", message: typeof data?.message === "string" ? data.message : "Le serveur local rencontre une erreur technique."};
      if (!data || typeof data.status !== "string") return {status: "unavailable", message: "La réponse du serveur local est incomplète."};
      return data;
    }).catch(() => ({status: "unavailable", message: "Impossible de joindre le serveur local. Vérifiez que votre application reste accessible."}));
  }

  window.initPriceReference = () => {
    const box = document.querySelector("#step-0-0.lesson-selected [data-price-reference]");
    if (!box || box.dataset.started) return;
    box.dataset.started = "true";
    ensureCommuneResult();
    communeResult.then(data => showCommune(box, data));
  };

  window.initPriceComparables = () => {
    const box = document.querySelector("#step-0-1.lesson-selected [data-price-comparables]");
    if (!box || box.dataset.started) return;
    box.dataset.started = "true";
    ensureResult();
    result.then(data => {
      box.replaceChildren();
      renderComparables(box, data.comparables, data);
      if (data.status === "ok") {
        box.insertAdjacentHTML("beforeend", buildBenchmarks(data.comparables, data));
      }
      box.removeAttribute("aria-busy");
    });
  };

  const I_CLOCK = "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><polyline points=\"12 6 12 12 16 14\"/></svg>";
  const I_CHECK_CIRC = "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M22 11.08V12a10 10 0 1 1-5.93-9.14\"/><polyline points=\"22 4 12 14.01 9 11.01\"/></svg>";
  const I_LAYERS = "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polygon points=\"12 2 2 7 12 12 22 7 12 2\"/><polyline points=\"2 17 12 22 22 17\"/><polyline points=\"2 12 12 17 22 12\"/></svg>";
  const I_ALERT = "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z\"/><line x1=\"12\" y1=\"9\" x2=\"12\" y2=\"13\"/><line x1=\"12\" y1=\"17\" x2=\"12.01\" y2=\"17\"/></svg>";

  function renderPriceTarget(box, dvf, commune, savedPrice) {
    const output = box.querySelector("[data-price-target-output]");
    if (!output) return;

    const dvfOk = dvf && dvf.status === "ok";
    const dvfPm2 = dvfOk ? dvf.priceM2 : null;
    const dvfIndic = dvfOk && dvf.indicativeValue ? dvf.indicativeValue : null;

    const communeOk = commune && commune.status === "ok";
    const communePm2 = communeOk ? commune.priceMed : null;
    const communeIndic = communeOk && commune.indicMed ? commune.indicMed : null;

    const surface = dvf?.surface != null ? Number(dvf.surface) : (commune?.surface != null ? Number(commune.surface) : null);
    const hasSurface = surface != null && surface > 0 && Number.isFinite(surface);

    const bloc1 = "<div class=\"pt-bloc\">"
      + "<div class=\"pt-bloc-header\"><div class=\"pt-bloc-num\">1</div>"
      + "<h4 class=\"pt-bloc-title\">Maisons actuellement en vente autour de votre bien</h4></div>"
      + "<div class=\"pt-unavail\">" + I_CLOCK
      + "<span class=\"pt-unavail-msg\">Données du marché actuellement indisponibles</span>"
      + "</div></div>";

    const communePm2Cell = communeOk ? escHtml(euro(communePm2) + "/m²") : "<span class=\"pt-na\">Indisponible</span>";
    const communeIndicCell = communeIndic ? escHtml(euro(communeIndic)) : "<span class=\"pt-na\">—</span>";
    const dvfPm2Cell = dvfOk ? escHtml(euro(dvfPm2) + "/m²") : "<span class=\"pt-na\">Indisponible</span>";
    const dvfIndicCell = dvfIndic ? escHtml(euro(dvfIndic)) : "<span class=\"pt-na\">—</span>";

    const bloc2 = "<div class=\"pt-bloc\">"
      + "<div class=\"pt-bloc-header\"><div class=\"pt-bloc-num\">2</div>"
      + "<h4 class=\"pt-bloc-title\">Récapitulatif des repères de prix</h4></div>"
      + "<div class=\"pt-table-wrap\"><table class=\"pt-table\"><thead><tr>"
      + "<th>Source</th><th>Prix médian / m²</th><th>Pour votre bien</th>"
      + "</tr></thead><tbody>"
      + "<tr><td>1. DVF — Ventes à l'échelle de la commune</td><td>" + communePm2Cell + "</td><td>" + communeIndicCell + "</td></tr>"
      + "<tr><td>2. DVF — Ventes comparables du secteur</td><td>" + dvfPm2Cell + "</td><td>" + dvfIndicCell + "</td></tr>"
      + "<tr><td>3. Annonces en ligne (concurrence actuelle)</td><td><span class=\"pt-na\">Données indisponibles</span></td><td><span class=\"pt-na\">—</span></td></tr>"
      + "</tbody></table></div></div>";

    let meanPm2 = null, meanIndic = null, overlapWarning = false, availCount = 0;
    if (communeOk) availCount++;
    if (dvfOk) availCount++;
    if (communeOk && dvfOk) {
      meanPm2 = Math.round((communePm2 + dvfPm2) / 2);
      meanIndic = hasSurface ? Math.round(meanPm2 * surface / 1000) * 1000 : null;
      overlapWarning = true;
    } else if (communeOk) {
      meanPm2 = communePm2;
      meanIndic = communeIndic;
    } else if (dvfOk) {
      meanPm2 = dvfPm2;
      meanIndic = dvfIndic;
    }

    let bloc3Html;
    if (meanPm2 != null) {
      const sourcesLbl = availCount === 2
        ? "2 sources sur 3 disponibles (annonces indisponibles)"
        : "1 source sur 3 disponible";
      bloc3Html = "<div class=\"pt-mean-box\">"
        + "<div class=\"pt-mean-row\"><span class=\"pt-mean-lbl\">" + escHtml(sourcesLbl) + "</span></div>"
        + "<div class=\"pt-mean-val\">" + escHtml(euro(meanPm2)) + "/m²</div>"
        + (meanIndic ? "<div class=\"pt-mean-indic\">≈ " + escHtml(euro(meanIndic)) + " pour votre bien</div>" : "")
        + (overlapWarning ? "<div class=\"pt-mean-note\">Remarque : les deux sources DVF disponibles proviennent de la même base. Elles peuvent inclure des ventes communes et ne constituent pas deux références totalement indépendantes.</div>" : "")
        + "</div>";
    } else {
      bloc3Html = "<div class=\"pt-calc-na-wrap\"><p class=\"pt-calc-na\">Calcul indisponible — les données DVF sont inaccessibles pour cette estimation.</p></div>";
    }
    const bloc3 = "<div class=\"pt-bloc\">"
      + "<div class=\"pt-bloc-header\"><div class=\"pt-bloc-num\">3</div>"
      + "<h4 class=\"pt-bloc-title\">Moyenne des repères de marché</h4></div>"
      + bloc3Html + "</div>";

    const savedVal = (savedPrice != null && Number.isFinite(Number(savedPrice))) ? Math.round(Number(savedPrice)) : null;
    const savedStr = savedVal != null ? String(savedVal) : "";
    const bloc4 = "<div class=\"pt-bloc\">"
      + "<div class=\"pt-bloc-header\"><div class=\"pt-bloc-num\">4</div>"
      + "<h4 class=\"pt-bloc-title\">Votre prix de vente souhaité</h4></div>"
      + "<div class=\"pt-price-input-wrap\">"
      + "<label for=\"pt-price-input\" class=\"pt-price-label\">Entrez le prix auquel vous souhaitez vendre votre bien</label>"
      + "<div class=\"pt-price-field\">"
      + "<input type=\"number\" id=\"pt-price-input\" class=\"pt-price-input\" min=\"0\" max=\"100000000\" step=\"1000\" placeholder=\"Ex. : 250000\" value=\"" + savedStr + "\" autocomplete=\"off\">"
      + "<span class=\"pt-price-currency\">€</span>"
      + "</div>"
      + "<span class=\"pt-save-status\" id=\"pt-save-status\" aria-live=\"polite\"></span>"
      + "</div>"
      + "<div class=\"pt-formula-wrap\">"
      + "<div class=\"pt-formula-title\">Votre prix de référence final</div>"
      + "<div class=\"pt-formula\" id=\"pt-formula\">"
      + "<span class=\"pt-formula-na\">Calcul indisponible — renseignez votre prix souhaité et attendez les données du marché.</span>"
      + "</div></div></div>";

    const advice = (mod, icon, title, body) =>
      "<div class=\"pt-advice-card " + mod + "\">"
      + "<div class=\"pt-advice-icon\">" + icon + "</div>"
      + "<div class=\"pt-advice-body\"><strong>" + escHtml(title) + "</strong><p>" + escHtml(body) + "</p></div>"
      + "</div>";
    const bloc5 = "<div class=\"pt-bloc\">"
      + "<div class=\"pt-bloc-header\"><div class=\"pt-bloc-num\">5</div>"
      + "<h4 class=\"pt-bloc-title\">Conseils pour fixer votre prix</h4></div>"
      + "<div class=\"pt-advice-grid\">"
      + advice("pt-advice-green", I_CHECK_CIRC, "Privilégiez un prix cohérent avec le marché", "Un prix trop élevé allonge les délais et signale un bien difficile à vendre. Un prix cohérent génère davantage de visites et d'offres sérieuses.")
      + advice("pt-advice-info", I_LAYERS, "Tenez compte des caractéristiques de votre bien", "Les repères DVF et les annonces sont des moyennes. Votre bien peut valoir plus ou moins selon son état, son exposition et ses équipements.")
      + advice("pt-advice-warn", I_ALERT, "Revoyez votre prix après 45 jours sans offre", "Si votre bien ne génère pas d'offres après 45 jours, une réévaluation à la baisse est souvent nécessaire pour relancer les contacts.")
      + "</div></div>";

    output.innerHTML = "<div class=\"pt-wrap\">" + bloc1 + bloc2 + bloc3 + bloc4 + bloc5 + "</div>";

    const input = output.querySelector("#pt-price-input");
    const statusEl = output.querySelector("#pt-save-status");
    const formulaEl = output.querySelector("#pt-formula");

    function updateFormula(priceVal) {
      if (!Number.isFinite(priceVal) || priceVal <= 0) {
        formulaEl.innerHTML = "<span class=\"pt-formula-na\">Calcul indisponible — renseignez votre prix souhaité et attendez les données du marché.</span>";
        return;
      }
      formulaEl.innerHTML = "<span class=\"pt-formula-na\">Calcul indisponible — les données des annonces en ligne sont nécessaires pour établir la moyenne du marché.</span>";
    }

    if (savedVal != null) updateFormula(savedVal);

    let debounceTimer;
    input.addEventListener("input", () => {
      const val = Number(input.value);
      updateFormula(Number.isFinite(val) && val > 0 ? val : NaN);
      clearTimeout(debounceTimer);
      statusEl.textContent = "Enregistrement…";
      statusEl.className = "pt-save-status pt-save-saving";
      debounceTimer = setTimeout(async () => {
        if (!Number.isFinite(val) || val <= 0 || val > 100000000) {
          statusEl.textContent = "Valeur invalide";
          statusEl.className = "pt-save-status pt-save-error";
          return;
        }
        try {
          const r = await fetch("/api/formation/prix-souhaite", {
            method: "POST",
            credentials: "same-origin",
            headers: {"Content-Type": "application/json", Accept: "application/json"},
            body: JSON.stringify({prix_souhaite: Math.round(val)})
          });
          if (r.ok) {
            statusEl.textContent = "✓ Enregistré";
            statusEl.className = "pt-save-status pt-save-ok";
          } else {
            statusEl.textContent = "Erreur lors de l'enregistrement";
            statusEl.className = "pt-save-status pt-save-error";
          }
        } catch {
          statusEl.textContent = "Erreur de connexion";
          statusEl.className = "pt-save-status pt-save-error";
        }
      }, 800);
    });
  }

  window.initPriceTarget = () => {
    const box = document.querySelector("#step-0-2.lesson-selected [data-price-target]");
    if (!box || box.dataset.started) return;
    box.dataset.started = "true";
    ensureResult();
    ensureCommuneResult();
    Promise.all([
      result,
      communeResult,
      fetch("/api/formation/prix-souhaite", {credentials: "same-origin", headers: {Accept: "application/json"}})
        .then(r => r.ok ? r.json() : {prix_souhaite: null})
        .catch(() => ({prix_souhaite: null}))
    ]).then(([dvf, commune, priceData]) => {
      renderPriceTarget(box, dvf, commune, priceData && priceData.prix_souhaite != null ? priceData.prix_souhaite : null);
    });
  };

  const observer = new MutationObserver(() => {window.initPriceReference(); window.initPriceComparables(); window.initPriceTarget();});
  observer.observe(document.getElementById("modContainer"), {childList: true, subtree: true, attributes: true, attributeFilter: ["class"]});
  window.initPriceReference();
  window.initPriceComparables();
  window.initPriceTarget();
})();
