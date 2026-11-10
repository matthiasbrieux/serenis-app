'use strict';
const { Resend } = require('resend');

const FROM_EMAIL  = process.env.SENDGRID_FROM_EMAIL || 'contact@venduparmoi.fr';
const FROM_NAME   = 'Vendu Par Moi';
const BASE_URL    = process.env.BASE_URL            || 'https://www.venduparmoi.fr';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL         || 'matthias@venduparmoi.fr';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function logSend(to, subject, success) {
  try {
    const db = require('../database');
    db.prepare('INSERT INTO email_sends (to_email, subject, success, source) VALUES (?,?,?,?)')
      .run(to, subject, success ? 1 : 0, 'estimation');
  } catch {}
}

async function rawSend(to, subject, html, text) {
  const resend = getResend();
  if (!resend) {
    console.warn(`[ESTIM-EMAIL] RESEND_API_KEY manquant — email non envoyé à ${to}`);
    logSend(to, subject, false);
    return false;
  }
  try {
    const payload = { from: `${FROM_NAME} <${FROM_EMAIL}>`, to, subject, html };
    if (text) payload.text = text;
    const { data, error } = await resend.emails.send(payload);
    if (error) {
      console.error(`[ESTIM-EMAIL] ✗ ${to} : ${JSON.stringify(error)}`);
      logSend(to, subject, false);
      return false;
    }
    console.log(`[ESTIM-EMAIL] ✓ (${data?.id}) → ${to}`);
    logSend(to, subject, true);
    return true;
  } catch (e) {
    console.error(`[ESTIM-EMAIL] ✗ Exception → ${to} : ${e.message}`);
    logSend(to, subject, false);
    return false;
  }
}

/* ── Helpers ── */
function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fmt(n) {
  if (n == null || n === '') return '';
  return new Intl.NumberFormat('fr-FR').format(Math.round(Number(n)));
}
function fmtDate(d) {
  try {
    return new Date(String(d || '').replace(' ', 'T')).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return ''; }
}
function fmtDateShort(d) {
  try {
    return new Date(String(d || '').replace(' ', 'T')).toLocaleDateString('fr-FR', {
      month: 'short', year: 'numeric',
    });
  } catch { return ''; }
}

/* ── Compute three values from comparables ──────────────────────
   Uses real P25 / P50 / P75 from actual DVF sales — no formula.
   Returns null when count < 8 (not enough data for percentiles).
─────────────────────────────────────────────────────────────────── */
function computeThreeValues(comparables, surface) {
  if (!Array.isArray(comparables) || comparables.length < 8) return null;
  const ratios = comparables.map(s => s.priceM2).filter(r => typeof r === 'number' && r > 0);
  if (ratios.length < 8) return null;
  const sorted = [...ratios].sort((a, b) => a - b);
  const n = sorted.length;
  const pct = (p) => {
    const i = p / 100 * (n - 1);
    const lo = Math.floor(i), hi = Math.ceil(i);
    return sorted[lo] + (i - lo) * ((sorted[hi] ?? sorted[lo]) - sorted[lo]);
  };
  const round1k = (v) => Math.round(v * surface / 1000) * 1000;
  return {
    rapide:    round1k(pct(25)),
    conseille: round1k(pct(50)),
    ambitieux: round1k(pct(75)),
  };
}

/* ── Static map URL via IGN geocoder + Geoapify ─────────────────
   Requires GEOAPIFY_API_KEY in .env.
   Returns null (silently) if key absent or geocoding fails.
   The API key is embedded in the img src URL — this is intended
   and consistent with how public map API keys work (Geoapify
   allows restricting keys by referrer in their dashboard).
─────────────────────────────────────────────────────────────────── */
async function getMapUrl(rawAddress, postalCode) {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) return null;
  try {
    const geoUrl = new URL('https://data.geopf.fr/geocodage/search');
    geoUrl.search = new URLSearchParams({ q: String(rawAddress || ''), limit: '1' });
    if (postalCode) geoUrl.searchParams.set('postcode', String(postalCode));
    const res = await fetch(geoUrl, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const feat  = json.features?.[0];
    if (!feat || feat.geometry?.type !== 'Point') return null;
    const [lon, lat] = feat.geometry.coordinates;
    const p = new URLSearchParams({
      center:  `lonlat:${lon.toFixed(6)},${lat.toFixed(6)}`,
      zoom:    '15',
      width:   '520',
      height:  '200',
      style:   'osm-carto',
      marker:  `lonlat:${lon.toFixed(6)},${lat.toFixed(6)};color:%239E3A18;size:large`,
      apiKey,
    });
    return `https://maps.geoapify.com/v1/staticmap?${p.toString()}`;
  } catch {
    return null;
  }
}

/* ── Location section — encart pleine largeur ─────────────────── */
function locationSection(city, postal_code, mapUrl) {
  const cityEsc = esc(city || '');
  const cpEsc   = esc(postal_code || '');

  if (mapUrl) {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;margin:0 0 24px;">
  <tr><td style="font-size:0;line-height:0;">
    <img src="${esc(mapUrl)}" width="520" alt="Secteur ${cityEsc}" style="display:block;width:100%;height:auto;max-height:220px;border-radius:14px;border:1px solid #EFD5C5;" />
  </td></tr>
  <tr><td style="padding:8px 0 0;">
    <span style="display:inline-block;width:7px;height:7px;background:#9E3A18;border-radius:50%;vertical-align:middle;margin-right:5px;"></span><span style="font-size:14px;font-weight:600;color:#1C0804;vertical-align:middle;">${cityEsc}</span>${cpEsc ? `<span style="font-size:14px;color:#75665C;vertical-align:middle;">&ensp;${cpEsc}</span>` : ''}
  </td></tr>
</table>`;
  }

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;margin:0 0 24px;">
  <tr><td style="background:#FCF1E7;border:1px solid #EFD5C5;border-radius:14px;padding:14px 18px;text-align:center;">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#9E3A18" style="display:inline-block;vertical-align:middle;margin:0 10px 0 0;"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
    <p style="font-family:Georgia,'Times New Roman',Times,serif;font-size:18px;font-weight:600;color:#1C0804;display:inline-block;vertical-align:middle;margin:0 8px 0 0;">${cityEsc}</p>
    ${cpEsc ? `<p style="font-size:13px;color:#75665C;display:inline-block;vertical-align:middle;letter-spacing:0.1em;text-transform:uppercase;margin:0;">${cpEsc}</p>` : ''}
  </td></tr>
</table>`;
}

/* ── Shared HTML shell ─────────────────────────────────────────── */
function shell(bodyContent, preheader, subtitle) {
  const subLabel = esc(subtitle || 'Mini-rapport d’estimation');
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Vendu Par Moi</title>
<style>
@media only screen and (max-width:600px){
  .eo { padding:12px 8px!important }
  .ec { padding:24px 18px!important }
  .eh { padding:14px 18px!important }
  .eh img { width:240px!important;height:auto!important;max-width:100%!important }
  .report-title { font-size:28px!important }
  .ev { font-size:30px!important;line-height:1.2!important }
  .pc { display:block!important;width:100%!important;box-sizing:border-box!important;padding:0 0 12px!important }
  .pv { font-size:32px!important }
  .price-card { padding:22px 16px!important }
  .bi-l { display:block!important;width:100%!important;padding-right:0!important;padding-bottom:12px!important }
  .bi-r { display:block!important;width:100%!important }
  .email-button { display:block!important;padding:16px 14px!important;font-size:16px!important;line-height:1.4!important }
  .report-footer { padding:20px 8px 0!important }
  .detail-table, .detail-table tbody, .detail-table tr { display:block!important;width:100%!important;box-sizing:border-box!important }
  .detail-table td[colspan] { display:block!important;width:100%!important;box-sizing:border-box!important }
  .detail-label, .detail-value { display:block!important;width:100%!important;box-sizing:border-box!important }
  .detail-label { padding:12px 14px 3px!important;border-bottom:0!important }
  .detail-value { padding:3px 14px 12px!important }
}
</style>
</head>
<body style="margin:0;padding:0;background:#FBF5EF;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;color:#FCF1E7;">${esc(preheader || '')}</div>
<table class="eo" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#FBF5EF;padding:24px 16px;">
  <tr><td align="center">
    <!--[if mso]><table role="presentation" width="640" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
    <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;border-collapse:separate;">
      <tr><td class="eh" align="center" style="background:#9E3A18;border-radius:18px;padding:14px 24px;text-align:center;">
        <img src="${BASE_URL}/images/email-logo.png" width="260" height="75" alt="Vendu Par Moi" style="display:block;width:260px;max-width:100%;height:auto;margin:0 auto;color:#FFFFFF;font-family:Georgia,'Times New Roman',Times,serif;font-size:24px;font-weight:700;" />
        <p style="font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#FFF6EE;margin:8px 0 0;">${subLabel}</p>
      </td></tr>
      <tr><td height="12" style="height:12px;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td class="ec" style="background:#FFFCF8;border:1px solid #F3E4D9;border-radius:20px;padding:30px 28px;box-shadow:0 8px 24px rgba(99,48,24,0.08);">
        ${bodyContent}
      </td></tr>
      <tr><td class="report-footer" style="padding:22px 0 0;text-align:center;">
        <p style="font-size:13px;color:#75665C;line-height:1.65;margin:0 0 6px;">Estimation indicative générée automatiquement à partir des données DVF (Cerema).<br>Cette valeur ne constitue pas une expertise immobilière.</p>
        <p style="font-size:13px;color:#75665C;margin:0;">
          <a href="${BASE_URL}" style="color:#9E3A18;text-decoration:none;">venduparmoi.fr</a>
          &nbsp;·&nbsp;
          <a href="mailto:contact@venduparmoi.fr" style="color:#75665C;text-decoration:none;">contact@venduparmoi.fr</a>
          &nbsp;·&nbsp;
          <a href="${BASE_URL}/confidentialite" style="color:#75665C;text-decoration:none;">Politique de confidentialité</a>
        </p>
      </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr>
</table>
</body>
</html>`;
}

/* ── Template HTML prospect ─────────────────────────────────────── */
function buildProspectHtml(data) {
  const {
    prenom, email, city, postal_code, surface, property_type,
    estimation_status, price_m2, indicative_value, count, radiusMeters,
    period_from, period_to, created_at,
    mapUrl, threeValues, cta_token,
  } = data;

  const dateStr     = fmtDate(created_at);
  const periodFrom  = period_from ? fmtDateShort(period_from) : '';
  const periodTo    = period_to   ? fmtDateShort(period_to)   : '';
  const periodText  = (periodFrom && periodTo) ? `${esc(periodFrom)} – ${esc(periodTo)}`
                    : periodFrom ? esc(periodFrom) : '';

  /* ── Result section ── */
  let resultSection = '';

  if (estimation_status === 'ok' && indicative_value) {

    if (threeValues) {
      resultSection = `
<p style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9E3A18;margin:0 0 14px;">Analyse de marché</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;margin:0 0 20px;">
  <tr valign="top">
    <td class="pc" width="31%" style="padding-right:6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="price-card" style="background:#FCF1E7;border:1px solid #F4DFCE;border-radius:16px;padding:24px 8px;text-align:center;">
        <p style="font-size:12px;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;color:#43281B;margin:0 0 14px;">VENTE RAPIDE</p>
        <p class="pv" style="font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:700;color:#432314;line-height:1.15;margin:0;">${fmt(threeValues.rapide)}&nbsp;€</p>
      </td></tr></table>
    </td>
    <td class="pc" width="38%" style="padding-left:4px;padding-right:4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="price-card" style="background:#9E3A18;border-radius:16px;padding:24px 8px;text-align:center;">
        <p style="font-size:12px;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;color:#FFF6EE;margin:0 0 14px;">MARCHÉ CONSEILLÉ</p>
        <p class="pv" style="font-family:Georgia,'Times New Roman',Times,serif;font-size:32px;font-weight:700;color:#FFFCF8;line-height:1.15;margin:0;">${fmt(threeValues.conseille)}&nbsp;€</p>
      </td></tr></table>
    </td>
    <td class="pc" width="31%" style="padding-left:6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="price-card" style="background:#FCF1E7;border:1px solid #F4DFCE;border-radius:16px;padding:24px 8px;text-align:center;">
        <p style="font-size:12px;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;color:#43281B;margin:0 0 14px;">PRIX AMBITIEUX</p>
        <p class="pv" style="font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:700;color:#432314;line-height:1.15;margin:0;">${fmt(threeValues.ambitieux)}&nbsp;€</p>
      </td></tr></table>
    </td>
  </tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;margin:0 0 20px;">
  <tr><td style="background:#FCF1E7;border:1px solid #EFD5C5;padding:20px 22px;border-radius:16px;">
    <p style="font-size:18px;font-weight:700;color:#1C0804;margin:0 0 12px;">Comment lire ces 3 prix ?</p>
    <p style="font-size:15px;color:#3D3028;line-height:1.65;margin:0 0 8px;"><strong style="color:#1C0804;">Vente rapide</strong> — Un prix plus attractif pour favoriser l'intérêt des acheteurs. Une vente rapide n'est pas garantie.</p>
    <p style="font-size:15px;color:#3D3028;line-height:1.65;margin:0 0 8px;"><strong style="color:#1C0804;">Marché conseillé</strong> — La référence centrale calculée à partir des ventes comparables disponibles.</p>
    <p style="font-size:15px;color:#3D3028;line-height:1.65;margin:0;"><strong style="color:#1C0804;">Prix ambitieux</strong> — Un prix plus élevé, à justifier par les caractéristiques du bien et la demande locale.</p>
  </td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;margin:0 0 20px;">
  <tr><td style="background:#FCF1E7;border:1px solid #EFD5C5;border-radius:16px;padding:20px 22px;">
    <p style="font-family:Georgia,'Times New Roman',Times,serif;font-size:21px;font-weight:600;color:#1C0804;line-height:1.3;margin:0 0 10px;">Votre estimation est un repère.<br>Votre prix de vente reste votre décision.</p>
    <p style="font-size:15px;color:#3D3028;line-height:1.75;margin:0 0 6px;">Les trois valeurs ci-dessus reflètent les transactions comparables de votre secteur. Elles constituent des repères statistiques — non un prix imposé.</p>
    <p style="font-size:15px;color:#3D3028;line-height:1.75;margin:0 0 16px;">Vous restez libre de fixer votre prix selon votre objectif financier, l'état de votre bien et ses spécificités. Un prix cohérent avec le marché reste essentiel pour susciter l'intérêt des acheteurs.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #EFD5C5;padding-bottom:14px;"></td></tr></table>
    <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9E3A18;margin:0 0 8px;">Et votre net vendeur ?</p>
    <p style="font-size:15px;color:#3D3028;line-height:1.75;margin:0 0 10px;">En cas de vente par un intermédiaire traditionnel, des honoraires sont couramment pratiqués — entre 5 et 8 % du prix de vente. Selon leur répartition, ils réduisent votre net vendeur ou s'ajoutent au prix demandé à l'acheteur.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;margin:0 0 10px;"><tr><td style="background:#EFD5C5;border-radius:8px;padding:10px 14px;"><p style="font-size:15px;color:#3D3028;line-height:1.65;margin:0;"><strong style="color:#1C0804;">Exemple illustratif :</strong> pour un bien vendu 245&nbsp;000&nbsp;€, des honoraires de 5 à 8&nbsp;% représentent entre 12&nbsp;250 et 19&nbsp;600&nbsp;€. Ce chiffre est illustratif — pas une économie garantie.</p></td></tr></table>
    <p style="font-size:15px;color:#3D3028;line-height:1.75;margin:0;">Avec <strong style="color:#1C0804;">Vendu Par Moi</strong>, vous vendez directement, sans commission d'intermédiaire — moyennant le prix fixe de notre solution.</p>
  </td></tr>
</table>`;
    } else {
      resultSection = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;margin:0 0 20px;">
  <tr><td style="background:#9E3A18;border-radius:16px;padding:18px 24px;text-align:center;">
    <p style="font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#FFF6EE;margin:0 0 10px;">VALEUR INDICATIVE ESTIMÉE</p>
    <p class="ev" style="font-family:Georgia,'Times New Roman',Times,serif;font-size:36px;font-weight:700;color:#FFFCF8;margin:0 0 8px;line-height:1;">Environ ${fmt(indicative_value)} €</p>
    <p style="font-size:14px;color:#FFF6EE;margin:0;">Basé sur ${esc(String(count))} vente${count > 1 ? 's' : ''} · rayon de ${esc(String(radiusMeters || ''))} m</p>
  </td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;margin:0 0 20px;">
  <tr><td style="background:#FCF1E7;border:1px solid #EFD5C5;padding:20px 22px;border-radius:16px;">
    <p style="font-size:18px;font-weight:700;color:#1C0804;margin:0 0 6px;">Comment interpréter ce résultat ?</p>
    <p style="font-size:15px;color:#3D3028;line-height:1.7;margin:0;">Cette valeur reflète les transactions immobilières enregistrées à proximité. Elle ne tient pas compte de l'état du bien, de ses finitions, de ses équipements, ni de travaux réalisés ou à prévoir.</p>
  </td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;margin:0 0 20px;">
  <tr><td style="background:#FCF1E7;border:1px solid #EFD5C5;border-radius:16px;padding:20px 22px;">
    <p style="font-family:Georgia,'Times New Roman',Times,serif;font-size:21px;font-weight:600;color:#1C0804;line-height:1.3;margin:0 0 10px;">Votre estimation est un repère.<br>Votre prix de vente reste votre décision.</p>
    <p style="font-size:15px;color:#3D3028;line-height:1.75;margin:0 0 6px;">La valeur ci-dessus reflète les transactions comparables de votre secteur. Elle constitue un repère statistique — non un prix imposé.</p>
    <p style="font-size:15px;color:#3D3028;line-height:1.75;margin:0 0 16px;">Vous restez libre de fixer votre prix selon votre objectif financier, l'état de votre bien et ses spécificités. Un prix cohérent avec le marché reste essentiel pour susciter l'intérêt des acheteurs.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #EFD5C5;padding-bottom:14px;"></td></tr></table>
    <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9E3A18;margin:0 0 8px;">Et votre net vendeur ?</p>
    <p style="font-size:15px;color:#3D3028;line-height:1.75;margin:0 0 10px;">En cas de vente par un intermédiaire traditionnel, des honoraires sont couramment pratiqués — entre 5 et 8 % du prix de vente. Selon leur répartition, ils réduisent votre net vendeur ou s'ajoutent au prix demandé à l'acheteur.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;margin:0 0 10px;"><tr><td style="background:#EFD5C5;border-radius:8px;padding:10px 14px;"><p style="font-size:15px;color:#3D3028;line-height:1.65;margin:0;"><strong style="color:#1C0804;">Exemple illustratif :</strong> pour un bien vendu 245&nbsp;000&nbsp;€, des honoraires de 5 à 8&nbsp;% représentent entre 12&nbsp;250 et 19&nbsp;600&nbsp;€. Ce chiffre est illustratif — pas une économie garantie.</p></td></tr></table>
    <p style="font-size:15px;color:#3D3028;line-height:1.75;margin:0;">Avec <strong style="color:#1C0804;">Vendu Par Moi</strong>, vous vendez directement, sans commission d'intermédiaire — moyennant le prix fixe de notre solution.</p>
  </td></tr>
</table>`;
    }

    /* Data transparency — 2×2 indicators */
    resultSection += `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;margin:0 0 24px;">
  <tr><td colspan="2" style="padding-bottom:10px;">
    <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9E3A18;margin:0;">Sur quelles données ?</p>
  </td></tr>
  <tr>
    <td width="50%" style="padding-right:4px;padding-bottom:8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#FDF5EE;border:1px solid #EFD5C5;border-radius:8px;padding:12px 14px;text-align:center;">
        <p style="font-family:Georgia,'Times New Roman',Times,serif;font-size:22px;font-weight:700;color:#1C0804;margin:0 0 3px;">${esc(String(count || '—'))}</p>
        <p style="font-size:12px;color:#75665C;margin:0;">ventes retenues</p>
      </td></tr></table>
    </td>
    <td width="50%" style="padding-left:4px;padding-bottom:8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#FDF5EE;border:1px solid #EFD5C5;border-radius:8px;padding:12px 14px;text-align:center;">
        <p style="font-family:Georgia,'Times New Roman',Times,serif;font-size:22px;font-weight:700;color:#1C0804;margin:0 0 3px;">${esc(String(radiusMeters || '—'))} m</p>
        <p style="font-size:12px;color:#75665C;margin:0;">rayon analysé</p>
      </td></tr></table>
    </td>
  </tr>
  <tr>
    <td style="padding-right:4px;">
      ${periodText ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#FDF5EE;border:1px solid #EFD5C5;border-radius:8px;padding:12px 14px;text-align:center;">
        <p style="font-size:14px;font-weight:600;color:#1C0804;margin:0 0 3px;">${periodText}</p>
        <p style="font-size:12px;color:#75665C;margin:0;">période des ventes</p>
      </td></tr></table>` : ''}
    </td>
    <td style="padding-left:4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#FDF5EE;border:1px solid #EFD5C5;border-radius:8px;padding:12px 14px;text-align:center;">
        <p style="font-size:14px;font-weight:600;color:#1C0804;margin:0 0 3px;">DVF — Cerema</p>
        <p style="font-size:12px;color:#75665C;margin:0;">source officielle</p>
      </td></tr></table>
    </td>
  </tr>
  <tr><td colspan="2" style="padding-top:8px;">
    <p style="font-size:13px;color:#75665C;line-height:1.65;margin:0;">Ces données renseignent exclusivement sur les prix de vente enregistrés. Elles ne tiennent pas compte de l'état intérieur, des travaux réalisés ou à prévoir, ni des caractéristiques particulières du bien.</p>
  </td></tr>
</table>`;

  } else {
    let statusTitle = 'Estimation non disponible';
    let statusDesc  = 'Votre demande a bien été enregistrée.';
    if (estimation_status === 'unsupported') {
      statusTitle = 'Estimation non disponible pour ce bien';
      statusDesc  = 'L’estimation automatique repose sur les données DVF du département Nord (59). Elle n’est pas disponible pour ce type de bien ou cette zone géographique.';
    } else if (estimation_status === 'insufficient') {
      statusTitle = 'Données insuffisantes';
      statusDesc  = 'Le nombre de ventes comparables enregistrées dans votre secteur est insuffisant pour établir une estimation fiable.';
    } else if (estimation_status === 'location') {
      statusTitle = 'Adresse non localisée';
      statusDesc  = 'L’adresse renseignée n’a pas pu être localisée avec précision. Vérifiez que le code postal et la ville sont bien inclus dans votre saisie.';
    } else if (estimation_status === 'unavailable') {
      statusTitle = 'Données momentanément indisponibles';
      statusDesc  = 'Les données officielles sont actuellement indisponibles ou incomplètes.';
    }
    resultSection = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;margin:0 0 24px;">
  <tr><td style="background:#FCF1E7;border:1px solid #EFD5C5;border-radius:14px;padding:24px;text-align:center;">
    <p style="font-size:14px;font-weight:600;color:#1C0804;margin:0 0 10px;">${esc(statusTitle)}</p>
    <p style="font-size:15px;color:#3D3028;line-height:1.75;margin:0;">${esc(statusDesc)}</p>
  </td></tr>
</table>`;
  }

  const body = `
<h1 class="report-title" style="font-family:Georgia,'Times New Roman',Times,serif;font-size:34px;font-weight:700;color:#1C0804;line-height:1.15;margin:0 0 20px;">Une première idée<br>de la valeur de <em style="color:#9E3A18;font-weight:600;">votre bien.</em></h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #EFD5C5;"></td></tr></table>
<div style="height:20px;"></div>
<p style="font-size:18px;font-weight:700;color:#1C0804;margin:0 0 8px;">Bonjour ${esc(prenom)},</p>
<p style="font-size:15px;color:#3D3028;line-height:1.75;margin:0 0 24px;">Ce rapport est établi à partir des données officielles de mutation immobilière (DVF) disponibles dans votre secteur. Il vous donne une première indication de la valeur de marché de votre bien, à titre indicatif.</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;margin:0 0 20px;">
  <tr><td>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #EFD5C5;border-radius:14px;overflow:hidden;">
      <tr style="background:#FDF5EE;"><td colspan="2" style="padding:9px 14px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9E3A18;border-bottom:1px solid #EFD5C5;">Votre bien</td></tr>
      <tr>
        <td style="padding:11px 16px;font-size:14px;color:#75665C;border-bottom:1px solid #EFD5C5;width:40%;vertical-align:top;">Type</td>
        <td style="padding:11px 16px;font-size:14px;font-weight:600;color:#1C0804;border-bottom:1px solid #EFD5C5;">${esc(property_type)}</td>
      </tr>
      <tr>
        <td style="padding:11px 16px;font-size:14px;color:#75665C;border-bottom:1px solid #EFD5C5;vertical-align:top;">Surface</td>
        <td style="padding:11px 16px;font-size:14px;font-weight:600;color:#1C0804;border-bottom:1px solid #EFD5C5;">${esc(String(surface))} m²</td>
      </tr>
      ${dateStr ? `<tr>
        <td style="padding:11px 16px;font-size:14px;color:#75665C;border-bottom:1px solid #EFD5C5;vertical-align:top;">Date</td>
        <td style="padding:11px 16px;font-size:14px;font-weight:600;color:#1C0804;border-bottom:1px solid #EFD5C5;">${esc(dateStr)}</td>
      </tr>` : ''}
    </table>
  </td></tr>
</table>

${locationSection(city, postal_code, mapUrl)}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #EFD5C5;"></td></tr></table>
<div style="height:24px;"></div>

${resultSection}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #EFD5C5;"></td></tr></table>
<div style="height:24px;"></div>

<h2 style="font-family:Georgia,'Times New Roman',Times,serif;font-size:25px;font-weight:600;color:#1C0804;margin:0 0 12px;">Et si votre bien valait davantage ?</h2>
<p style="font-size:15px;color:#3D3028;line-height:1.65;margin:0 0 14px;">Une estimation est un point de départ. La valeur finale dépend aussi de la présentation, du dossier et de la négociation. Vendu Par Moi vous aide à en tirer le meilleur :</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
  <tr><td style="padding:5px 0;font-size:15px;color:#3D3028;line-height:1.5;"><span style="color:#9E3A18;font-weight:700;padding-right:8px;">&#10003;</span>Une annonce professionnelle qui valorise votre bien</td></tr>
  <tr><td style="padding:5px 0;font-size:15px;color:#3D3028;line-height:1.5;"><span style="color:#9E3A18;font-weight:700;padding-right:8px;">&#10003;</span>Un agenda de visites en ligne, sans intermédiaire</td></tr>
  <tr><td style="padding:5px 0;font-size:15px;color:#3D3028;line-height:1.5;"><span style="color:#9E3A18;font-weight:700;padding-right:8px;">&#10003;</span>Un accompagnement jusqu'à la signature notaire</td></tr>
</table>
<div style="text-align:center;margin:0 0 4px;">
  <a class="email-button" href="${BASE_URL}/entretien?token=${cta_token || ''}" style="display:inline-block;background:#9E3A18;color:#FFFCF8;font-size:17px;font-weight:700;line-height:1.4;padding:16px 28px;border-radius:14px;text-decoration:none;letter-spacing:0.02em;">Demander un échange personnalisé →</a>
</div>`;

  return shell(body, 'Votre estimation indicative Vendu Par Moi est prête.');
}

/* ── Version texte prospect ── */
function buildProspectText(data) {
  const { prenom, city, postal_code, surface, property_type,
    estimation_status, price_m2, indicative_value, count, radiusMeters,
    period_from, period_to, threeValues } = data;
  const loc = [city, postal_code].filter(Boolean).join(', ');

  let result = '';
  if (estimation_status === 'ok' && indicative_value) {
    if (threeValues) {
      result = `ANALYSE DE MARCHÉ\n\nVente rapide     : Environ ${fmt(threeValues.rapide)} €\nMarché conseillé : Environ ${fmt(threeValues.conseille)} €\nPrix ambitieux   : Environ ${fmt(threeValues.ambitieux)} €\n\nCes valeurs sont calculées à partir des prix de vente réels enregistrés (P25/médiane/P75). Elles constituent des repères, pas des prix garantis.`;
    } else {
      result = `VALEUR INDICATIVE : Environ ${fmt(indicative_value)} €\nPrix au m² constaté : ${fmt(price_m2)} €/m² · ${count} vente(s) · rayon de ${radiusMeters} m`;
    }
    result += `\n\nDonnées : ${count} ventes · périmètre ${radiusMeters} m · source DVF Cerema`;
    if (period_from && period_to) result += ` · ${fmtDate(period_from)} – ${fmtDate(period_to)}`;
  } else {
    result = `Estimation non disponible (statut : ${estimation_status}).`;
  }

  return `Bonjour ${prenom},\n\nVOTRE RAPPORT D'ESTIMATION — Vendu Par Moi\n\nBien : ${property_type} · ${loc} · ${surface} m²\n\n${result}\n\n---\nEt si votre bien valait davantage ?\nDemander un échange personnalisé : ${BASE_URL}/entretien\n\n---\nEstimation indicative — données DVF (Cerema). Ne constitue pas une expertise immobilière.\nVendu Par Moi · contact@venduparmoi.fr · ${BASE_URL}/confidentialite`;
}

/* ── Notification interne ── */
function buildInternalHtml(data) {
  const { prenom, email, phone, callback_consent,
    phone_consent, email_consent,
    raw_address, surface, property_type,
    estimation_status, price_m2, indicative_value, created_at, ip_hash,
    threeValues } = data;
  const dateStr  = fmtDate(created_at || new Date().toISOString());
  const statusOk = estimation_status === 'ok';

  const row = (label, value) => !value ? '' : `<tr>
    <td class="detail-label" style="padding:10px 16px;font-size:15px;color:#75665C;border-bottom:1px solid #EFD5C5;width:38%;vertical-align:top;">${label}</td>
    <td class="detail-value" style="padding:10px 16px;font-size:15px;font-weight:600;color:#1C0804;border-bottom:1px solid #EFD5C5;word-wrap:break-word;word-break:break-word;">${value}</td>
  </tr>`;

  const checkmark = (v) => v ? '<span style="color:#9E3A18;">&#10003; Oui</span>' : 'Non';

  const body = `
<h1 style="font-size:18px;font-weight:700;color:#1C0804;margin:0 0 4px;">Nouvelle demande d'estimation</h1>
<p style="font-size:14px;color:#75665C;margin:0 0 24px;">Reçue le ${esc(dateStr)}</p>

<p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9E3A18;margin:0 0 8px;">Prospect</p>
<table class="detail-table" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;border:1px solid #EFD5C5;border-radius:8px;overflow:hidden;margin:0 0 20px;">
  ${row('Prénom', esc(prenom))}
  ${row('E-mail', `<a href="mailto:${esc(email)}" style="color:#9E3A18;text-decoration:none;">${esc(email)}</a>`)}
  ${row('Téléphone', phone ? esc(phone) : '—')}
  ${row('Rappel téléphonique', checkmark(callback_consent))}
  ${row('Prospection téléphonique', checkmark(phone_consent))}
  ${row('Marketing e-mail', checkmark(email_consent))}
</table>

<p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9E3A18;margin:0 0 8px;">Bien</p>
<table class="detail-table" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;border:1px solid #EFD5C5;border-radius:8px;overflow:hidden;margin:0 0 20px;">
  ${row('Type', esc(property_type || '—'))}
  ${row('Adresse saisie', esc(raw_address || '—'))}
  ${row('Surface', surface ? `${surface} m²` : '—')}
</table>

<p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9E3A18;margin:0 0 8px;">Résultat du calcul</p>
<table class="detail-table" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;border:1px solid #EFD5C5;border-radius:8px;overflow:hidden;margin:0 0 20px;">
  <tr>
    <td class="detail-label" style="padding:10px 16px;font-size:15px;color:#75665C;border-bottom:1px solid #EFD5C5;width:38%;">Statut</td>
    <td class="detail-value" style="padding:10px 16px;font-size:15px;font-weight:700;color:${statusOk ? '#9E3A18' : '#C45E39'};border-bottom:1px solid #EFD5C5;word-wrap:break-word;word-break:break-word;">${esc(estimation_status || '—')}</td>
  </tr>
  ${statusOk ? row('Valeur indicative (médiane)', indicative_value ? `${fmt(indicative_value)} €` : '—') : ''}
  ${statusOk ? row('Prix au m²', price_m2 ? `${fmt(price_m2)} €/m²` : '—') : ''}
  ${threeValues ? `<tr><td colspan="2" style="padding:4px 14px;background:#FDF5EE;border-bottom:1px solid #EFD5C5;">
    <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#9E3A18;margin:0;">Scénarios rapport</p>
  </td></tr>
  ${row('Vente rapide (P25)', `${fmt(threeValues.rapide)} €`)}
  ${row('Marché conseillé (P50)', `${fmt(threeValues.conseille)} €`)}
  ${row('Prix ambitieux (P75)', `${fmt(threeValues.ambitieux)} €`)}` : ''}
</table>

<p style="font-size:13px;color:#75665C;margin:0;">IP hash : ${esc(ip_hash || '—')}</p>`;

  return shell(body, `Nouvelle estimation — ${prenom || email}`, 'Notification interne');
}

function buildInternalText(data) {
  const { prenom, email, phone, callback_consent, phone_consent, email_consent,
    raw_address, surface, property_type,
    estimation_status, price_m2, indicative_value, threeValues } = data;
  let resultLine = `Statut : ${estimation_status}`;
  if (estimation_status === 'ok') {
    resultLine += `\nValeur indicative : ${fmt(indicative_value)} €\nPrix/m² : ${fmt(price_m2)} €/m²`;
    if (threeValues) {
      resultLine += `\n\nScénarios rapport\nVente rapide     : ${fmt(threeValues.rapide)} €\nMarché conseillé : ${fmt(threeValues.conseille)} €\nPrix ambitieux   : ${fmt(threeValues.ambitieux)} €`;
    }
  }
  const yn = (v) => v ? 'Oui' : 'Non';
  return `Nouvelle demande d'estimation — Vendu Par Moi\n\nPROSPECT\nPrénom               : ${prenom}\nEmail                : ${email}\nTél.                 : ${phone || '—'}\nRappel               : ${yn(callback_consent)}\nProspect. tél.       : ${yn(phone_consent)}\nMarketing e-mail     : ${yn(email_consent)}\n\nBIEN\nType    : ${property_type}\nAdresse : ${raw_address}\nSurface : ${surface} m²\n\nRÉSULTAT\n${resultLine}`;
}

/* ── Envoi des deux emails ── */
async function sendEstimationEmails(data) {
  if (!getResend()) {
    console.warn('[ESTIM-EMAIL] RESEND_API_KEY manquant — aucun email envoyé');
    return { emailSent: false, notifSent: false };
  }

  // Enrich data: map URL (non-blocking, fallback to null) + three values (computed once for both emails)
  const mapUrl      = await getMapUrl(data.raw_address, data.postal_code).catch(() => null);
  const threeValues = data.estimation_status === 'ok' ? computeThreeValues(data.comparables, data.surface) : null;
  const enriched    = { ...data, mapUrl, threeValues };

  const prospectSubject = `Votre rapport d’estimation — Vendu Par Moi`;
  const internalSubject = `Nouvelle estimation — ${data.prenom || data.email} (${data.estimation_status})`;

  const [emailSent, notifSent] = await Promise.all([
    rawSend(data.email,  prospectSubject, buildProspectHtml(enriched), buildProspectText(enriched)),
    rawSend(ADMIN_EMAIL, internalSubject, buildInternalHtml(enriched), buildInternalText(enriched)),
  ]);

  return { emailSent, notifSent };
}

/* ── Notification interne : demande de rappel depuis /entretien ── */
function buildCallbackNotifHtml(data) {
  const { email, phone, prenom, raw_address, surface, property_type,
    indicative_value, sell_horizon, source, created_at } = data;

  const dateStr = fmtDate(created_at || new Date().toISOString());

  const HORIZON_LABELS = {
    moins_3_mois: 'Moins de 3 mois',
    '3_6_mois':  '3 à 6 mois',
    '6_12_mois': '6 à 12 mois',
    plus_12_mois: 'Plus d\'un an',
    indecis:     'Pas encore décidé',
  };

  const row = (label, value) => !value ? '' : `<tr>
    <td class="detail-label" style="padding:10px 16px;font-size:15px;color:#75665C;border-bottom:1px solid #EFD5C5;width:38%;vertical-align:top;">${label}</td>
    <td class="detail-value" style="padding:10px 16px;font-size:15px;font-weight:600;color:#1C0804;border-bottom:1px solid #EFD5C5;word-wrap:break-word;word-break:break-word;">${value}</td>
  </tr>`;

  const body = `
<h1 style="font-size:18px;font-weight:700;color:#1C0804;margin:0 0 4px;">Demande d'échange personnalisé</h1>
<p style="font-size:14px;color:#75665C;margin:0 0 24px;">Reçue le ${esc(dateStr)}${source && source !== 'email_cta' ? ` · source : ${esc(source)}` : ''}</p>

<p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9E3A18;margin:0 0 8px;">Contact</p>
<table class="detail-table" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;border:1px solid #EFD5C5;border-radius:8px;overflow:hidden;margin:0 0 20px;">
  ${row('Prénom', prenom ? esc(prenom) : null)}
  ${row('E-mail', `<a href="mailto:${esc(email)}" style="color:#9E3A18;text-decoration:none;">${esc(email)}</a>`)}
  ${row('Téléphone', phone ? `<strong style="font-size:14px;">${esc(phone)}</strong>` : '<span style="color:#C45E39;">Non communiqué</span>')}
  ${row('Horizon de vente', sell_horizon ? esc(HORIZON_LABELS[sell_horizon] || sell_horizon) : null)}
</table>

${raw_address ? `
<p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9E3A18;margin:0 0 8px;">Bien associé</p>
<table class="detail-table" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;border:1px solid #EFD5C5;border-radius:8px;overflow:hidden;margin:0 0 20px;">
  ${row('Type', property_type ? esc(property_type) : null)}
  ${row('Adresse', esc(raw_address))}
  ${row('Surface', surface ? `${surface} m²` : null)}
  ${row('Estimation indicative', indicative_value ? `${fmt(indicative_value)} €` : null)}
</table>` : ''}`;

  return shell(body, `Demande d'échange — ${prenom || email}`, 'Notification interne');
}

function buildCallbackNotifText(data) {
  const { email, phone, prenom, raw_address, surface, property_type,
    indicative_value, sell_horizon, created_at } = data;
  const dateStr = fmtDate(created_at || new Date().toISOString());
  return `Demande d'échange personnalisé — Vendu Par Moi\n\nReçue le : ${dateStr}\n\nCONTACT\nPrénom   : ${prenom || '—'}\nEmail    : ${email}\nTél.     : ${phone || 'Non communiqué'}\nHorizon  : ${sell_horizon || '—'}\n\n${raw_address ? `BIEN\nAdresse  : ${raw_address}\nSurface  : ${surface ? surface + ' m²' : '—'}\nType     : ${property_type || '—'}\nEstimation : ${indicative_value ? fmt(indicative_value) + ' €' : '—'}` : ''}`;
}

async function sendCallbackNotif(data) {
  if (!getResend()) {
    console.warn('[ESTIM-EMAIL] RESEND_API_KEY manquant — notification de rappel non envoyée');
    return false;
  }
  const subject = `Rappel demandé — ${data.prenom || data.email}`;
  return rawSend(ADMIN_EMAIL, subject, buildCallbackNotifHtml(data), buildCallbackNotifText(data));
}

module.exports = { buildProspectHtml, buildProspectText, buildInternalHtml, buildInternalText, buildCallbackNotifHtml, buildCallbackNotifText, sendEstimationEmails, sendCallbackNotif };
