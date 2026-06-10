# Parcours complet — Vendu Par Moi
*Mis à jour le 10/06/2026 — intègre l'audit P1→P9 + clarification du modèle de communication vendeur/acheteur*

---

## PARCOURS VENDEUR

### Étape 1 — Inscription & Paiement

**Entrée :** landing page venduparmo.fr → bouton CTA pack

**Route :** `POST /create-checkout` → Stripe hosted checkout

- Stripe crée la session de paiement
- `activateSeller()` est appelée sur `checkout.session.completed` (webhook Stripe)
  - Marque `paid_at`
  - Si pack sérenité 4× : enregistre la date du premier prélèvement mensuel
- Email envoyé : **`welcome`** → "Bienvenue sur Vendu Par Moi" + accès espace vendeur
- Email envoyé : **`invoice`** → facture PDF en pièce jointe

**Après paiement :**
- `GET /paiement-succes` → auto-login (cookie JWT 30j) + redirect `/booking`

**Pages concernées :** `public/landing.html` (ou équivalent), `views/seller/booking.html`

---

### Étape 2 — Booking séance photo (onboarding)

**Route :** `GET /booking` → `booking.html`  
**API :** `POST /api/booking`

- Vendeur renseigne : type de bien, adresse, surface, pièces, étage, disponibilités créneaux
- Sauvegarde : `client_availability` (JSON slots + note), `booking_step=1`
- Un créneau photographe peut être réservé depuis `GET /api/seller/available-slots` + `POST /api/seller/book-photography`
- Email photographe envoyé : **`mission_assigned`** (si mission créée)

---

### Étape 3 — Contrat & Signature électronique

**Route :** `GET /contrat` → `contrat.html`  
**API :** `POST /api/contrat/sign`

- Accès obligatoire si `contrat_signe = 0` (redirect automatique depuis `requireAuth`)
- Signature enregistre : `contrat_signe=1`, `contrat_signe_at`, `contrat_ip`
- Rate limit : 5 tentatives / 15 min

---

### Étape 4 — Onboarding

**Route :** `GET /onboarding` → `onboarding.html`

- Checklist guidée pour les premières étapes
- Coach vocal Alex (IA Haiku) pour présenter chaque étape

---

### Étape 5 — Fiche bien (Mon Bien)

**Route :** `GET /mon-bien` → `property.html`  
**API :** `POST /api/property`, `GET /api/property`

- Formulaire complet : type, adresse, prix, surface, pièces, DPE, chauffage, extérieurs, transports, équipements…
- Historique des prix : chaque modification de prix est tracée dans `property_price_history`
- Génération automatique du `slug` (UUID + ville) à la création
- Création automatique de deux tokens à la création :
  - `acheteur_token` → URL dossier acheteur public
  - `notaire_token` → URL dossier notaire privé
- IA Haiku : `POST /api/property/generate-description` → génère 300-400 mots via Claude Haiku
- Score de complétude : `GET /api/score` → note /100 avec recommandations

---

### Étape 6 — Photos

**Route :** `GET /mon-bien` (onglet photos), `GET /mon-guide-photos` → `guide-photos.html`  
**API :** `POST /api/property/photos`, `DELETE /api/property/photos/:cloudinary_id`, `PUT /api/property/photos/reorder`

- Catégories : `pro`, `exterieur`, `decouverte`, `diagnostics`
- Upload Cloudinary (ou local en dev)
- Maximum 100 photos par bien
- Auto-trigger : si ≥ 5 photos uploadées → `photographer_done=1`
- Réorganisation par drag & drop (ordre conservé via `order_index`)
- Guide photos immersives (pièce par pièce avec angle_label)

---

### Étape 7 — Documents

**Route :** `GET /mon-bien` (onglet documents)  
**API :** `POST /api/property/documents`, `DELETE /api/property/documents/:id`

- Dossiers : `diagnostics`, `acheteur_serieux`, `notaire`, `plans`
- Documents requis (contrôle complétude) : DPE, taxe foncière, certificat assainissement
- Visibilité contrôlée par flags vendeur :
  - `diagnostics_in_dossier` → diagnostics visibles acheteur
  - `acheteur_docs_visible` → dossier acheteur sérieux visible
  - `plan_docs_visible` → plans visibles

---

### Étape 8 — Publication

**Route :** `POST /api/property/publish`

- Vérifie type + adresse + prix renseignés
- Marque `published=1`, `published_at`, `status='en-ligne'`
- Email envoyé : **`published`** → "Votre annonce est en ligne"
- Bouton WhatsApp sur dashboard pour partager sur 5 étapes *(ajouté P7)*

**Suivi des publications externes :**
- `GET/POST /mes-publications` → tracker LeBonCoin, PAP, SeLoger, etc.
- `GET/POST /mes-performances` → saisir vues, favoris, messages, visites, offres par plateforme
- IA Haiku : `POST /api/performances/analyze` → analyse et conseils sur les taux de conversion

---

### Étape 9 — Agenda & Disponibilités

**Route :** `GET /mon-agenda` → `agenda.html`  
**API :** `GET/POST /api/agenda`

- Créneaux récurrents (par jour de semaine) ou ponctuels (date spécifique)
- Un vendeur peut avoir plusieurs créneaux actifs

**Synchronisation calendrier** *(ajouté P5)* :
- `GET /api/agenda/feed.ics?token=xxx` → feed webcal public (sans JWT, via `calendar_token` UUID)
- URL affiché dans l'agenda, bouton copier, lien `webcal://` direct
- `calendar_token` auto-généré à la migration pour les comptes existants

**ICS individuel par visite :**
- `GET /api/visits/:id/calendar.ics` → fichier .ics téléchargeable (bouton 📅 dans l'agenda)

---

### Étape 10 — Gestion des visites

**Route :** `GET /mon-agenda` (section visites)  
**API :** `GET /api/visits`, `POST /api/visits`, `PUT /api/visits/:id/status`, `DELETE /api/visits/:id`

- Créer une visite manuellement (avec buyer_name, phone, email, date, heure)
- Accepter/refuser/annuler une demande de visite entrante
- Quand statut → `confirmed` :
  - Email acheteur : **`visit_confirmation`**
  - Notification interne vendeur
- Notes par visite : `PUT /api/visits/:id/notes`
- Suivi SMS copié : `PUT /api/visits/:id/sms-copied`

**Anti double-booking** *(ajouté P2)* :
- Index UNIQUE SQLite sur `(property_id, visit_date, visit_time)` WHERE `status != 'cancelled'`
- Vérification SQL côté serveur avant tout INSERT

---

### Étape 11 — Contacts acheteurs (pipeline)

**API :** `GET /api/connect/overview`, `GET /api/pipeline`, `POST /api/connect/contacts`

**Scoring acheteurs** *(ajouté P8)* — 5 niveaux calculés à la volée (pas en DB) :
| Score | Label | Couleur | Condition |
|-------|-------|---------|-----------|
| 4 | Offre déposée | #2e7d32 (vert) | Offre dans `offers` |
| 3 | Visite réalisée | #C4603A (terracotta) | Visite `done` ou `confirmed` passée |
| 2 | Visite planifiée | #e65100 (orange) | Visite `confirmed` à venir |
| 1 | Dossier envoyé | #1565c0 (bleu) | `dossier_sent=1` |
| 0 | Nouveau | #999 (gris) | Aucun des critères ci-dessus |

- Panel "Acheteurs" dans la sidebar agenda, trié par score décroissant
- Export CSV : `GET /api/connect/contacts/export.csv`
- IA Haiku insight : `POST /api/connect/ai-insight` → conseil pipeline personnalisé

---

### Étape 12 — Séquence post-visite automatisée

**Déclenché par cron quotidien 18h00 (`services/reminders.js`)**

| Délai | Destinataire | Email/Action | triggerKey |
|-------|-------------|-------------|------------|
| J+1 | Acheteur | **`post_visit_dossier`** — "Voici le dossier complet" + lien dossier acheteur | `post_visit_dossier:{visit.id}` |
| J+3 | Acheteur | **`post_visit_j3`** — "Avez-vous eu le temps de réfléchir ?" + CTA offre *(ajouté P4)* | `post_visit_j3:{visit.id}` |
| J+7 | Acheteur | **`post_visit_buyer`** — "L'offre est-elle toujours d'actualité ?" + lien offre | `post_visit_j7:{visit.id}` |

Conditions : visite `confirmed` ou `done`, pas d'offre déjà déposée, `triggerKey` unique en DB (pas de doublons).

---

### Étape 13 — Offres d'achat

**Route :** `GET /mes-offres` → `offers.html`  
**API :** `GET /api/mes-offres`, `GET /api/offers`, `PUT /api/offers/:id/status`, `POST /api/offers/:id/counter`, `DELETE /api/offers/:id`

- Lien offre acheteur : `GET /api/offre-link` → URL `/soumettre-offre/:acheteur_token`
- Quand offre reçue : SMS vendeur + notification interne
- Actions vendeur : accepter / refuser / contre-proposer (montant contre)
- Statuts : `pending` → `accepted` | `refused` | `countered`

---

### Étape 14 — Vente conclue

**Route :** `POST /api/property/status` avec `status='vendu'`

- Email vendeur : **`sold_congrats`** → félicitations + récap
- Email acheteurs (tous les visiteurs avec email) : **`property_sold_to_buyer`** → notification vente
- SMS vendeur : si configuré

---

### Étape 15 — Dossier notaire

**Route :** `GET /dossier/notaire/:token` → `dossier-notaire.html` (privé, lien partagé manuellement)  
**API :** `GET /api/dossier/notaire/:token`, `POST /api/dossier/notaire/send-email`

- Tous les documents (diagnostics + acheteur_serieux + notaire)
- Photos (10 max)
- Offres reçues (5 dernières)
- Envoi par email : `POST /api/dossier/notaire/send-email` → email **`dossier_notaire`** au notaire

---

### Formation & Coaching (transversal)

**Routes :**
- `GET /ma-formation` → `library.html` — modules vidéo + quiz
- `GET /coaching-vpm` → `coaching-vpm.html`
- `GET /coach-ia` → `coach.html` — chat IA streaming (SSE, 30 msg/h max)

**API IA :**
- `POST /api/formation/chat` → Alex coach, historique 6 messages
- `POST /api/formation/speak` → résumé vocal 2 phrases
- `POST /api/coach-ia` → chat expert vente immo (streaming SSE)

---

### Rapport hebdomadaire vendeur

**Déclenché par cron lundi 8h00**

Email envoyé : **`weekly_seller`** *(enrichi P9)*
- Vues cette semaine + tendance vs semaine précédente (hausse/baisse/stable)
- Contacts totaux + visites totales + offres totales
- Visites à venir dans les 7 prochains jours
- Conseil personnalisé selon position dans le funnel :
  - Offres présentes → "Répondez rapidement"
  - Visites sans offre → "Relancez vos visiteurs"
  - Contacts sans visite → "Vérifiez vos disponibilités agenda"
  - Vues sans contact → "Revoyez prix et photos"

---

## PARCOURS ACHETEUR

> **Principe clé :** Vendu Par Moi n'intervient pas dans les échanges entre vendeurs et acheteurs. Le vendeur publie son annonce avec son propre numéro de téléphone. Quand un acheteur le contacte, c'est le vendeur qui lui envoie manuellement le lien dossier depuis son espace. Les seules automatisations de la plateforme sont les emails envoyés aux vendeurs pour les accompagner dans leur vente.

---

### Étape 1 — Contact initial (hors plateforme)

L'acheteur découvre l'annonce sur LeBonCoin, PAP, SeLoger ou autre portail. Il contacte le vendeur directement par **téléphone ou SMS** au numéro personnel du vendeur indiqué sur l'annonce.

Vendu Par Moi n'intercepte pas ces échanges.

---

### Étape 2 — Envoi du lien dossier (action vendeur)

Depuis son espace vendeur (`/mon-bien` ou `/mon-agenda`), le vendeur copie son **lien dossier acheteur unique** et l'envoie manuellement à l'acheteur (par SMS, WhatsApp ou email).

**Format du lien :** `https://venduparmo.fr/dossier/acheteur/:token`

Ce token est unique par bien, généré à la création de la fiche. Le vendeur peut le régénérer à tout moment : `POST /api/property/regenerate-tokens`.

---

### Étape 3 — Consultation du dossier

**Route :** `GET /dossier/acheteur/:token` → `dossier-acheteur.html`  
**API :** `GET /api/dossier/acheteur/:token`, `GET /api/dossier/acheteur/:token/creneaux`

Accès public, sans compte. L'acheteur consulte :
- Fiche descriptive complète du bien
- Galerie photos (pro, extérieur, immersive, technique)
- Diagnostics et documents (selon flags vendeur)
- Informations complémentaires
- Agenda de réservation de visite avec les disponibilités du vendeur

Contenu affiché selon flags vendeur :
- `diagnostics_in_dossier` → diagnostics visibles
- `acheteur_docs_visible` → dossier acheteur sérieux visible
- `plan_docs_visible` → plans visibles

---

### Étape 4 — Page publique /bien/:slug (optionnel)

**Route :** `GET /bien/:slug` → SSR avec meta OG (titre, description, image pour partage réseaux)  
**API :** `GET /api/bien/:slug`, `GET /api/bien/:slug/creneaux`

Page publique partageable (liens réseaux sociaux, QR code…). Moins complète que le dossier acheteur. Tracking des pages vues → `property_page_views`. Export PDF : `GET /api/bien/:slug/pdf`.

---

### Étape 5 — Réservation visite avec qualification obligatoire *(renforcé P2 + P3)*

**API :** `POST /api/dossier/acheteur/:token/reserver`

Champs requis :
- `buyer_name`, `buyer_email`, `visit_date`, `visit_time` *(existants)*
- `buyer_budget` *(nouveau, obligatoire)*
- `buyer_financing` *(nouveau, obligatoire)*
- `buyer_timeline` *(nouveau, obligatoire)*

Validations :
- Si budget/financement/délai manquants → `400` + message d'erreur
- Anti double-booking créneau : vérification SQL `property_id + visit_date + visit_time`
- Anti double-booking email *(ajouté P2)* : un acheteur ne peut réserver qu'une seule visite par bien (même email)
- Email normalisé en minuscules sur INSERT *(corrigé P2)*

Si OK :
- Visite créée avec `status='confirmed'`
- Email acheteur : **`visit_confirmation`** → récap date/heure/adresse
- Email vendeur : **`new_visit_request`** → alerte nouvelle visite
- Notification interne vendeur

---

### Étape 6 — Rappel visite J-1

**Déclenché par cron quotidien 18h00**

Email acheteur : **`visit_reminder`** → "Votre visite demain à [heure]"  
Email vendeur : **`seller_visit_reminder`** → récap des visites du lendemain

---

### Étape 7 — Jour de visite

La visite se déroule en présentiel. Le vendeur peut noter ses observations dans `PUT /api/visits/:id/notes`.

---

### Étape 8 — Post-visite automatisé

*(Voir Étape 12 du parcours vendeur — mêmes séquences, vues côté acheteur)*

| Délai | Email | Contenu |
|-------|-------|---------|
| J+1 | **`post_visit_dossier`** | "Bonjour [prénom], voici le dossier complet du bien" + photos + lien |
| J+3 | **`post_visit_j3`** | "Avez-vous eu le temps de réfléchir ?" + "Voir le dossier et faire une offre" *(ajouté P4)* |
| J+7 | **`post_visit_buyer`** | Dernière relance + lien offre |

---

### Étape 9 — Offre d'achat

**Route :** `GET /soumettre-offre/:token` → `soumettre-offre.html`  
**API :** `GET /api/soumettre-offre/:token/info`, `POST /api/soumettre-offre/:token`

- Public, sans authentification
- Champs : prénom, nom, email, téléphone, montant, durée de validité (défaut 10j), conditions, message
- À la soumission :
  - Notification interne vendeur (type `offer`)
  - SMS vendeur : "💰 Nouvelle offre reçue ! [nom] propose [montant] €"
- L'acheteur voit l'offre dans `mes-offres` (côté vendeur)

---

## EMAILS AUTOMATIQUES — CATALOGUE COMPLET

| # | Clé template | Déclencheur | Destinataire |
|---|-------------|-------------|-------------|
| 1 | `welcome` | Paiement Stripe validé | Vendeur |
| 2 | `invoice` | Paiement Stripe validé | Vendeur |
| 3 | `published` | `POST /api/property/publish` | Vendeur |
| 4 | `visit_confirmation` | Visite confirmée (via dossier ou agenda) | Acheteur |
| 5 | `new_visit_request` | Nouvelle visite (dossier acheteur ou agenda vendeur) | Vendeur |
| 7 | `prospect_nudge` | Cron — acheteur sans réponse depuis 7j | Vendeur |
| 8 | `no_property` | Cron — vendeur sans fiche bien | Vendeur |
| 9 | `no_photos` | Cron — vendeur avec fiche mais sans photos | Vendeur |
| 10 | `not_published` | Cron — fiche complète non publiée | Vendeur |
| 11 | `missing_doc` | Cron — documents manquants | Vendeur |
| 12 | `photographer_request` | Demande photographe | Photographe |
| 13 | `post_first_visit` | Première visite réalisée | Vendeur |
| 14 | `check_in_no_offer` | Cron — 14j sans offre après visite | Vendeur |
| 15 | `contract_renewal` | Cron — fin de contrat approche | Vendeur |
| 16 | `post_visit_dossier` | Cron J+1 post-visite | Acheteur |
| 17 | `post_visit_j3` | Cron J+3 post-visite *(nouveau P4)* | Acheteur |
| 18 | `post_visit_buyer` | Cron J+7 post-visite | Acheteur |
| 19 | `price_drop` | Cron — pas d'offre après 30j | Vendeur (suggestion baisse prix) |
| 20 | `weekly_seller` | Cron lundi 8h *(enrichi P9)* | Vendeur |
| 21 | `weekly_admin` | Cron lundi 8h | Admin |
| 22 | `review_request` | Cron — bien vendu | Vendeur |
| 23 | `sold_congrats` | `status='vendu'` | Vendeur |
| 24 | `property_sold_to_buyer` | `status='vendu'` | Tous les acheteurs visiteurs |
| 25 | `visit_reminder` | Cron J-1 visite | Acheteur |
| 26 | `seller_visit_reminder` | Cron J-1 visite | Vendeur |
| 27 | `password_reset` | `POST /api/forgot-password` | Vendeur |
| 28 | `dossier_notaire` | `POST /api/dossier/notaire/send-email` | Notaire |
| 29 | `mission_assigned` | Mission photographe créée | Photographe |

---

## NOTIFICATIONS INTERNES (sidebar)

Les notifications `IN-APP` sont stockées dans la table `notifications` et lues via `GET /api/me` (25 dernières) ou `GET /api/notifications/all` (100).

Types : `visit_request`, `visit_confirmed`, `new_contact`, `offer`

Compteurs sidebar : `GET /api/notifications/counts`
- `pendingOffers` → contacts des 7 derniers jours
- `upcomingVisits` → visites confirmées dans les 7 prochains jours
- `unreadNotifs` → notifications non lues

---

## JOBS CRON — RÉCAPITULATIF

| Heure | Fréquence | Actions |
|-------|-----------|---------|
| 18h00 | Quotidien | Rappels visites J-1 (acheteur + vendeur) |
| 18h00 | Quotidien | Rappels missions photographe |
| 18h00 | Quotidien | Nudges acheteurs (prospect_nudge) |
| 18h00 | Quotidien | Post-visite J+1 dossier |
| 18h00 | Quotidien | Post-visite J+3 relance *(nouveau P4)* |
| 18h00 | Quotidien | Post-visite J+7 offre |
| 18h00 | Quotidien | Prélèvements mensualités Stripe (4×) |
| 18h00 | Quotidien | Nudges baisse de prix (30j sans offre) |
| 08h00 | Lundi | Rapport hebdomadaire vendeurs *(enrichi P9)* |
| 08h00 | Lundi | Rapport admin hebdomadaire |

---

## ADMIN

**Route base :** `/admin` (cookie `admin_token`, 8h)

- Dashboard CRM : liste vendeurs, statuts, packs
- Finance : paiements, mensualités
- Emails preview : `/admin/emails` → catalogue 29+ templates avec données factices *(refait P1)*
- Missions photographes : assignation, suivi
- Marketing : nudges, relances globales

---

## CE QUI A ÉTÉ MODIFIÉ/AJOUTÉ LORS DE L'AUDIT (10/06/2026)

| Priorité | Modification | Fichier(s) |
|----------|-------------|------------|
| P1 | Refonte complète de `email.js` (32 templates, preview admin) | `services/email.js`, `routes/admin.js` |
| P2 | Anti double-booking : index UNIQUE SQLite + vérification email en doublon + normalisation minuscules | `database.js`, `routes/dossier.js` |
| P3 | Qualification acheteur obligatoire : budget/financement/délai requis front + back | `routes/dossier.js`, `views/public/dossier-acheteur.html` |
| P4 | Séquence post-visite J+3 : nouvelle relance acheteur à J+3 | `services/email.js`, `services/reminders.js`, `server.js` |
| P5 | Sync calendrier : feed webcal `/api/agenda/feed.ics?token=xxx` + UI agenda | `routes/seller.js`, `database.js`, `views/seller/agenda.html` |
| P6 | Backup cloud : renommage dossier Cloudinary → `venduparmo-backups/` | `services/backup.js` |
| P7 | Partage social : bouton WhatsApp natif sur 5 étapes dashboard | `views/seller/dashboard.html` |
| P8 | Scoring contacts acheteurs : 5 niveaux calculés à la volée, panel sidebar agenda | `routes/seller.js`, `views/seller/agenda.html` |
| P9 | Rapport hebdo enrichi : tendance vues, visites à venir, conseil funnel personnalisé | `services/email.js`, `services/reminders.js` |
