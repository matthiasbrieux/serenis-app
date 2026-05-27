#!/usr/bin/env node
// =============================================
// VENDU PAR MOI — Système Multi-Agents (60)
// =============================================
'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const { writeFileSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');

// ── Convertisseur Markdown → HTML ────────────────────────────
function mdToHtml(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>')
    .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/\bPRIORITÉ 1\b/g, '<span class="p1">PRIORITÉ 1</span>')
    .replace(/\bPRIORITÉ 2\b/g, '<span class="p2">PRIORITÉ 2</span>')
    .replace(/\bPRIORITÉ 3\b/g, '<span class="p3">PRIORITÉ 3</span>')
    .replace(/\b(ALERTE|RISQUE|ATTENTION|MENACE)(\s*:)/g, '<span class="alert">$1$2</span>')
    .replace(/\b(OPPORTUNITÉ|INNOVATION|INSIGHT CLEF)(\s*:)/g, '<span class="opp">$1$2</span>')
    .replace(/\b(CHALLENGE)(\s*:)/g, '<span class="challenge">$1$2</span>')
    .split('\n\n').map(p => p.trim().startsWith('<') ? p : `<p>${p}</p>`).join('\n');
}

// ── Générateur rapport HTML ───────────────────────────────────
function generateHTML(allResults, directionResults, elapsed, ts) {
  const teamColors = {
    '01 · Stratégie Globale':          '#06b6d4',
    '02 · Marketing Facebook':         '#3b82f6',
    '03 · Marketing TikTok':           '#a855f7',
    '04 · Google Ads & SEO':           '#eab308',
    '05 · UX & Design':                '#f97316',
    '06 · Fonctionnalités':            '#22c55e',
    '07 · Documents & Automatisation': '#ef4444',
    '08 · Psychologie & Conversion':   '#06b6d4',
    '09 · Intelligence Concurrentielle':'#f1f5f9',
    '10 · Direction Générale':         '#fbbf24',
  };

  const dirSections = directionResults.map(r => `
    <div class="dir-card">
      <div class="dir-card-title">${r.agent}</div>
      <div class="dir-card-body">${mdToHtml(r.content)}</div>
    </div>`).join('');

  const teamSections = [...new Set(allResults.map(r => r.team))].map(team => {
    const color = teamColors[team] || '#888';
    const agents = allResults.filter(r => r.team === team);
    const cards = agents.map(r => `
      <div class="agent-card">
        <div class="agent-title">${r.agent}</div>
        <div class="agent-body">${mdToHtml(r.content)}</div>
      </div>`).join('');
    return `
    <section class="team-section" id="${team.replace(/\W+/g, '-')}">
      <div class="team-header" style="border-left:4px solid ${color}">
        <span class="team-dot" style="background:${color}"></span>
        <h2>${team}</h2>
        <span class="agent-count">${agents.length} agents</span>
      </div>
      <div class="agents-grid">${cards}</div>
    </section>`;
  }).join('');

  const navItems = [...new Set(allResults.map(r => r.team))].map(team => {
    const color = teamColors[team] || '#888';
    return `<a href="#${team.replace(/\W+/g, '-')}" class="nav-item">
      <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;margin-right:8px;flex-shrink:0"></span>${team}
    </a>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rapport Stratégique — Vendu Par Moi</title>
<style>
  :root {
    --bg: #0f0f0f; --bg2: #161616; --bg3: #1e1e1e;
    --border: #2a2a2a; --text: #e2e2e2; --muted: #888;
    --accent: #22c55e; --gold: #fbbf24;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif; font-size: 14px; line-height: 1.7; }
  a { color: inherit; text-decoration: none; }

  /* HEADER */
  .header { background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #0f0f0f 100%); padding: 48px 40px; border-bottom: 1px solid var(--border); position: relative; overflow: hidden; }
  .header::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 70% 50%, rgba(34,197,94,0.07) 0%, transparent 60%); pointer-events: none; }
  .header-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); border-radius: 100px; padding: 4px 14px; font-size: 12px; color: var(--accent); margin-bottom: 20px; }
  .header h1 { font-size: clamp(28px,4vw,48px); font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; }
  .header h1 span { color: var(--accent); }
  .header-meta { margin-top: 16px; color: var(--muted); font-size: 13px; display: flex; gap: 24px; flex-wrap: wrap; }
  .header-meta strong { color: var(--text); }
  .stat-pill { background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; padding: 8px 16px; display: inline-flex; flex-direction: column; align-items: center; }
  .stat-pill .num { font-size: 22px; font-weight: 700; color: var(--accent); }
  .stat-pill .lbl { font-size: 11px; color: var(--muted); }
  .header-stats { display: flex; gap: 12px; margin-top: 24px; flex-wrap: wrap; }

  /* LAYOUT */
  .layout { display: flex; min-height: 100vh; }
  .sidebar { width: 260px; flex-shrink: 0; background: var(--bg2); border-right: 1px solid var(--border); position: sticky; top: 0; height: 100vh; overflow-y: auto; padding: 24px 0; }
  .sidebar-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); padding: 0 20px 12px; }
  .nav-item { display: flex; align-items: center; padding: 8px 20px; font-size: 12px; color: var(--muted); transition: all 0.15s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .nav-item:hover { background: var(--bg3); color: var(--text); }

  /* CONTENT */
  .content { flex: 1; min-width: 0; padding: 0 40px 80px; }

  /* DIRECTION */
  .direction-section { padding: 48px 0 40px; border-bottom: 1px solid var(--border); }
  .direction-section h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--gold); margin-bottom: 24px; display: flex; align-items: center; gap: 10px; }
  .direction-section h2::after { content: ''; flex: 1; height: 1px; background: var(--border); }
  .dir-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(440px, 1fr)); gap: 16px; }
  .dir-card { background: linear-gradient(135deg, #1a1a0f 0%, #1e1e1e 100%); border: 1px solid #2d2d1a; border-radius: 12px; overflow: hidden; }
  .dir-card-title { background: rgba(251,191,36,0.08); border-bottom: 1px solid #2d2d1a; padding: 14px 20px; font-size: 13px; font-weight: 600; color: var(--gold); }
  .dir-card-body { padding: 20px; font-size: 13px; line-height: 1.75; }

  /* TEAMS */
  .team-section { padding: 48px 0 32px; border-bottom: 1px solid var(--border); }
  .team-header { display: flex; align-items: center; gap: 12px; padding-left: 16px; margin-bottom: 24px; }
  .team-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .team-header h2 { font-size: 18px; font-weight: 700; }
  .agent-count { margin-left: auto; font-size: 12px; color: var(--muted); background: var(--bg3); border: 1px solid var(--border); border-radius: 100px; padding: 2px 10px; }
  .agents-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 14px; }
  .agent-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; transition: border-color 0.2s; }
  .agent-card:hover { border-color: #444; }
  .agent-title { padding: 12px 18px; font-size: 12px; font-weight: 600; color: var(--muted); border-bottom: 1px solid var(--border); text-transform: uppercase; letter-spacing: 0.05em; background: var(--bg3); }
  .agent-body { padding: 18px; font-size: 13px; line-height: 1.75; }
  .agent-body h1,.agent-body h2,.agent-body h3 { color: #c4c4c4; margin: 12px 0 6px; font-size: 13px; font-weight: 600; }
  .agent-body p { margin-bottom: 10px; color: #c8c8c8; }
  .agent-body ul { padding-left: 16px; margin-bottom: 10px; }
  .agent-body li { margin-bottom: 4px; color: #c0c0c0; }
  .agent-body strong { color: #e8e8e8; }

  /* BADGES */
  .p1 { display: inline-block; background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); border-radius: 4px; padding: 1px 8px; font-size: 11px; font-weight: 700; }
  .p2 { display: inline-block; background: rgba(251,191,36,0.12); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); border-radius: 4px; padding: 1px 8px; font-size: 11px; font-weight: 700; }
  .p3 { display: inline-block; background: rgba(34,197,94,0.1); color: #4ade80; border: 1px solid rgba(34,197,94,0.25); border-radius: 4px; padding: 1px 8px; font-size: 11px; font-weight: 700; }
  .alert { color: #f87171; font-weight: 600; }
  .opp { color: #4ade80; font-weight: 600; }
  .challenge { color: #fbbf24; font-weight: 600; }

  /* SCROLLBAR */
  ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: var(--bg); } ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

  @media (max-width: 900px) {
    .sidebar { display: none; }
    .content { padding: 0 20px 60px; }
    .agents-grid, .dir-grid { grid-template-columns: 1fr; }
    .header { padding: 32px 20px; }
  }
</style>
</head>
<body>

<div class="header">
  <div class="header-badge">⚡ 75 Agents IA — Analyse en parallèle</div>
  <h1>Rapport Stratégique<br><span>Vendu Par Moi</span></h1>
  <div class="header-stats">
    <div class="stat-pill"><span class="num">60</span><span class="lbl">Agents</span></div>
    <div class="stat-pill"><span class="num">10</span><span class="lbl">Équipes</span></div>
    <div class="stat-pill"><span class="num">${elapsed}s</span><span class="lbl">Durée</span></div>
    <div class="stat-pill"><span class="num">${allResults.length + directionResults.length}</span><span class="lbl">Rapports</span></div>
  </div>
  <div class="header-meta">
    Généré le <strong>${new Date().toLocaleString('fr-FR')}</strong> · Modèle : <strong>claude-haiku-4-5</strong>
  </div>
</div>

<div class="layout">
  <nav class="sidebar">
    <div class="sidebar-title">Navigation</div>
    <a href="#direction" class="nav-item" style="color:#fbbf24;font-weight:600">⭐ Direction Générale</a>
    ${navItems}
  </nav>

  <main class="content">
    <section class="direction-section" id="direction">
      <h2>Direction Générale — Synthèses</h2>
      <div class="dir-grid">${dirSections}</div>
    </section>
    ${teamSections}
  </main>
</div>

</body>
</html>`;
}

const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Contexte global ───────────────────────────────────────────
const CTX = `
Tu es un expert de haut niveau dans ton domaine, travaillant pour "VENDU PAR MOI" (anciennement Serenis).

VENDU PAR MOI est une solution immobilière française qui permet aux particuliers de vendre leur bien eux-mêmes avec des outils professionnels :
- Photos professionnelles
- Visite virtuelle 360°
- Guides vendeurs complets
- Assistance humaine + IA
- Automatisation du parcours
- Marketing de l'annonce
- Accompagnement de A à Z

Offre actuelle :
- Pack Autonome : 99€ TTC
- Pack Sérénité : 999€ TTC
- Économie moyenne vendeur : 9 001€ (vs commission agence 3-7%)

RÈGLES ABSOLUES :
1. Ne te limite JAMAIS à répondre uniquement ce qui est demandé
2. Détecte et signale automatiquement : faiblesses, risques, coûts cachés, problèmes juridiques, opportunités
3. Challenge les idées existantes si une meilleure alternative existe
4. Identifie ce qui manque, ce qui peut être automatisé, ce qui peut augmenter les conversions
5. Classe tes recommandations : PRIORITÉ 1 (indispensable) / PRIORITÉ 2 (fortement recommandé) / PRIORITÉ 3 (amélioration future)
6. Pense comme un comité de direction dont l'objectif est de rendre ce projet imbattable

Réponds en français. Sois concret, chiffré, actionnable. Maximum 700 mots.
`;

// ── Couleurs console ──────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', blue: '\x1b[34m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', red: '\x1b[31m', magenta: '\x1b[35m',
  white: '\x1b[37m', gray: '\x1b[90m', orange: '\x1b[38;5;214m',
};

// ── Progress ──────────────────────────────────────────────────
let completed = 0;
let total = 0;
const startTime = Date.now();

function log(teamColor, icon, teamName, agentName, status) {
  if (status === 'done') completed++;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const filled = Math.floor(pct / 5);
  const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  process.stdout.write(
    `\r${teamColor}${icon}${C.reset} [${bar}] ${C.bold}${pct}%${C.reset} ${C.gray}(${completed}/${total}) ${elapsed}s${C.reset}  ${C.dim}${teamName} › ${agentName}${C.reset}          `
  );
  if (status === 'done' || status === 'error') process.stdout.write('\n');
}

// ── Appel API ─────────────────────────────────────────────────
async function runAgent(teamName, teamColor, agentName, prompt, retries = 2) {
  log(teamColor, '→', teamName, agentName, 'start');
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        messages: [{ role: 'user', content: CTX + '\n\n' + prompt }],
      });
      const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
      log(teamColor, '✓', teamName, agentName, 'done');
      return { team: teamName, agent: agentName, content: text };
    } catch (err) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      } else {
        log(teamColor, '✗', teamName, agentName, 'error');
        return { team: teamName, agent: agentName, content: `[ERREUR: ${err.message}]` };
      }
    }
  }
}

// ── Semaphore ─────────────────────────────────────────────────
function createSemaphore(limit) {
  let active = 0;
  const queue = [];
  return () => new Promise(resolve => {
    const tryRun = () => {
      if (active < limit) {
        active++;
        resolve(() => { active--; if (queue.length) queue.shift()(); });
      } else {
        queue.push(tryRun);
      }
    };
    tryRun();
  });
}

// ══════════════════════════════════════════════════════════════
// DÉFINITION DES 54 AGENTS PRIMAIRES (9 équipes × 6 agents)
// ══════════════════════════════════════════════════════════════
const TEAMS = [

  // ── ÉQUIPE 1 : STRATÉGIE GLOBALE ──────────────────────────
  {
    name: '01 · Stratégie Globale',
    color: C.cyan,
    agents: [
      {
        name: 'Modèle économique',
        prompt: `Crée le modèle économique optimal pour Vendu Par Moi.
Inclure : sources de revenus primaires et secondaires, structure tarifaire complète (packs, abonnements, upsells, commissions partenaires), projection MRR/ARR pour 100 / 500 / 1000 clients.
CHALLENGE : Le gap entre 99€ et 999€ est-il optimal ? Un abonnement mensuel (29€/mois) serait-il plus rentable qu'un prix fixe ? Analyse les deux modèles et recommande.
Identifie les 3 risques principaux du modèle actuel et propose des corrections.`,
      },
      {
        name: 'Positionnement & différenciation',
        prompt: `Définis le positionnement stratégique de Vendu Par Moi en 2025.
Réponds précisément : Pourquoi choisir Vendu Par Moi plutôt qu'une agence ? (5 arguments béton, chiffrés)
Pourquoi choisir Vendu Par Moi plutôt que PAP.fr ou Leboncoin ? (5 arguments)
Quel est l'avantage concurrentiel difficile à copier dans 2 ans ?
CHALLENGE : "Vendre sans agence" est-ce un bon positionnement ou faut-il le reformuler ? Propose 3 alternatives de positionnement plus percutantes. Classe-les.`,
      },
      {
        name: 'Offres & pricing',
        prompt: `Analyse et challenge les offres actuelles (Pack Autonome 99€ / Pack Sérénité 999€).
PROBLÈME IDENTIFIÉ : le gap de 900€ entre les deux packs crée une zone morte. Propose :
- Structure d'offre en 3 niveaux optimale avec pricing psychologique
- Contenu exact de chaque pack
- Upsells possibles après achat
- Services récurrents (abonnement mensuel ?)
- Offre premium pour biens > 400k€
Chiffre le potentiel de revenu par client sur 12 mois avec la nouvelle structure.`,
      },
      {
        name: 'Avantage concurrentiel',
        prompt: `Identifie les 5 avantages concurrentiels que Vendu Par Moi doit construire pour devenir imbattable.
Pour chaque avantage : description, comment le construire, délai, coût estimé, difficulté à copier (score /10).
INNOVATION : Propose 2 idées de fonctionnalités ou services qu'AUCUN concurrent n'a et qui rendraient Vendu Par Moi viral.
RISQUE : Quels éléments peuvent faire échouer ce projet dans les 12 premiers mois ? Liste les 5 menaces critiques avec plan de mitigation.`,
      },
      {
        name: 'Revenus complémentaires',
        prompt: `Identifie et chiffre tous les revenus complémentaires possibles pour Vendu Par Moi au-delà des packs.
Sources à analyser : partenariats (notaires, diagnostiqueurs, déménageurs, courtiers, banques), marketplace de prestataires, formation en ligne, franchise/licence du modèle, B2B (promoteurs, marchands de biens), assurance annonce, financement vendeur.
Pour chaque source : potentiel revenu mensuel, effort d'implémentation, délai de mise en place.
Classe par ROI décroissant. Lequel lancer en premier ?`,
      },
      {
        name: 'Analyse des risques stratégiques',
        prompt: `Joue le rôle d'avocat du diable pour Vendu Par Moi.
Identifie TOUS les risques qui peuvent tuer ce projet :
- Risques réglementaires (Loi Hoguet, statut juridique de la plateforme)
- Risques concurrentiels (si SeLoger lance une offre similaire demain)
- Risques financiers (coût d'acquisition trop élevé, churn)
- Risques opérationnels (qualité des photos, taux de succès des ventes)
- Risques marché (retournement marché immo)
Pour chaque risque : probabilité (1-5), impact (1-5), plan de réponse.
Quels sont les 3 risques non-négociables à adresser avant le lancement ?`,
      },
    ],
  },

  // ── ÉQUIPE 2 : MARKETING FACEBOOK ─────────────────────────
  {
    name: '02 · Marketing Facebook',
    color: C.blue,
    agents: [
      {
        name: 'Stratégie Facebook Ads',
        prompt: `Crée la stratégie Facebook Ads complète pour Vendu Par Moi.
Structure : campagnes awareness → considération → conversion → retargeting → LTV.
Inclure : objectifs par campagne, type d'audience, format publicitaire, budget recommandé, KPIs, ROAS cible.
CHALLENGE : Facebook Ads est-il le meilleur canal ou existe-t-il mieux pour ce marché ? Compare avec Google Ads, YouTube, TikTok. Recommande le mix optimal pour 2025.`,
      },
      {
        name: 'Audiences & ciblage',
        prompt: `Crée 6 audiences Facebook/Instagram ultra-précises pour Vendu Par Moi.
Pour chaque : nom, âge, centres d'intérêt spécifiques, comportements, taille estimée (FR), message adapté.
Audience 1 : vendeurs actifs (bien sur le marché)
Audience 2 : vendeurs en réflexion (cherchent leur prix)
Audience 3 : lookalike clients existants
Audience 4 : retargeting visiteurs site (chaud)
Audience 5 : retargeting abandonnistes paiement (très chaud)
Audience 6 : entourage propriétaires (parents/amis qui vont vendre)
Pour le retargeting : séquence de 5 messages sur 30 jours avec escalade d'urgence.`,
      },
      {
        name: '30 idées publicitaires',
        prompt: `Crée 30 idées de publicités Facebook/Instagram pour Vendu Par Moi. Variées : vidéo, image, carrousel, before/after, témoignage, chiffre choc, question, urgence, humour.
Pour chaque : format, accroche (< 10 mots), corps (2-3 lignes), CTA, émotion ciblée (peur/gain/envie/orgueil).
Les 5 meilleures : développe le script complet ou la copy complète.
Identifie le type de pub qui convertira le mieux pour ce marché et justifie.`,
      },
      {
        name: 'Stratégies budget',
        prompt: `Simule 4 stratégies budgétaires Facebook Ads pour Vendu Par Moi :
Budget 500€/mois : comment maximiser ? Quels objectifs réalistes ?
Budget 1000€/mois : structure de campagnes, leads attendus, CA généré
Budget 5000€/mois : scaling, diversification, équipe nécessaire
Budget 10000€/mois : domination marché, structure agency-level

Pour chaque budget :
- Répartition par campagne (%)
- CPL estimé
- Conversions attendues
- CA généré
- ROI
- Seuil de rentabilité
Quel budget minimum pour être viable ?`,
      },
      {
        name: 'Landing pages & CTA',
        prompt: `Conçois 3 landing pages optimisées pour les campagnes Facebook Vendu Par Moi :
LP 1 : ciblée "économie" (je veux économiser les frais d'agence)
LP 2 : ciblée "simplicité" (je veux vendre facilement sans me prendre la tête)
LP 3 : ciblée "rapidité" (je veux vendre vite)

Pour chaque LP : titre (H1), sous-titre, 3 bullet points valeur, social proof, CTA principal, CTA secondaire, éléments de réassurance, design recommandé.
Quel est le taux de conversion cible pour chaque ?
CHALLENGE : Une seule LP universelle ou 3 LP segmentées ? Quelle approche génère plus de revenus ?`,
      },
      {
        name: 'Hooks & copywriting',
        prompt: `Écris les 15 meilleurs hooks publicitaires Facebook pour Vendu Par Moi.
5 hooks orientés "chiffre choc" : basés sur les 9 001€ économisés
5 hooks orientés "peur" : rater de l'argent, être mal accompagné
5 hooks orientés "transformation" : avant (stressé/exploité) → après (libre/riche)

Pour les 5 meilleurs : développe la copy complète (accroche + corps + CTA) prête à publier.
Identifie le hook qui aura le meilleur CTR et justifie avec des principes psychologiques.
Inclure 3 variations A/B à tester en priorité.`,
      },
    ],
  },

  // ── ÉQUIPE 3 : MARKETING TIKTOK ───────────────────────────
  {
    name: '03 · Marketing TikTok',
    color: C.magenta,
    agents: [
      {
        name: 'Stratégie TikTok',
        prompt: `Crée la stratégie TikTok complète pour Vendu Par Moi.
Positionnement : quel persona crée les vidéos ? (fondateur ? vendeur type ? personnage fictif ?)
Format : ratio contenu organique vs TikTok Ads
Fréquence recommandée : combien de vidéos par semaine ?
KPIs : abonnés, vues, leads, conversions
CHALLENGE : TikTok est-il pertinent pour vendre un service immobilier à 35-60 ans ? Analyse la démographie TikTok FR et réponds. Si non pertinent, propose une alternative.
Comment créer une série récurrente qui fidélise et convertit ?`,
      },
      {
        name: '50 idées de vidéos',
        prompt: `Crée 50 idées de vidéos TikTok pour Vendu Par Moi. Catégories :
- 10 vidéos "chiffre choc" (économies, statistiques)
- 10 vidéos "éducatif" (comment estimer son bien, comment faire de belles photos...)
- 10 vidéos "témoignage/UGC" (client qui a vendu, réaction à la commission d'agence)
- 10 vidéos "behind the scenes" (comment fonctionne le service)
- 10 vidéos "trend hijacking" (utiliser les trends viraux du moment)

Pour chaque idée : titre, angle, durée recommandée, potentiel viral (1-10).
Les 5 meilleures : développe le script complet.`,
      },
      {
        name: 'Scripts vidéo viraux',
        prompt: `Écris les scripts complets de 5 vidéos TikTok ultra-virales pour Vendu Par Moi.
Vidéo 1 : "POV : vous venez de payer 15 000€ de commission à une agence" (choc/humour)
Vidéo 2 : "Combien coûte vraiment une agence immobilière ?" (éducatif/chiffres)
Vidéo 3 : "J'ai vendu ma maison seul en 3 semaines, voici comment" (témoignage)
Vidéo 4 : "Ce que les agences ne veulent pas que vous sachiez" (curiosité/peur)
Vidéo 5 : Trend viral du moment adapté à l'immobilier (créatif)

Pour chaque script : accroche (2s), développement (20-40s), CTA (5s), texte à l'écran, musique recommandée.`,
      },
      {
        name: 'Stratégie UGC & témoignages',
        prompt: `Crée la stratégie UGC (User Generated Content) pour Vendu Par Moi.
Comment inciter les clients à créer du contenu : programme d'ambassadeurs, incentives, templates vidéo fournis.
Script type pour un témoignage client parfait (30-60s).
Comment utiliser ces contenus dans les pubs TikTok et Facebook.
Combien coûte une campagne UGC ? ROI estimé vs contenu créé en interne.
INNOVATION : Idée originale pour créer un effet viral massif autour de Vendu Par Moi (concours, défi, hashtag challenge).`,
      },
      {
        name: 'TikTok Ads',
        prompt: `Stratégie TikTok Ads pour Vendu Par Moi.
Formats disponibles : In-Feed, TopView, Branded Hashtag Challenge, Spark Ads
Recommandation : quel format pour quel objectif ?
Budget minimal viable pour TikTok Ads dans l'immobilier.
Audiences disponibles sur TikTok pour cibler des propriétaires 35-60 ans en France.
Simulation : 1000€/mois sur TikTok Ads → leads attendus → CA généré.
Comparatif coût : TikTok Ads vs Facebook Ads pour ce marché spécifique. Lequel choisir ?`,
      },
      {
        name: 'Rendre l\'immobilier viral',
        prompt: `Question centrale : comment rendre l'immobilier viral sur les réseaux sociaux en 2025 ?
C'est un secteur perçu comme ennuyeux et anxiogène. Propose 5 angles créatifs pour le rendre entertaining :
Angle 1 : transformer la "commission d'agence" en ennemi public
Angle 2 : gamification de la vente (montrer le processus comme une aventure)
Angle 3 : transparence radicale (montrer les coulisses de l'immobilier)
Angle 4 : émotion (les histoires de vie derrière les maisons)
Angle 5 : humour absurde (les clichés de l'immobilier)
Pour chaque angle : 3 idées de contenus concrets, potentiel viral, risques.`,
      },
    ],
  },

  // ── ÉQUIPE 4 : GOOGLE ADS & SEO ───────────────────────────
  {
    name: '04 · Google Ads & SEO',
    color: C.yellow,
    agents: [
      {
        name: 'Stratégie SEO',
        prompt: `Crée la stratégie SEO complète pour Vendu Par Moi.
Structure du site recommandée (pages principales + landing pages locales).
30 mots-clés prioritaires : volume mensuel estimé, difficulté, intention (info/commerciale/transactionnelle).
Top 10 articles de blog à créer en priorité avec titre, angle, mots-clés cibles.
Stratégie de backlinks : 5 méthodes adaptées au secteur immobilier.
Objectif réaliste : positionnement page 1 pour quels mots-clés en 3 mois / 6 mois / 12 mois ?
CHALLENGE : Le SEO est-il rentable pour Vendu Par Moi ou le délai est-il trop long ? Arbitrage SEO vs Ads payants.`,
      },
      {
        name: 'Google Ads Search',
        prompt: `Crée la stratégie Google Ads Search pour Vendu Par Moi.
Structure de campagnes : par intention (chaud/tiède/froid), par type de bien, par géographie.
20 mots-clés prioritaires avec CPC estimé et intention.
5 annonces complètes (titre 1/2/3, description 1/2, extensions) prêtes à publier.
Budget minimal pour être présent sur les mots-clés chauds.
CPA cible réaliste pour le Pack Autonome (99€) et Pack Sérénité (999€).
ALERT : Quels mots-clés à exclure absolument ? (acheteurs, locataires, agences en recherche de mandats)`,
      },
      {
        name: 'SEO local & référencement',
        prompt: `Stratégie de référencement local pour Vendu Par Moi.
Comment dominer "vendre maison sans agence [ville]" dans les 20 plus grandes villes FR.
Google My Business : optimisation, catégories, posts, avis.
Landing pages locales : structure, contenu, différenciation par ville.
Partenariats locaux pour backlinks : quels sites locaux ? Comment les obtenir ?
Estimation : quel % du trafic peut venir du local vs national ?
Plan d'action pour être en top 3 local à Paris, Lyon, Marseille, Bordeaux, Nantes.`,
      },
      {
        name: 'Contenu & blog',
        prompt: `Crée le plan de contenu blog complet pour Vendu Par Moi (12 mois).
Catégories : guide vendeur, estimation, aspects juridiques, témoignages, comparatifs.
20 articles détaillés avec : titre SEO, méta-description, plan en 5 points, mots-clés intégrés, CTA vers les offres.
Stratégie de contenu pilier + cluster : quel article pilier créer en premier ?
Combien de temps pour voir des résultats ? Quelles métriques suivre mensuellement ?
INNOVATION : Format contenu qui n'existe pas encore dans l'immobilier (interactif, calculateur, quiz...).`,
      },
      {
        name: 'Google Ads Performance Max & Display',
        prompt: `Stratégie Google Performance Max et Display pour Vendu Par Moi.
Performance Max : comment structurer les assets (images, titres, descriptions, vidéos) ?
Display : audiences d'intention personnalisées pour cibler les vendeurs immobiliers.
YouTube Ads : quel type de vidéo ? Durée ? Script d'une annonce YouTube 15s et 30s.
Remarketing Google : configuration des audiences, messages par segment.
Budget recommandé pour chaque canal Google (Search/PMax/Display/YouTube).
KPIs et seuils d'alerte pour optimiser les campagnes.`,
      },
      {
        name: 'Estimation coût par lead & rentabilité',
        prompt: `Modélise le coût d'acquisition client (CAC) pour Vendu Par Moi sur Google.
Hypothèses : taux de clics, taux de conversion landing page, taux de conversion vente.
Calcule le CAC pour 3 scénarios (pessimiste/réaliste/optimiste) sur :
- Google Search (mots-clés chauds)
- Google Search (mots-clés tièdes)
- SEO organique
Calcule le LTV client (valeur sur 12 mois si upsell).
Quel ratio CAC/LTV minimum pour être viable ?
À quel volume de ventes le CAC devient acceptable ?`,
      },
    ],
  },

  // ── ÉQUIPE 5 : UX & DESIGN ────────────────────────────────
  {
    name: '05 · UX & Design',
    color: C.orange,
    agents: [
      {
        name: 'Psychologie utilisateur & couleurs',
        prompt: `Analyse et recommande la direction design pour Vendu Par Moi.
Palette de couleurs : la combinaison vert forêt (#3D5A47) + terracotta (#C4785A) + crème est-elle optimale pour convertir ? Challenge ce choix. Propose 2 alternatives testées en psychologie des couleurs pour l'immobilier.
Typographie : Cormorant Garamond est-elle la bonne police pour une audience 35-60 ans sur mobile ? Alternative ?
Psychologie : quels biais cognitifs intégrer dans le design (ancrage, preuve sociale, rareté, autorité) ?
Design system : quels composants créer en priorité pour maximiser la confiance ?`,
      },
      {
        name: 'Wireframe page d\'accueil',
        prompt: `Décris le wireframe optimal de la page d'accueil Vendu Par Moi section par section.
Pour chaque section : contenu exact, objectif psychologique, éléments visuels, CTA.
Section 1 : Hero (above the fold) — que doit voir l'utilisateur en 3 secondes ?
Section 2 : Preuve sociale immédiate
Section 3 : Comment ça marche (3 étapes max)
Section 4 : Comparatif agence vs Vendu Par Moi
Section 5 : Témoignages
Section 6 : Offres/Pricing
Section 7 : FAQ
Section 8 : CTA final
Éléments MANQUANTS sur une homepage immobilière typique ? Qu'est-ce qui devrait être ajouté ?`,
      },
      {
        name: 'Parcours utilisateur & navigation',
        prompt: `Cartographie le parcours utilisateur optimal sur Vendu Par Moi.
De la première visite à l'achat : chaque étape, durée estimée, point de friction potentiel, solution.
Analyse les 5 endroits où les utilisateurs abandonnent le plus sur ce type de site et propose des corrections.
Mobile-first : quelles adaptations sont indispensables pour convertir sur mobile (60%+ du trafic) ?
Vitesse : impact du temps de chargement sur les conversions — recommandations techniques.
INNOVATION : Fonctionnalité UX qu'aucun site immo n'a et qui pourrait améliorer le taux de conversion de 30%+.`,
      },
      {
        name: 'Wireframes secondaires',
        prompt: `Décris les wireframes de 4 pages clés pour Vendu Par Moi :
Page Offres/Pricing : comment présenter les packs pour maximiser les ventes du Pack Sérénité ?
Page Témoignages : format, éléments de preuve, organisation, filtres possibles
Page FAQ : organisation, quelles questions en premier, comment réduire les frictions pré-achat
Espace membre/Dashboard : que doit voir le vendeur en premier ? 5 métriques clés à afficher
Pour chaque page : éléments indispensables, éléments à éviter, A/B tests recommandés.`,
      },
      {
        name: 'Éléments de confiance & réassurance',
        prompt: `Identifie tous les éléments de réassurance que Vendu Par Moi doit intégrer pour maximiser la confiance.
Minimum viable : logos partenaires, garanties, certifications, nombre de clients, avis vérifiés.
Au-delà du minimum : quels éléments rares font la différence (live chat, garantie remboursement, résultats publics) ?
Positionnement visuel : où placer ces éléments dans le parcours pour maximum d'impact ?
Benchmark : quels éléments de confiance utilisent les sites qui convertissent le mieux (Airbnb, Doctolib, Amazon) ? Adapter à l'immobilier.
RISQUE : Quels éléments visuels ou textuels créent de la méfiance involontaire ? Les identifier et corriger.`,
      },
      {
        name: 'A/B Tests prioritaires',
        prompt: `Crée le plan de tests A/B prioritaires pour Vendu Par Moi (12 mois).
Top 10 A/B tests à mener avec : hypothèse, variante A vs B, métrique de succès, durée estimée.
Tests prioritaires sur : titre hero, pricing display, CTA principal, formulaire de contact, ordre des sections.
Outil recommandé pour les A/B tests (Hotjar, VWO, Google Optimize) et budget.
Comment mettre en place une culture de l'optimisation continue avec une petite équipe ?
Quel gain de conversion est réaliste avec 6 mois d'optimisation A/B sérieuse ?`,
      },
    ],
  },

  // ── ÉQUIPE 6 : FONCTIONNALITÉS SITE WEB ───────────────────
  {
    name: '06 · Fonctionnalités',
    color: C.green,
    agents: [
      {
        name: 'Fonctionnalités core',
        prompt: `Crée la liste complète et priorisée des fonctionnalités core de Vendu Par Moi.
Évalue chaque fonctionnalité : impact utilisateur (1-5), complexité technique (1-5), priorité.
Fonctionnalités à analyser : agenda visites, visite virtuelle 360°, estimation automatique, calculateur économies, comparateur agence vs VPM, tableau de bord vendeur, messagerie acheteurs/vendeur, notifications temps réel, signature électronique, dossier automatique.
PRIORITÉ 1 : Sans quoi le produit ne peut pas être lancé ?
CHALLENGE : La visite virtuelle est-elle un différenciateur suffisant ou est-ce devenu un standard ? Qu'est-ce qui différencie vraiment ?`,
      },
      {
        name: 'IA & automatisation produit',
        prompt: `Intégration IA dans Vendu Par Moi : quelles fonctionnalités IA pour 2025 ?
IA prioritaires à développer :
1. Assistant IA vendeur (répond aux questions des acheteurs 24h/24)
2. Estimation automatique du prix (API DVF + données marché)
3. Génération automatique de l'annonce (GPT)
4. Scoring des prospects acheteurs (qui est vraiment prêt à acheter)
5. Recommandations personnalisées (baisser le prix, ajouter des photos...)
Pour chaque : faisabilité technique, coût de développement estimé, API à utiliser, ROI attendu.
INNOVATION : Fonctionnalité IA qu'aucun concurrent n'a encore.`,
      },
      {
        name: 'CRM & gestion clients',
        prompt: `Conçois le CRM interne de Vendu Par Moi pour gérer les vendeurs et les prospects.
Fonctionnalités CRM minimum viable : pipeline vendeurs, statuts, historique interactions, relances auto.
Dashboard admin : quelles métriques suivre en temps réel ?
Intégration avec : email marketing (Brevo/Sendgrid), SMS (Twilio), agenda, signature électronique.
Comment automatiser 80% des interactions support sans perdre en qualité ?
Outil externe (HubSpot, Pipedrive) vs développement interne : recommandation et justification.`,
      },
      {
        name: 'Innovations concurrentielles',
        prompt: `Propose 10 fonctionnalités innovantes que AUCUN concurrent immobilier n'utilise actuellement.
Pour chaque innovation :
- Description précise
- Problème qu'elle résout
- Complexité technique (facile/moyen/difficile)
- Impact sur la conversion ou la rétention
- Comment la breveter ou la protéger

Focus sur : gamification, IA, social proof en temps réel, transparence marché, community features.
Laquelle déployer en premier pour créer un effet wow médiatique ?`,
      },
      {
        name: 'Espace membre & dashboard vendeur',
        prompt: `Conçois l'espace membre parfait pour un vendeur Vendu Par Moi.
Ce que le vendeur doit voir en arrivant : statut de sa vente, nb de vues de l'annonce, nb de contacts, prochaines visites, score d'optimisation de l'annonce.
Fonctionnalités de l'espace membre : gestion photos, édition annonce, agenda visites, messagerie acheteurs, suivi dossier, documents, tutoriels contextuels.
Comment gamifier l'expérience vendeur pour maximiser son engagement ?
Notifications idéales : quand envoyer quoi ? (email, SMS, push) — ne pas sur-notifier mais ne jamais laisser le vendeur sans nouvelles.`,
      },
      {
        name: 'Intégrations & API',
        prompt: `Liste toutes les intégrations et API nécessaires ou recommandées pour Vendu Par Moi.
Intégrations obligatoires : Stripe (paiement), Twilio (SMS), Sendgrid (email), Cloudinary (photos), API DVF (prix marché).
Intégrations fortement recommandées : Calendly/Cal.com (agenda), DocuSign/Yousign (signature), Google Analytics 4, Meta Pixel, Hotjar.
Intégrations innovantes : API notaires, API DPE, API cadastre, API EDF (performance énergétique).
Comment architecturer ces intégrations pour qu'elles soient maintenables à long terme ?
Coût mensuel total des APIs estimé pour 100 / 500 / 1000 clients actifs.`,
      },
    ],
  },

  // ── ÉQUIPE 7 : DOCUMENTS & AUTOMATISATION ─────────────────
  {
    name: '07 · Documents & Automatisation',
    color: C.red,
    agents: [
      {
        name: 'Guides vendeurs',
        prompt: `Crée le plan détaillé des 5 guides vendeurs indispensables pour Vendu Par Moi.
Guide 1 : "Comment estimer le prix de son bien" (méthodologie, outils, erreurs à éviter)
Guide 2 : "Comment préparer et réussir les visites" (mise en scène, questions types, filtrer les acheteurs)
Guide 3 : "Comment négocier comme un pro" (techniques, scripts, erreurs fatales)
Guide 4 : "Le compromis de vente expliqué" (étapes, délais, clauses importantes)
Guide 5 : "Comment créer une annonce qui cartonne" (titre, description, photos, diffusion)
Pour chaque guide : table des matières complète (10 sections minimum), longueur recommandée, format (PDF/vidéo/interactif).`,
      },
      {
        name: 'Séquences emails automatiques',
        prompt: `Crée les 6 séquences d'emails automatiques prioritaires pour Vendu Par Moi.
Séquence 1 : Bienvenue après achat Pack Autonome (7 emails sur 14 jours)
Séquence 2 : Bienvenue après achat Pack Sérénité (7 emails sur 14 jours)
Séquence 3 : Nurturing lead (n'a pas acheté) — 5 emails sur 21 jours
Séquence 4 : Relance prospect inactif (plus de connexion depuis 7 jours)
Séquence 5 : Upsell Autonome → Sérénité (déclenchée à J+7 après achat Autonome)
Séquence 6 : Demande d'avis après vente réussie
Pour chaque email : objet, preheader, contenu (150 mots), CTA.`,
      },
      {
        name: 'Automatisation SMS',
        prompt: `Crée toutes les automatisations SMS pour Vendu Par Moi.
SMS déclencheurs prioritaires :
- Confirmation achat pack (immédiat)
- Rappel visite à J-24h et J-2h
- Nouvelle demande de visite reçue
- Nouveau message d'un acheteur
- Annonce en ligne depuis 30 jours sans offre (alerte vendeur)
- Relance prospect qui n'a pas acheté (J+3, J+7, J+14)
Pour chaque SMS : déclencheur, texte exact (< 160 caractères), personnalisation, opt-out.
ALERTE : Réglementation SMS marketing en France — que doit-on obligatoirement faire ?`,
      },
      {
        name: 'Automatisation workflows',
        prompt: `Conçois les 10 workflows d'automatisation prioritaires pour Vendu Par Moi.
Workflow 1 : Onboarding vendeur (de l'achat à l'annonce en ligne)
Workflow 2 : Qualification automatique des acheteurs (score, relance, suppression des non-qualifiés)
Workflow 3 : Gestion des visites (confirmation, rappel, compte-rendu, suivi)
Workflow 4 : Relance annonce sans visite après 2 semaines
Workflow 5 : Détection d'un bien sous-évalué ou surévalué (alerte auto)
Workflow 6-10 : [propose les 5 workflows manquants les plus impactants]
Pour chaque : déclencheur, étapes, outils (Zapier/Make/interne), résultat attendu.`,
      },
      {
        name: 'Documents automatiques',
        prompt: `Quels documents Vendu Par Moi peut-il générer automatiquement pour ses clients ?
Documents à automatiser :
- Fiche descriptive du bien (PDF professionnel à partir du formulaire)
- Dossier de vente complet (fiche + diagnostics + plans)
- Compte-rendu de visite (envoyé automatiquement après chaque visite)
- Lettre de rétractation type
- Checklist personnalisée selon le type de bien
Pour chaque document : contenu, format, déclencheur de génération, valeur perçue par le client.
Outil recommandé pour la génération automatique de PDF (html-pdf, Puppeteer, API tierce) ?`,
      },
      {
        name: 'Qualification & scoring prospects',
        prompt: `Système de qualification automatique des acheteurs pour Vendu Par Moi.
Comment filtrer automatiquement les acheteurs sérieux des curieux/concurrents/agences.
Score de qualification : quels critères (pré-financement, délai d'achat, type de bien recherché, budget déclaré) ?
Formulaire de demande de visite optimal : quelles questions poser sans frictionner le parcours ?
Alertes au vendeur : comment lui signaler qu'un acheteur est "chaud" ?
Comment automatiser le rejet poli des prospects non-qualifiés ?
INNOVATION : Idée pour qualifier les acheteurs avant même qu'ils contactent le vendeur.`,
      },
    ],
  },

  // ── ÉQUIPE 8 : PSYCHOLOGIE & CONVERSION ───────────────────
  {
    name: '08 · Psychologie & Conversion',
    color: C.cyan,
    agents: [
      {
        name: 'Peurs et objections clients',
        prompt: `Identifie les 10 peurs profondes d'un propriétaire qui envisage de vendre sans agence.
Pour chaque peur : origine psychologique, comment elle se manifeste, comment la lever.
TOP 3 objections : "J'ai peur de me tromper sur le prix", "Je n'ai pas le temps", "Et si ça ne marche pas ?"
Pour chaque objection : réponse parfaite en 3 phrases, preuve à apporter, element de réassurance à montrer.
Comment transformer ces peurs en arguments de vente pour Vendu Par Moi ?
INSIGHT CLEF : Quelle est la peur n°1 qui empêche 80% des conversions ? Comment la neutraliser dès la homepage ?`,
      },
      {
        name: 'Preuves sociales & témoignages',
        prompt: `Stratégie de preuve sociale pour Vendu Par Moi.
Types de preuves sociales à collecter : avis clients, cas d'usage (bien vendu + prix + délai), chiffres clés (nb de clients, économies totales générées), témoignages vidéo.
Comment collecter des témoignages automatiquement après chaque vente réussie ?
Script d'un témoignage parfait (30s vidéo / 150 mots écrit) qui maximise la conversion.
Où placer les preuves sociales sur le site pour maximum d'impact ?
CHALLENGE : Que faire si on a 0 témoignage au lancement ? Stratégie pour les 30 premiers.`,
      },
      {
        name: 'Biais cognitifs & persuasion',
        prompt: `Liste les 10 biais cognitifs les plus puissants à intégrer dans Vendu Par Moi.
Pour chaque biais : définition courte, comment l'utiliser concrètement (exemple de texte ou design), page où l'intégrer.
Biais à couvrir : ancrage prix, preuve sociale, rareté/urgence, autorité, réciprocité, aversion à la perte, effet de dotation, biais de confirmation.
ATTENTION : Quels biais peuvent se retourner contre la marque et créer de la méfiance ? Lesquels éviter ?
Crée le "script de conversion psychologique" idéal pour la page pricing.`,
      },
      {
        name: 'Tunnel de vente optimisé',
        prompt: `Conçois le tunnel de conversion optimal pour Vendu Par Moi de A à Z.
Étape 1 : Découverte (pub/SEO) → landing page
Étape 2 : Intérêt → exploration site
Étape 3 : Désir → page offres/pricing
Étape 4 : Action → paiement
Étape 5 : Post-achat → onboarding + upsell

Pour chaque étape : durée moyenne, taux de conversion cible, point de friction principal, solution, message clé.
Quel est le taux de conversion global réaliste (visite → achat) pour ce marché ?
AMÉLIORATION : Quelle serait la seule modification qui doublerait le taux de conversion ?`,
      },
      {
        name: 'Urgence & rareté',
        prompt: `Stratégie d'urgence et de rareté éthique pour Vendu Par Moi.
Mécaniques d'urgence applicables : offre de lancement, prix qui augmente, nb de créneaux limités pour photos pro, bonus disparaissant.
Comment créer de l'urgence sans mentir ni manipuler (ce qui détruit la confiance) ?
Email/SMS de relance basé sur l'urgence : 3 templates pour des prospects inactifs depuis 7/14/30 jours.
Quelle offre de lancement créer pour les 100 premiers clients ? Conditions, durée, communication.
CHALLENGE : La rareté artificielle fonctionne-t-elle dans l'immobilier ou crée-t-elle de la méfiance ? Analyse.`,
      },
      {
        name: 'Optimisation checkout & paiement',
        prompt: `Optimise le processus de paiement de Vendu Par Moi pour minimiser les abandons.
Les 5 raisons principales d'abandon de panier dans ce type de service.
Éléments de réassurance à placer sur la page paiement (logos sécurité, garanties, témoignage).
Options de paiement à proposer : CB, virement, paiement en 3x (Alma/Scalapay) — quel impact sur les conversions ?
Email de récupération d'abandon de panier : timing (1h, 24h, 72h) et contenu de chaque email.
INNOVATION : Pourrait-on proposer un paiement à la vente (success fee) ? Analyse risques/bénéfices.`,
      },
    ],
  },

  // ── ÉQUIPE 10 : LEBONCOIN & PAP ───────────────────────────
  {
    name: '10 · Leboncoin & PAP',
    color: C.orange,
    agents: [
      {
        name: 'Stratégie Leboncoin vendeur',
        prompt: `Leboncoin est le n°1 des annonces immobilières entre particuliers en France.
Crée la stratégie complète pour que Vendu Par Moi soit présent et dominant sur Leboncoin.
Comment un vendeur client de Vendu Par Moi peut-il optimiser son annonce Leboncoin pour se démarquer des annonces amateur ?
Titre parfait, description optimisée, photos, prix, catégorie, options payantes Leboncoin (à recommander ou pas ?).
CHALLENGE : Les annonces Leboncoin convertiront-elles mieux avec ou sans mention "accompagné par Vendu Par Moi" ? Analyse l'impact sur la confiance des acheteurs.`,
      },
      {
        name: 'Cibler les vendeurs PAP existants',
        prompt: `Il existe des dizaines de milliers d'annonces de vendeurs particuliers sur Leboncoin, PAP.fr, SeLoger particuliers chaque mois. Ce sont des prospects parfaits pour Vendu Par Moi : ils ont déjà décidé de vendre sans agence.
Comment approcher légalement ces vendeurs déjà en ligne ?
Méthodes : commentaires sur les annonces, emails publics dans les annonces, formulaires de contact des plateformes.
Quel message envoyer ? Script de prise de contact parfait (< 5 lignes) qui déclenche une réponse.
LÉGAL : Quelles restrictions s'appliquent à ce type de prospection ? Quels risques ? Comment rester dans le cadre légal ?`,
      },
      {
        name: 'Automatisation publication annonces',
        prompt: `Stratégie d'automatisation pour la publication et gestion des annonces immobilières des clients Vendu Par Moi.
Plateformes cibles : Leboncoin, PAP.fr, Se Loger particuliers, Bien Ici, Logic-Immo, A Vendre A Louer.
Outils d'automatisation multi-diffusion : Bienici API, Jestimo, solutions SaaS multi-diffusion immobilier.
Comment publier automatiquement sur 5+ plateformes depuis l'espace membre Vendu Par Moi ?
Coût des APIs et abonnements multi-diffusion. Partenariat possible avec un agrégateur ?
IMPACT : La multi-diffusion automatique pourrait-elle être un argument de vente décisif pour le Pack Sérénité ?`,
      },
      {
        name: 'Optimisation annonces & SEO des plateformes',
        prompt: `Comment optimiser les annonces immobilières des clients Vendu Par Moi pour apparaître en tête sur Leboncoin, PAP.fr et SeLoger ?
Algorithmes de classement de chaque plateforme : quels critères (fraîcheur, photos, prix, réactivité) ?
Techniques de "refreshing" d'annonce pour rester en haut de page.
Comment les photos professionnelles (incluses dans Pack Sérénité) impactent le taux de clics sur ces plateformes ? Chiffres.
Stratégie de prix : légèrement au-dessus du marché puis baisse vs prix juste dès le départ. Lequel fonctionne mieux sur Leboncoin ?`,
      },
      {
        name: 'Monitoring concurrentiel annonces',
        prompt: `Système de veille et monitoring des annonces PAP pour Vendu Par Moi.
Comment surveiller automatiquement les nouvelles annonces de vendeurs particuliers dans une zone géographique ?
Outils : alertes Google, APIs Leboncoin/PAP (existent-elles ?), scraping légal, services tiers.
Utilisation : identifier des prospects chauds dès leur mise en ligne, analyser le marché local en temps réel pour les clients.
Comment transformer ce monitoring en avantage concurrentiel pour les clients Vendu Par Moi (ils savent ce que vendent leurs voisins) ?
INNOVATION : Tableau de bord de veille marché local automatique à intégrer dans l'espace membre.`,
      },
      {
        name: 'Partenariats plateformes annonces',
        prompt: `Analyse les opportunités de partenariat entre Vendu Par Moi et les grandes plateformes d'annonces.
Leboncoin Pro : programme partenaire possible ? Conditions, avantages, visibilité accrue.
PAP.fr : modèle de partenariat ou white-label possible ?
SeLoger Particuliers : opportunités de co-marketing ou d'intégration API.
Logic-Immo, Bien Ici, MeilleursAgents : accords de diffusion préférentielle ?
STRATÉGIE : Vaut-il mieux négocier des accords de diffusion ou rester indépendant ? Impact sur la crédibilité de Vendu Par Moi ?`,
      },
    ],
  },

  // ── ÉQUIPE 11 : DÉMARCHAGE & PROSPECTION AUTOMATISÉE ──────
  {
    name: '11 · Démarchage & Prospection',
    color: C.red,
    agents: [
      {
        name: 'Cadre légal démarchage France',
        prompt: `Analyse complète du cadre légal du démarchage commercial en France en 2025 pour Vendu Par Moi.
RGPD (B2C) : prospection email, SMS, téléphone sans consentement préalable — ce qui est autorisé vs interdit.
Loi Bloctel : liste d'opposition téléphonique — comment s'y conformer.
Exception "intérêt légitime" RGPD : peut-on contacter un vendeur PAP dont le numéro est public dans son annonce ? Analyse juridique.
Différence B2C vs B2B : quelles règles s'appliquent ?
CONCLUSION : Quelles formes de démarchage automatisé sont légalement utilisables pour Vendu Par Moi ? Donne une réponse claire et actionnable.`,
      },
      {
        name: 'Cold email automatisé',
        prompt: `Stratégie de cold email automatisé pour prospecter les vendeurs particuliers potentiels.
Légalité : dans quel cadre peut-on envoyer des cold emails à des particuliers en France ?
Sources d'emails légales : propriétaires qui ont publié leur email dans des annonces publiques, formulaires d'inscription voluntaires, partenariats notaires/diagnostiqueurs.
Séquence cold email en 4 emails (J0, J3, J7, J14) : objet, contenu, CTA pour chaque.
Taux d'ouverture et réponse réalistes pour ce secteur.
Outils recommandés : Lemlist, Hunter.io, Apollo, Brevo Cold. Budget et set-up.
ALTERNATIVE : Si le cold email B2C est trop risqué, quelle alternative légale avec volume similaire ?`,
      },
      {
        name: 'SMS marketing & prospection',
        prompt: `Stratégie SMS pour Vendu Par Moi : marketing clients existants ET prospection nouveaux vendeurs.
PARTIE 1 — SMS clients (consentement acquis) :
Séquence SMS onboarding après achat (5 SMS sur 30 jours)
SMS de relance si inactivité dans l'espace membre
SMS d'alertes (nouvelle visite, nouveau message acheteur)
PARTIE 2 — Prospection SMS (légalité ?) :
Peut-on envoyer des SMS à des numéros trouvés dans des annonces publiques ?
Quel message ? Quelle fréquence maximale légale ?
Outils SMS marketing : Twilio, Brevo SMS, OVH SMS — comparatif prix.
Taux de réponse SMS vs email vs appel téléphonique pour ce type de prospection.`,
      },
      {
        name: 'Prospection LinkedIn & réseaux pro',
        prompt: `Stratégie de prospection LinkedIn pour atteindre les vendeurs immobiliers via leur réseau professionnel.
Cible sur LinkedIn : propriétaires qui mentionnent "vente" dans leurs posts, contacts de notaires/diagnostiqueurs, réseaux locaux.
Approche : message de connexion + séquence de 3 messages.
Sales Navigator : utile pour ce cas d'usage ? ROI ?
ALTERNATIVE LinkedIn : Facebook Groups locaux (groupes immo de ville, groupes voisinage type Nextdoor/Facebook) — stratégie d'infiltration et de valeur.
Comment utiliser les groupes Facebook locaux pour positionner Vendu Par Moi sans spammer ?`,
      },
      {
        name: 'Automatisation prospection multi-canal',
        prompt: `Crée le système de prospection multi-canal automatisé pour Vendu Par Moi.
Stack technologique recommandé (budget < 200€/mois) : CRM + email séquences + SMS + LinkedIn automation.
Workflow complet : détection prospect (annonce PAP publiée) → enrichissement données → séquence contact automatisée → qualification → relance → closing.
Outils à combiner : Make.com ou Zapier pour orchestration, Lemlist pour email, Brevo pour SMS, PhantomBuster pour LinkedIn.
KPIs du système : nb prospects identifiés/mois, taux de contact, taux de réponse, taux de conversion final.
RISQUE : Comment éviter d'être blacklisté ou de recevoir des plaintes RGPD tout en maintenant un volume de prospection significatif ?`,
      },
      {
        name: 'Scripts de prise de contact',
        prompt: `Crée les scripts de prise de contact optimaux pour chaque canal de prospection Vendu Par Moi.
Script email froid (150 mots max) : pour un vendeur PAP dont l'annonce est en ligne depuis > 30 jours sans vente.
Script SMS (< 160 caractères) : ultra-court, déclenche une réponse, pas de spam.
Script message LinkedIn (< 300 caractères) : connexion + valeur immédiate.
Script commentaire Leboncoin (si autorisé) : apporter de la valeur sans être intrusif.
Script appel téléphonique 30s : accroche, valeur, question de qualification.
Pour chaque script : taux de réponse estimé, meilleur moment d'envoi, erreurs à éviter absolument.`,
      },
    ],
  },

  // ── ÉQUIPE 09 : INTELLIGENCE CONCURRENTIELLE ──────────────
  {
    name: '09 · Intelligence Concurrentielle',
    color: C.white,
    agents: [
      {
        name: 'Analyse agences immobilières',
        prompt: `Analyse approfondie des agences immobilières traditionnelles en France.
Ce qu'elles font bien : expertise locale, réseau acheteurs, négociation, accompagnement juridique.
Ce qu'elles font mal : prix opaques, commission %, manque de transparence, digitalisation lente, conflit d'intérêt (vendeur vs acheteur).
Argument massue des agences contre Vendu Par Moi : lequel est le plus fort ? Comment le contrer ?
OPPORTUNITÉ : Quelle est la faiblesse des agences que Vendu Par Moi peut exploiter pour les écraser sur leur propre terrain ?`,
      },
      {
        name: 'Analyse PAP & Leboncoin',
        prompt: `Analyse des plateformes PAP (Particulier à Particulier) : PAP.fr, Leboncoin, Se Loger particuliers.
Ce qu'ils font bien : audience massive, prix abordable, simplicité.
Ce qu'ils font mal : pas d'accompagnement, photos amateur, annonces noyées, pas de qualification des acheteurs, pas de support.
Pourquoi les gens qui essaient PAP puis abandonnent ? Quelles sont les 3 frustrations majeures ?
STRATÉGIE : Comment Vendu Par Moi peut récupérer les clients déçus de PAP ? Message marketing ciblé.`,
      },
      {
        name: 'Analyse startups immobilières',
        prompt: `Analyse des startups et nouveaux entrants dans l'immobilier sans agence en France et en Europe.
Concurrents directs : Imop, Hosman, Welmo, Liberkeys, EffectImmo, Proprioo.
Pour chaque : modèle économique, prix, forces, faiblesses, financement levé, taille.
Qui a réussi ? Qui a échoué et pourquoi ?
Qu'est-ce que Vendu Par Moi peut apprendre de leurs erreurs et succès ?
MENACE : Lequel de ces concurrents pourrait faire une levée de fonds et écraser Vendu Par Moi ? Comment se défendre ?`,
      },
      {
        name: 'Analyse IA immobilière',
        prompt: `Analyse des solutions IA qui transforment l'immobilier en 2025.
Startups IA immobilier à surveiller : estimation automatique (MeilleursAgents, Meilleurs Taux), visite virtuelle (Matterport, Giraffe360), rédaction annonce (IA generative), chatbot acheteur.
Quelles IA peuvent être intégrées dans Vendu Par Moi dès maintenant ?
Dans 2 ans, quel rôle jouera l'IA dans une transaction immobilière ? Scénario optimiste et pessimiste.
RISQUE EXISTENTIEL : L'IA va-t-elle rendre les agences et les plateformes comme Vendu Par Moi obsolètes d'ici 5 ans ? Comment se préparer ?`,
      },
      {
        name: 'Benchmark international',
        prompt: `Analyse les meilleurs modèles de vente immobilière sans agence dans le monde.
USA : Zillow, Opendoor, For Sale By Owner (FSBO) — modèles, taux d'adoption, succès.
UK : Purple Bricks, Strike, Settled — qu'est-ce qui a fonctionné et échoué ?
Espagne, Allemagne, Pays-Bas : modèles locaux dominants.
Quelles innovations étrangères n'existent pas encore en France et que Vendu Par Moi pourrait importer ?
OPPORTUNITÉ : Quel modèle international serait le plus pertinent à adapter pour le marché français ?`,
      },
      {
        name: 'Stratégie pour dépasser les concurrents',
        prompt: `Crée la stratégie pour que Vendu Par Moi devienne le leader du marché en 3 ans.
Cartographie concurrentielle : qui sont les 5 adversaires principaux ? Quelle part de marché ont-ils ?
Stratégie de différenciation : sur quels critères Vendu Par Moi doit-il gagner la bataille ?
Stratégie d'attaque : comment attaquer les positions des concurrents établis ?
Stratégie défensive : comment se protéger des contre-attaques ?
Moat (fossé défensif) : comment construire un avantage compétitif durable dans 5 ans ?
SCÉNARIO : Si Leboncoin lance un service concurrent demain à 199€, que fait Vendu Par Moi ?`,
      },
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// ÉQUIPE 10 : DIRECTION GÉNÉRALE (6 agents coordinateurs)
// ══════════════════════════════════════════════════════════════
function buildDirectionAgents(allResults) {
  // Regrouper par équipe pour les coordinateurs
  const byTeam = {};
  allResults.forEach(r => {
    if (!byTeam[r.team]) byTeam[r.team] = [];
    byTeam[r.team].push(`**${r.agent}**\n${r.content}`);
  });

  const teamSummaries = Object.entries(byTeam)
    .map(([team, items]) => `## ${team}\n\n${items.join('\n\n---\n\n')}`)
    .join('\n\n════\n\n');

  const truncated = teamSummaries.length > 16000
    ? teamSummaries.slice(0, 16000) + '\n\n[... contenu tronqué ...]'
    : teamSummaries;

  return [
    {
      name: 'Faiblesses & risques détectés',
      prompt: `Tu es le Directeur des Risques de Vendu Par Moi.
Voici les analyses de 54 experts spécialisés :\n\n${truncated}

Ta mission : identifier TOUT ce qui peut faire échouer ce projet.
Produis :
1. Les 5 faiblesses critiques du projet actuel (avec solution)
2. Les 5 risques majeurs sur 12 mois (avec probabilité et plan de mitigation)
3. Les coûts cachés que personne n'a mentionnés
4. Les problèmes juridiques potentiels non adressés
5. Les contradictions entre les recommandations des équipes
Classe tout par PRIORITÉ 1 / 2 / 3.`,
    },
    {
      name: 'Plan d\'action 30 jours',
      prompt: `Tu es le CEO de Vendu Par Moi.
Voici les analyses de 54 experts :\n\n${truncated}

Crée le plan d'action IMMÉDIAT des 30 premiers jours.
Format :
Semaine 1 (J1-J7) : 5 actions concrètes avec responsable et livrable
Semaine 2 (J8-J14) : 5 actions concrètes
Semaine 3 (J15-J21) : 5 actions concrètes
Semaine 4 (J22-J30) : 5 actions concrètes

Pour chaque action : quoi, qui, comment, combien (budget), KPI de succès.
FOCUS : les actions qui génèrent les premiers clients payants le plus vite possible.`,
    },
    {
      name: 'Plan développement 90 jours & 1 an',
      prompt: `Tu es le COO de Vendu Par Moi.
Voici les analyses de 54 experts :\n\n${truncated}

Crée :
PLAN 90 JOURS (J31 à J90) :
- Mois 2 : 3 priorités absolues + KPIs
- Mois 3 : 3 priorités absolues + KPIs
- Objectifs : nb clients, CA, notoriété, produit

PLAN 1 AN (J91 à J365) :
- Q2, Q3, Q4 : grandes étapes produit, marketing, commercial
- Objectifs : position marché, CA, équipe, levée de fonds si nécessaire

JALONS CRITIQUES : quels moments charnières vont définir le succès ou l'échec ?`,
    },
    {
      name: 'Budget prévisionnel',
      prompt: `Tu es le CFO de Vendu Par Moi.
Voici les analyses de 54 experts :\n\n${truncated}

Crée le budget prévisionnel sur 12 mois :
COÛTS : développement tech, marketing (Facebook, Google, TikTok), outils SaaS, personnel (freelances/salariés), coûts opérationnels (photos pro, visites virtuelles).
REVENUS : projections Pack Autonome, Pack Sérénité, upsells, partenariats.
SCÉNARIOS : pessimiste / réaliste / optimiste avec hypothèses claires.
Point mort (breakeven) : à quel mois Vendu Par Moi devient-il rentable ?
Trésorerie mensuelle : quels mois sont critiques ? Besoin de financement ?`,
    },
    {
      name: 'Opportunités & innovations manquantes',
      prompt: `Tu es le Chief Innovation Officer de Vendu Par Moi.
Voici les analyses de 54 experts :\n\n${truncated}

Ta mission : identifier ce que PERSONNE n'a mentionné mais qui pourrait transformer le projet.
Produis :
1. Les 5 plus grandes opportunités de marché non exploitées
2. Les 3 innovations produit qui créeraient un effet "wow" médiatique
3. Une idée de partenariat stratégique game-changer
4. Un modèle de croissance viral que personne n'a identifié
5. La fonctionnalité qui rendrait Vendu Par Moi "addictif" pour les vendeurs

Sois radical. Challenge toutes les idées des autres équipes si tu vois mieux.`,
    },
    {
      name: 'Rapport stratégique final',
      prompt: `Tu es le Président du Conseil d'Administration de Vendu Par Moi.
Voici les analyses complètes de 54 experts spécialisés :\n\n${truncated}

Produis le RAPPORT STRATÉGIQUE FINAL de niveau startup financée par des investisseurs.
Structure :
1. EXECUTIVE SUMMARY (situation, opportunité, différenciation)
2. ANALYSE MARCHÉ (taille, tendances, position concurrentielle)
3. STRATÉGIE (positionnement, offres, go-to-market)
4. PLAN D'EXÉCUTION (30/90/365 jours, jalons, équipe)
5. MÉTRIQUES DE SUCCÈS (KPIs par phase)
6. RISQUES & MITIGATION (top 3 risques)
7. RECOMMANDATION FINALE (que faire lundi matin ?)

Ton objectif : ce rapport doit être suffisamment convaincant pour lever des fonds ou convaincre un associé stratégique.`,
    },
  ];
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════
async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(`\n${C.red}${C.bold}Erreur : ANTHROPIC_API_KEY non définie.${C.reset}`);
    console.error(`Définissez-la avec : ${C.cyan}export ANTHROPIC_API_KEY=sk-ant-...${C.reset}\n`);
    process.exit(1);
  }

  console.clear();
  console.log(`
${C.bold}${C.white}╔══════════════════════════════════════════════════════════════╗
║         VENDU PAR MOI — 75 AGENTS EXPERTS EN PARALLÈLE      ║
╚══════════════════════════════════════════════════════════════╝${C.reset}
`);

  const primaryCount = TEAMS.reduce((s, t) => s + t.agents.length, 0);
  const directionCount = 6;
  total = primaryCount + directionCount;

  console.log(`${C.bold}Agents primaires :${C.reset} ${primaryCount}  ${C.bold}Direction :${C.reset} ${directionCount}  ${C.bold}Total :${C.reset} ${total}`);
  console.log(`${C.dim}Modèle : claude-haiku-4-5 | Concurrence : 10 appels simultanés max${C.reset}\n`);

  TEAMS.forEach(t => console.log(`  ${t.color}●${C.reset} ${C.bold}${t.name}${C.reset} — ${t.agents.length} agents`));
  console.log(`  ${C.white}●${C.reset} ${C.bold}10 · Direction Générale${C.reset} — ${directionCount} agents`);

  console.log(`\n${C.dim}${'═'.repeat(64)}${C.reset}`);
  console.log(`${C.bold}PHASE 1 — Analyse parallèle : ${primaryCount} agents travaillent simultanément${C.reset}\n`);

  const acquire = createSemaphore(10);

  // ── Phase 1 : 54 agents en parallèle ──
  const phase1Tasks = TEAMS.flatMap(team =>
    team.agents.map(agent => async () => {
      const release = await acquire();
      try {
        return await runAgent(team.name, team.color, agent.name, agent.prompt);
      } finally {
        release();
      }
    })
  );

  const phase1Raw = await Promise.allSettled(phase1Tasks.map(fn => fn()));
  const results = phase1Raw
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value);

  console.log(`\n${C.dim}${'═'.repeat(64)}${C.reset}`);
  console.log(`${C.bold}PHASE 2 — Direction Générale : synthèse et rapport final${C.reset}\n`);

  // ── Phase 2 : 6 agents direction ──
  const directionAgents = buildDirectionAgents(results);
  const directionResults = [];

  for (const agent of directionAgents) {
    const release = await acquire();
    try {
      const res = await runAgent('10 · Direction Générale', C.white, agent.name, agent.prompt);
      directionResults.push(res);
    } finally {
      release();
    }
  }

  // ── Sauvegarde rapport Markdown ──
  const outDir = join(__dirname, '..', 'rapports');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = join(outDir, `vendu-par-moi-${ts}.md`);

  let md = `# Rapport Stratégique — Vendu Par Moi\n`;
  md += `*Généré le ${new Date().toLocaleString('fr-FR')} — 60 agents IA en parallèle*\n\n`;
  md += `---\n\n# DIRECTION GÉNÉRALE — SYNTHÈSES\n\n`;
  directionResults.forEach(r => {
    md += `## ${r.agent}\n\n${r.content}\n\n---\n\n`;
  });
  md += `\n---\n\n# ANALYSES DÉTAILLÉES PAR ÉQUIPE\n\n`;
  TEAMS.forEach(team => {
    md += `# ${team.name}\n\n`;
    results.filter(r => r.team === team.name).forEach(r => {
      md += `## ${r.agent}\n\n${r.content}\n\n`;
    });
  });

  writeFileSync(filename, md, 'utf-8');

  // ── Rapport HTML ──
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const htmlFile = join(outDir, `vendu-par-moi-${ts}.html`);
  writeFileSync(htmlFile, generateHTML(results, directionResults, elapsed, ts), 'utf-8');

  // ── Affichage final ──
  const ok = results.length + directionResults.length;

  console.log(`\n${C.dim}${'═'.repeat(64)}${C.reset}`);
  console.log(`\n${C.bold}${C.green}✓ Mission accomplie en ${elapsed}s${C.reset}`);
  console.log(`  Agents : ${C.bold}${ok}/${total}${C.reset} réussis`);
  console.log(`  Markdown : ${C.cyan}rapports/vendu-par-moi-${ts}.md${C.reset}`);
  console.log(`  HTML     : ${C.cyan}rapports/vendu-par-moi-${ts}.html${C.reset}\n`);

  // Rapport exécutif dans le terminal
  const rapportFinal = directionResults.find(r => r.agent === 'Rapport stratégique final');
  if (rapportFinal) {
    console.log(`${C.bold}${C.white}╔══════════════════════════════════════════════════════════════╗
║                  RAPPORT STRATÉGIQUE FINAL                   ║
╚══════════════════════════════════════════════════════════════╝${C.reset}\n`);
    console.log(rapportFinal.content);
  }

  const plan30 = directionResults.find(r => r.agent === 'Plan d\'action 30 jours');
  if (plan30) {
    console.log(`\n${C.bold}${C.yellow}╔══════════════════════════════════════════════════════════════╗
║                    PLAN D'ACTION — 30 JOURS                  ║
╚══════════════════════════════════════════════════════════════╝${C.reset}\n`);
    console.log(plan30.content);
  }

  const budget = directionResults.find(r => r.agent === 'Budget prévisionnel');
  if (budget) {
    console.log(`\n${C.bold}${C.green}╔══════════════════════════════════════════════════════════════╗
║                    BUDGET PRÉVISIONNEL                       ║
╚══════════════════════════════════════════════════════════════╝${C.reset}\n`);
    console.log(budget.content);
  }

  console.log(`\n${C.dim}Ouvrir le rapport HTML : open ${htmlFile}${C.reset}\n`);
}

main().catch(err => {
  console.error(`\n${C.red}${C.bold}Erreur fatale :${C.reset} ${err.message}`);
  process.exit(1);
});
