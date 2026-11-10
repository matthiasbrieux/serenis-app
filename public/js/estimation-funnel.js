(function () {
  'use strict';

  var _data = {};

  // ── BAN autocomplete state ───────────────────────────────────────
  var _banTimer    = null;
  var _banState    = 'empty'; // 'empty' | 'typing' | 'validated' | 'manual'
  var _banFocusIdx = -1;
  var _banFeatures = [];

  function $(id) { return document.getElementById(id); }

  function setErr(inputId, errId, msg) {
    var input = $(inputId);
    var err   = $(errId);
    if (input) {
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      input.classList.toggle('invalid', !!msg);
    }
    if (err) {
      err.textContent = msg || '';
      if (err.classList.contains('estim-field-err')) {
        err.classList.toggle('visible', !!msg);
      }
    }
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── BAN Autocomplete ─────────────────────────────────────────────

  function banCloseDropdown() {
    var d = $('estim-ban-dropdown');
    if (d) d.style.display = 'none';
    _banFocusIdx = -1;
  }

  function banUpdateFocus() {
    var d = $('estim-ban-dropdown');
    if (!d) return;
    var items = d.querySelectorAll('.estim-ban-item');
    items.forEach(function (el, i) {
      el.classList.toggle('focused', i === _banFocusIdx);
    });
  }

  function banSelectFeature(f) {
    var props  = f.properties;
    var coords = f.geometry && f.geometry.coordinates; // [lon, lat]

    var rueStr = props.housenumber
      ? props.housenumber + ' ' + (props.street || '')
      : (props.name || props.street || '');

    var rue   = $('estim-rue');
    var cp    = $('estim-cp');
    var ville = $('estim-ville');

    if (rue)   rue.value   = rueStr.trim();
    if (cp)  { cp.value    = props.postcode || ''; cp.setAttribute('readonly', 'readonly'); }
    if (ville) { ville.value = props.city || ''; ville.setAttribute('readonly', 'readonly'); }

    $('estim-insee').value = props.citycode || '';
    $('estim-lat').value   = coords ? String(coords[1]) : '';
    $('estim-lon').value   = coords ? String(coords[0]) : '';

    _banState = 'validated';
    setErr('estim-rue',   'err-rue',   '');
    setErr('estim-cp',    'err-cp',    '');
    setErr('estim-ville', 'err-ville', '');
    banCloseDropdown();
  }

  function banRenderDropdown(features) {
    var d = $('estim-ban-dropdown');
    if (!d) return;
    _banFeatures = features;
    _banFocusIdx = -1;
    d.innerHTML  = '';
    if (!features.length) { d.style.display = 'none'; return; }

    features.forEach(function (f) {
      var props = f.properties;
      var main  = props.housenumber
        ? props.housenumber + ' ' + (props.street || '')
        : (props.name || props.street || '');
      var loc   = (props.postcode || '') + (props.city ? ' ' + props.city : '');

      var div = document.createElement('div');
      div.className = 'estim-ban-item';
      div.setAttribute('role', 'option');
      div.innerHTML =
        '<span class="ban-main">' + esc(main.trim()) + '</span>'
        + (loc ? '<span class="ban-loc">' + esc(loc) + '</span>' : '');

      div.addEventListener('mousedown', function (e) {
        e.preventDefault(); // prevent blur before click registers
        banSelectFeature(f);
      });
      d.appendChild(div);
    });
    d.style.display = '';
  }

  function banSearch(q) {
    fetch('https://api-adresse.data.gouv.fr/search/?q=' + encodeURIComponent(q) + '&limit=5')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.features || !data.features.length) {
          banCloseDropdown();
          return;
        }
        banRenderDropdown(data.features.slice(0, 5));
      })
      .catch(function () { banCloseDropdown(); });
  }

  function banClearSelection() {
    var cp    = $('estim-cp');
    var ville = $('estim-ville');
    if (cp && cp.hasAttribute('readonly'))    { cp.removeAttribute('readonly');    cp.value = ''; }
    if (ville && ville.hasAttribute('readonly')) { ville.removeAttribute('readonly'); ville.value = ''; }
    $('estim-insee').value = '';
    $('estim-lat').value   = '';
    $('estim-lon').value   = '';
    _banState = 'typing';
  }

  function onRueInput() {
    if (_banState === 'validated') banClearSelection();
    _banState = 'typing';
    var val = ($('estim-rue').value || '').trim();
    clearTimeout(_banTimer);
    banCloseDropdown();
    if (val.length < 5) return;
    _banTimer = setTimeout(function () { banSearch(val); }, 350);
  }

  function onRueKeydown(e) {
    var d      = $('estim-ban-dropdown');
    var isOpen = d && d.style.display !== 'none';

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) return;
      _banFocusIdx = Math.min(_banFocusIdx + 1, _banFeatures.length - 1);
      banUpdateFocus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) return;
      _banFocusIdx = Math.max(_banFocusIdx - 1, -1);
      banUpdateFocus();
    } else if (e.key === 'Enter') {
      if (isOpen && _banFocusIdx >= 0 && _banFeatures[_banFocusIdx]) {
        e.preventDefault();
        banSelectFeature(_banFeatures[_banFocusIdx]);
      }
    } else if (e.key === 'Escape') {
      banCloseDropdown();
    }
  }

  function onRueBlur() {
    setTimeout(banCloseDropdown, 200);
  }

  // ── Step 1 validation ───────────────────────────────────────────
  function validateStep1() {
    var ok = true;

    var rue = ($('estim-rue').value || '').trim();
    if (rue.length < 5) {
      setErr('estim-rue', 'err-rue', 'Veuillez renseigner un numéro et une rue.');
      ok = false;
    } else {
      setErr('estim-rue', 'err-rue', '');
    }

    var cp = ($('estim-cp').value || '').trim();
    if (!cp || !/^\d{5}$/.test(cp)) {
      setErr('estim-cp', 'err-cp', 'Code postal requis (5 chiffres).');
      ok = false;
    } else {
      setErr('estim-cp', 'err-cp', '');
    }

    var ville = ($('estim-ville').value || '').trim();
    if (!ville) {
      setErr('estim-ville', 'err-ville', 'Ville requise.');
      ok = false;
    } else {
      setErr('estim-ville', 'err-ville', '');
    }

    var surf = parseInt($('estim-surface').value, 10);
    if (!surf || surf < 10 || surf > 2000) {
      setErr('estim-surface', 'err-surface', 'Surface valide requise (entre 10 et 2 000 m²).');
      ok = false;
    } else {
      setErr('estim-surface', 'err-surface', '');
    }

    return ok;
  }

  // ── Open modal ──────────────────────────────────────────────────
  function openEstimModal() {
    if (!validateStep1()) {
      var rue = $('estim-rue');
      if (rue) rue.focus();
      return;
    }

    var rue   = ($('estim-rue').value   || '').trim();
    var cp    = ($('estim-cp').value    || '').trim();
    var ville = ($('estim-ville').value || '').trim();

    _data.street         = rue;
    _data.postal_code    = cp;
    _data.city           = ville;
    _data.address        = rue + ', ' + cp + ' ' + ville;
    _data.insee_code     = ($('estim-insee').value || '') || null;
    _data.lat            = ($('estim-lat').value   || '') || null;
    _data.lon            = ($('estim-lon').value   || '') || null;
    _data.address_source = _banState === 'validated' ? 'ban' : 'manual';
    _data.surface        = $('estim-surface').value.trim();
    _data.property_type  = ($('estim-type') && $('estim-type').value) || 'Maison';

    var recap = $('estim-recap-text');
    if (recap) {
      recap.innerHTML = '<strong>' + esc(rue) + ', ' + esc(cp) + ' ' + esc(ville) + '</strong>'
        + '&ensp;&middot;&ensp;<strong>' + esc(_data.surface) + ' m²</strong>'
        + '&ensp;&middot;&ensp;' + esc(_data.property_type);
    }

    // Reset step 2
    ['estim-prenom', 'estim-email', 'estim-phone'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.value = '';
      el.removeAttribute('aria-invalid');
      el.classList.remove('invalid');
    });
    var cb = $('estim-callback');
    if (cb) cb.checked = false;
    var pcb = $('estim-phone-consent');
    if (pcb) pcb.checked = false;
    var ecb = $('estim-email-consent');
    if (ecb) ecb.checked = false;
    ['err-prenom', 'err-email', 'err-phone'].forEach(function (id) {
      var el = $(id); if (el) el.textContent = '';
    });
    updatePhoneLabel();

    $('estim-step2').style.display = '';
    $('estim-step3').style.display = 'none';
    $('estimModal').style.display  = 'flex';
    document.body.style.overflow   = 'hidden';
    setTimeout(function () { var el = $('estim-prenom'); if (el) el.focus(); }, 60);
  }

  function closeEstimModal() {
    var m = $('estimModal');
    if (m) m.style.display = 'none';
    document.body.style.overflow = '';
  }

  // ── Phone label ─────────────────────────────────────────────────
  function updatePhoneLabel() {
    var cb  = $('estim-callback');
    var opt = $('estim-phone-opt');
    var inp = $('estim-phone');
    if (!cb || !opt || !inp) return;
    if (cb.checked) {
      opt.textContent = '(requis pour être rappelé)';
      inp.setAttribute('aria-required', 'true');
    } else {
      opt.textContent = '(facultatif)';
      inp.removeAttribute('aria-required');
      setErr('estim-phone', 'err-phone', '');
    }
  }

  // ── Phone validation ───────────────────────────────────────────
  function validPhone(v) {
    var clean = v.replace(/[\s.\-()]/g, '');
    return /^(\+33|0033|0)[1-9](\d{2}){4}$/.test(clean);
  }

  // ── Show result (Step 3) ───────────────────────────────────────
  function showResult(prenom, email, apiResponse) {
    var cb      = $('estim-callback');
    var wantsCb = cb && cb.checked;

    var title   = $('estim-confirm-title');
    var eyebrow = $('estim-confirm-eyebrow');
    var msg     = $('estim-confirm-msg');
    var block   = $('estim-result-block');
    var val     = $('estim-result-value');
    var meta    = $('estim-result-meta');
    var cta     = $('estim-entretien-cta');

    if (!apiResponse || !apiResponse.status) {
      if (eyebrow) eyebrow.textContent = 'Formulaire complété';
      if (title)   title.textContent   = 'Merci, ' + prenom + '.';
      if (block)   block.style.display = 'none';
      if (msg)     msg.textContent     = 'L’envoi de votre estimation sera disponible prochainement.';
      if (cta)     cta.style.display   = 'none';
      return;
    }

    var status = apiResponse.status;

    if (cta) {
      cta.href          = '/entretien?email=' + encodeURIComponent(email);
      cta.style.display = '';
    }

    if (status === 'ok') {
      if (eyebrow) eyebrow.textContent = 'Estimation indicative';
      if (title)   title.textContent   = 'Votre bien, ' + prenom + ' :';
      if (block)   block.style.display = '';
      if (val)     val.textContent     = formatEuro(apiResponse.indicativeValue);
      if (meta) {
        meta.textContent = 'Prix médian constaté : ' + formatEuro(apiResponse.priceM2) + '/m²'
          + ' · basé sur ' + apiResponse.count + ' vente' + (apiResponse.count > 1 ? 's' : '')
          + ' dans un rayon de ' + apiResponse.radiusMeters + ' m';
      }
      if (msg) msg.textContent = wantsCb
        ? 'Votre demande a bien été enregistrée. L’équipe Vendu Par Moi vous recontactera prochainement.'
        : 'Votre demande a bien été enregistrée.';
    } else {
      if (block)   block.style.display = 'none';
      if (eyebrow) eyebrow.textContent = 'Demande enregistrée';
      if (title)   title.textContent   = 'Merci, ' + prenom + '.';

      var txt;
      if (status === 'unsupported') {
        txt = 'L’estimation automatique n’est pas disponible pour ce type de bien ou cette zone. Votre demande a néanmoins bien été enregistrée.';
      } else if (status === 'insufficient') {
        txt = 'Les données de vente disponibles ne permettent pas d’établir une estimation fiable. Votre demande a néanmoins bien été enregistrée.';
      } else if (status === 'unavailable') {
        txt = 'Les données officielles sont momentanément indisponibles. Votre demande a bien été enregistrée.';
      } else if (status === 'location') {
        txt = 'L’adresse saisie n’a pas pu être vérifiée (commune ou code postal non reconnus). Votre demande a été enregistrée, mais aucune estimation n’est disponible pour cette adresse.';
      } else {
        txt = 'Votre demande a bien été enregistrée.';
      }
      if (msg) msg.textContent = txt;
    }
  }

  function formatEuro(n) {
    if (!n) return '—';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  }

  // ── Step 2: submit ──────────────────────────────────────────────
  function submitEstim() {
    var ok = true;

    var prenom = ($('estim-prenom').value || '').trim();
    if (!prenom) {
      setErr('estim-prenom', 'err-prenom', 'Veuillez renseigner votre prénom.');
      ok = false;
    } else { setErr('estim-prenom', 'err-prenom', ''); }

    var email = ($('estim-email').value || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setErr('estim-email', 'err-email', 'Veuillez entrer une adresse e-mail valide.');
      ok = false;
    } else { setErr('estim-email', 'err-email', ''); }

    var phone   = ($('estim-phone').value || '').trim();
    var wantsCb = $('estim-callback').checked;
    if (wantsCb && !phone) {
      setErr('estim-phone', 'err-phone', 'Veuillez renseigner votre numéro pour être rappelé.');
      ok = false;
    } else if (phone && !validPhone(phone)) {
      setErr('estim-phone', 'err-phone', 'Numéro invalide. Format attendu : 06 12 34 56 78.');
      ok = false;
    } else { setErr('estim-phone', 'err-phone', ''); }

    if (!ok) return;

    var now = new Date().toISOString();
    var wantsPhoneCb  = !!($('estim-phone-consent')  && $('estim-phone-consent').checked);
    var wantsEmailMkt = !!($('estim-email-consent') && $('estim-email-consent').checked);

    _data.prenom                   = prenom;
    _data.email                    = email;
    _data.phone                    = phone || null;
    _data.callback_consent         = wantsCb;
    _data.callback_consent_at      = wantsCb ? now : null;
    _data.callback_consent_version = wantsCb ? 'v1-2026' : null;
    _data.phone_consent            = wantsPhoneCb;
    _data.phone_consent_at         = wantsPhoneCb  ? now : null;
    _data.phone_consent_version    = wantsPhoneCb  ? 'v1-2026' : null;
    _data.email_consent            = wantsEmailMkt;
    _data.email_consent_at         = wantsEmailMkt ? now : null;
    _data.email_consent_version    = wantsEmailMkt ? 'v1-2026' : null;

    window._estimData = _data;

    var btn = $('estim-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Calcul en cours…'; }

    var body = JSON.stringify({
      street:                   _data.street,
      postal_code:              _data.postal_code,
      city:                     _data.city,
      raw_address:              _data.address,
      insee_code:               _data.insee_code || null,
      lat:                      _data.lat ? parseFloat(_data.lat) : null,
      lon:                      _data.lon ? parseFloat(_data.lon) : null,
      address_source:           _data.address_source,
      surface:                  _data.surface,
      property_type:            _data.property_type,
      prenom:                   prenom,
      email:                    email,
      phone:                    phone || null,
      callback_consent:         wantsCb,
      callback_consent_at:      _data.callback_consent_at,
      callback_consent_version: _data.callback_consent_version,
      phone_consent:            wantsPhoneCb,
      phone_consent_at:         _data.phone_consent_at,
      phone_consent_version:    _data.phone_consent_version,
      email_consent:            wantsEmailMkt,
      email_consent_at:         _data.email_consent_at,
      email_consent_version:    _data.email_consent_version,
    });

    fetch('/api/public/estimation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      $('estim-step2').style.display = 'none';
      $('estim-step3').style.display = '';
      showResult(prenom, email, data);
    })
    .catch(function () {
      $('estim-step2').style.display = 'none';
      $('estim-step3').style.display = '';
      showResult(prenom, email, null);
    })
    .finally(function () {
      if (btn) { btn.disabled = false; btn.textContent = 'Recevoir mon estimation →'; }
    });
  }

  // ── Init ───────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    var btn = $('estim-step1-btn');
    if (btn) btn.addEventListener('click', openEstimModal);

    var rue = $('estim-rue');
    if (rue) {
      rue.addEventListener('input',   onRueInput);
      rue.addEventListener('keydown', onRueKeydown);
      rue.addEventListener('blur',    onRueBlur);
    }

    var cb = $('estim-callback');
    if (cb) cb.addEventListener('change', updatePhoneLabel);

    var submit = $('estim-submit-btn');
    if (submit) submit.addEventListener('click', submitEstim);

    var overlay = $('estimModal');
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeEstimModal();
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay && overlay.style.display !== 'none') closeEstimModal();
    });
  });

  window.openEstimModal  = openEstimModal;
  window.closeEstimModal = closeEstimModal;
}());
