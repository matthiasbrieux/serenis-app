# Vendu Par Moi — Guide Claude Code

## Identité du projet

- **Produit** : Vendu Par Moi (venduparmo.fr)
- **Dépôt local** : `/Users/brieuxmatthias/serenis-app` (ancien nom "serenis", ne pas renommer)
- **Dépôt GitHub** : `matthiasbrieux/serenis-app`
- **Déploiement** : Render (auto-deploy sur push `main`, ~3 min)
- **Propriétaire** : Matthias Brieux (matthiasbrieux260598@gmail.com)

## Vision produit

Vendu Par Moi permet aux particuliers de vendre leur bien immobilier **sans agence**, en leur donnant accès aux outils et à la méthode des professionnels.

**Proposition de valeur :** conserver l'intégralité du prix de vente tout en étant guidé à chaque étape.

**Fonctionnalités clés de la plateforme :**
- Formation complète pas à pas (préparation → signature notaire)
- Générateur de fiche descriptive professionnelle (IA)
- Dossier acheteur partageable : photos organisées (pro, extérieur, immersive, technique), diagnostics, documents
- Agenda intelligent : vendeur indique ses dispo, acheteurs réservent en ligne, rappels automatiques
- Dossier "Acheteur Sérieux" : factures travaux, entretien chaudière, taxe foncière…
- Relances automatiques des visiteurs pour déclencher des offres
- Suivi des offres centralisé dans l'espace vendeur
- Coach IA pour accompagner le vendeur

**Cible :** propriétaires particuliers qui veulent vendre eux-mêmes, sans intermédiaire.  
**Fondateurs :** deux professionnels de l'immobilier avec expérience terrain.

## Stack

- **Backend** : Node.js + Express (`server.js`)
- **Base de données** : SQLite via `better-sqlite3` — WAL mode, `foreign_keys ON`, migrations par `try/catch ALTER TABLE` dans `database.js`
- **Frontend** : HTML/CSS/JS pur dans `views/` — pas de React, pas de build step
- **CSS partagé** : `public/css/style.css` (servi avec cache 7 jours — voir ci-dessous)

## Structure des dossiers

```
server.js              # Point d'entrée — middleware, routes, jobs planifiés
database.js            # Schéma SQLite + migrations
middleware/auth.js     # requireAuth, requireAdmin (JWT cookies)
routes/
  auth.js              # /login, /logout, /reset-password
  seller.js            # Toutes les pages et APIs vendeur (~1200 lignes)
  buyer.js             # Webhooks Twilio, dossier acheteur public
  payment.js           # Stripe checkout + webhook
  admin.js             # CRM admin, finance, marketing, missions
  dossier.js           # Dossier acheteur/notaire (token protégé)
  partner.js           # Plateforme photographe partenaire
services/
  email.js             # SendGrid — emails transactionnels
  upload.js            # Multer + Cloudinary
views/
  seller/              # 17 fichiers HTML (une page = un fichier)
  admin/               # Pages admin
  public/              # Pages publiques (landing, dossier acheteur…)
public/css/style.css   # CSS global — sidebar, variables couleurs, composants
```

## Cache CSS — point critique

`style.css` est servi avec `Cache-Control: max-age=604800` (7 jours).  
Après toute modification CSS : **Cmd+Shift+R** (hard refresh) obligatoire côté navigateur.  
Les fichiers HTML sont en `no-cache` — ils s'actualisent automatiquement.

## Pages vendeur — routes et fichiers HTML

| Route | Fichier | Note |
|-------|---------|------|
| `/dashboard` | dashboard.html | |
| `/mon-bien` | property.html | passe `base` URL à la vue |
| `/ma-formation` | library.html | |
| `/coaching-vpm` | coaching-vpm.html | |
| `/mon-agenda` | agenda.html | |
| `/ma-bibliotheque` | biblio.html | |
| `/mes-publications` | publications.html | |
| `/mes-performances` | performances.html | |
| `/mes-offres` | offers.html | |
| `/mon-guide-photos` | guide-photos.html | |
| `/coach-ia` | coach.html | |
| `/booking` | booking.html | |
| `/onboarding` | onboarding.html | |
| `/contrat` | contrat.html | exempt du check contrat signé |
| — | pipeline.html | legacy, pas de route active |
| — | communication.html | legacy, pas de route active |

## Sidebar — structure HTML

Chaque page vendeur a une sidebar. Structure attendue :

```html
<aside class="sidebar" id="sidebar">
  <div class="sidebar-logo">
    <a href="/" class="sidebar-brand">
      <div class="sidebar-brand-icon"><!-- SVG maison --></div>
      <div class="sidebar-brand-text">
        <span class="sidebar-brand-name">Vendu Par Moi</span>
        <span class="sidebar-brand-sub">Espace vendeur</span>
      </div>
    </a>
  </div>
  <nav class="sidebar-nav">
    <a href="/dashboard" class="sidebar-item [active si cette page]">...</a>
    <!-- 9 items au total (10 pour coaching-vpm et performances) -->
  </nav>
  <div class="sidebar-footer">
    <a href="/logout"><!-- SVG + Déconnexion --></a>
  </div>
</aside>
```

Les fichiers guide-photos.html, offers.html et pipeline.html utilisent `<nav class="sidebar">` au lieu de `<aside class="sidebar">`.

## Authentification

- Cookie `token` (JWT) — décodé dans `req.seller` par `requireAuth`
- Cookie `admin_token` — décodé dans `req.admin` par `requireAdmin`
- Si `contrat_signe = 0` → redirect `/contrat` (sauf routes dans `CONTRAT_EXEMPT`)
- Session expirée → cookie effacé + redirect `/login`

## Services externes — variables d'environnement

```
JWT_SECRET
ANTHROPIC_API_KEY       # Claude Haiku — génération description, coach IA, analyse
CLOUDINARY_URL          # Photos et documents (si absent → stockage local dev)
SENDGRID_API_KEY
SENDGRID_FROM_EMAIL     # contact@serenis.fr (adresse d'envoi)
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_AUTONOME   # price_xxx
STRIPE_PRICE_SERENITE   # price_xxx
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
BASE_URL                # https://venduparmo.fr
NODE_ENV
PORT                    # 3000
```

⚠️ Le webhook Stripe nécessite le **raw body** — il est enregistré AVANT le middleware `express.json()` dans server.js.

## Packs vendeur

- **autonome** — pack basique
- **serenite** — pack complet avec accompagnement photographe

## Documents propriété

Dossiers Cloudinary : `diagnostics`, `acheteur_serieux`, `notaire`, `plans`

## IA — Anthropic Claude

Utilisé dans `routes/seller.js` pour :
- Génération de description annonce (`/api/property/generate-description`)
- Formation interactive (`/api/formation/chat`, `/api/formation/speak`)
- Coach IA (`/api/coach-ia`)
- Score et analyse performances (`/api/score`, `/api/performances/analyze`)
- AI insight agenda (`/api/connect/ai-insight`)

Modèle : `claude-haiku-4-5-20251001`

## Design système

**Couleurs :**
- Vert foncé sidebar : `#0C1910` → `#0F1E13` (gradient)
- Vert actif : `#1D3A28`
- Vert accent : `#3D5A47`, `#4d7a58`, `#6BBF82`
- Terracotta : `#C4603A`, `#C4785A`
- Crème texte : `#F5F0E8`
- Texte sidebar nav : `rgba(212,228,216,0.52)`

**Typographie :**
- `Cormorant Garamond` (serif) — brand/titres
- `DM Sans` (sans-serif) — corps de texte

## Jobs planifiés (node-cron)

Définis dans `server.js` :
- **18h00 quotidien** : rappels visites, rappels missions, nudges, prélèvements mensualités, nudges baisse de prix
- **Lundi 8h00** : rapport hebdomadaire vendeurs

## Déploiement Render

- Push sur `main` → déploiement automatique (~3 min)
- Variables d'environnement à configurer dans le dashboard Render
- `CLOUDINARY_URL` obligatoire en prod (sinon photos non sauvegardées)
- `ANTHROPIC_API_KEY` obligatoire pour les fonctions IA
