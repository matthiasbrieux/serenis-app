# Parcours complet — Vendu Par Moi
*Dernière mise à jour : 10/06/2026 — basé sur lecture intégrale du code (routes, vues HTML, services)*

---

## PRINCIPE DE FONCTIONNEMENT

**Vendu Par Moi n'intervient pas dans les échanges entre vendeurs et acheteurs.**

Le vendeur publie son annonce avec son propre numéro de téléphone personnel. Quand un acheteur le contacte, c'est le vendeur qui lui envoie manuellement le lien dossier depuis son espace. Toutes les automatisations de VPM concernent uniquement les communications envoyées **aux vendeurs** pour les accompagner dans leur vente.

---

## PARCOURS VENDEUR

### Étape 1 — Inscription & Paiement

**Entrée :** Landing page → bouton CTA pack

**Route :** `POST /create-checkout` → Stripe hosted checkout

Deux packs disponibles :
- **Autonome** : 499 €, paiement unique
- **Sérénité** : 999 € unique ou 4 × 249 €

Le compte vendeur est créé **avant** la redirection Stripe (email + mot de passe saisis à l'inscription).

À la validation du paiement (`checkout.session.completed`) :
- `activateSeller()` marque `paid_at`
- Si plan 4× : sauvegarde la carte Stripe pour les 3 prélèvements suivants, enregistre `next_installment_date` à J+30

Emails déclenchés :
- **`welcome`** → accès espace vendeur (+ lien reset mot de passe si généré automatiquement)
- **`invoice`** → facture avec numéro `VPM-YYYY-XXXXX`

**Après paiement :**
- `GET /paiement-succes` → auto-login (cookie JWT 30j) + redirect `/booking`

---

### Étape 2 — Booking séance photo (onboarding immédiat)

**Route :** `GET /booking` → `booking.html`
**API :** `POST /api/booking`

Le vendeur renseigne :
- Type de bien, adresse complète, surface, pièces, étage, meublé
- Créneaux de disponibilités (JSON `availability_slots` + note)

Sauvegarde : `client_availability`, `booking_step=1`

Si pack **Sérénité** : réservation d'un créneau photographe disponible
- `GET /api/seller/available-slots?postal_code=xxx` → liste des photographes partenaires
- `POST /api/seller/book-photography` → crée la mission + email photographe **`mission_assigned`**

---

### Étape 3 — Contrat & Signature électronique

**Route :** `GET /contrat` → `contrat.html`
**API :** `POST /api/contrat/sign`

Accès obligatoire : si `contrat_signe = 0`, `requireAuth` redirige automatiquement vers `/contrat` (sauf routes exemptées).

À la signature : `contrat_signe=1`, `contrat_signe_at`, `contrat_ip` (IP réelle via `x-forwarded-for`).
Rate limit : 5 tentatives / 15 min.

---

### Étape 4 — Onboarding

**Route :** `GET /onboarding` → `onboarding.html`

Checklist guidée des premières étapes. Progression sauvegardée via `POST /api/checklist`.

---

### Étape 5 — Fiche bien (Mon Bien)

**Route :** `GET /mon-bien` → `property.html`
**API :** `GET/POST /api/property`

Formulaire complet : type, adresse, prix, surface, pièces, DPE, chauffage, extérieurs, transports, équipements, diagnostics renseignés, etc.

À la **création** du bien :
- Génération du `slug` (UUID court + ville)
- Génération de `acheteur_token` (UUID) → URL dossier acheteur public
- Génération de `notaire_token` (UUID) → URL dossier notaire privé

Fonctions disponibles :
- **Score de complétude** `GET /api/score` → note /100 avec recommandations actionnables (photos, description, prix, docs, publications)
- **Génération IA** `POST /api/property/generate-description` → texte 300-400 mots via Claude Haiku
- **Historique des prix** : toute modification de prix est tracée dans `property_price_history`
- **Régénération des tokens** `POST /api/property/regenerate-tokens` → invalide les anciens liens

---

### Étape 6 — Photos

**Route :** `GET /mon-bien` (onglet photos) + `GET /mon-guide-photos` → `guide-photos.html`
**API :** `POST /api/property/photos`, `DELETE /api/property/photos/:cloudinary_id`, `PUT /api/property/photos/reorder`

4 catégories de photos :
- `pro` — photos professionnelles
- `exterieur` — façade et extérieurs
- `decouverte` — photos immersives pièce par pièce (avec `room` + `angle_label`)
- `diagnostics` — photos techniques

Upload Cloudinary en prod, local en dev. Maximum 100 photos par bien.
Auto-trigger : si ≥ 5 photos uploadées → `photographer_done=1`.
Réorganisation par drag & drop (ordre conservé via `order_index`).

---

### Étape 7 — Documents

**Route :** `GET /mon-bien` (onglet documents)
**API :** `POST /api/property/documents`, `DELETE /api/property/documents/:id`

4 dossiers Cloudinary :
- `diagnostics` — DPE, amiante, plomb, électricité…
- `acheteur_serieux` — entretien chaudière, ramonage, travaux réalisés…
- `notaire` — titre de propriété, etc.
- `plans` — plans du bien

Documents requis pour le score de complétude : DPE, taxe foncière, certificat assainissement.

Visibilité contrôlée par flags vendeur (modifiables dans Mon Bien) :
- `diagnostics_in_dossier` → diagnostics visibles dans le dossier acheteur
- `acheteur_docs_visible` → dossier acheteur sérieux visible
- `plan_docs_visible` → plans visibles

---

### Étape 8 — Publication

**Route :** `POST /api/property/publish`

Vérifie que type + adresse + prix sont renseignés.
Marque `published=1`, `published_at`, `status='en-ligne'`.

Email vendeur : **`published`** → "Votre annonce est en ligne"

**Suivi des publications externes :**
- `GET/POST /mes-publications` → tracker LeBonCoin, PAP, SeLoger, etc. (URL, statut actif)
- `GET/POST /mes-performances` → saisir manuellement vues, favoris, messages, visites, offres par plateforme
- `POST /api/performances/analyze` → IA Haiku analyse les taux de conversion et donne des conseils

---

### Étape 9 — Partage du dossier acheteur (cœur du concept)

**Route :** `GET /dashboard` → section "Ma vente en 2 clics"

Le vendeur dispose de **5 liens** à copier et envoyer manuellement à ses interlocuteurs (SMS, WhatsApp, email). Chaque lien est accompagné d'un **message pré-rédigé** et d'un **bouton WhatsApp direct**.

| Étape | Intitulé | Lien | Moment d'envoi |
|-------|----------|------|----------------|
| 1 | Fiche descriptive + photos + DPE et diagnostics | `/dossier/acheteur/:token` | Avant la visite — premier contact |
| 2 | Réservation de visite | `/dossier/acheteur/:token#reservation` | Pour que l'acheteur choisisse un créneau |
| 3 | Dossier acheteur sérieux | `/dossier/acheteur/:token` | Après la visite (docs complémentaires) |
| 4 | Soumission d'offre | `/soumettre-offre/:token` | Quand l'acheteur est prêt à faire une offre |
| 5 | Dossier notaire complet | `/dossier/notaire/:token` | Pour le notaire en vue du compromis |

> Les étapes 1, 2 et 3 utilisent le **même lien dossier acheteur**. L'étape 2 ajoute `#reservation` pour scroller directement vers l'agenda. L'étape 3 suppose que le vendeur a activé `acheteur_docs_visible` pour rendre les docs complémentaires visibles.

---

### Étape 10 — Agenda & Disponibilités

**Route :** `GET /mon-agenda` → `agenda.html`
**API :** `GET/POST /api/agenda`

Le vendeur configure ses créneaux de disponibilité :
- **Récurrents** : par jour de semaine (ex. "tous les samedis 10h-17h")
- **Ponctuels** : date spécifique

**Synchronisation calendrier :**
- `GET /api/agenda/feed.ics?token=xxx` → feed webcal public sans authentification, via `calendar_token` UUID unique par vendeur
- URL copiable + lien `webcal://` direct dans l'interface agenda
- `calendar_token` auto-généré à la migration pour les comptes existants

**ICS individuel par visite :**
- `GET /api/visits/:id/calendar.ics` → fichier .ics téléchargeable (bouton 📅 dans l'agenda, auth JWT)

---

### Étape 11 — Gestion des visites

**Route :** `GET /mon-agenda` (section visites)
**API :** `GET /api/visits`, `POST /api/visits`, `PUT /api/visits/:id/status`, `DELETE /api/visits/:id`

Le vendeur peut :
- Créer une visite manuellement (buyer_name, phone, email, date, heure)
- Confirmer / refuser / annuler une visite entrante

Quand statut → `confirmed` :
- Email acheteur : **`visit_confirmation`**
- Notification interne vendeur

Fonctions complémentaires :
- Notes par visite : `PUT /api/visits/:id/notes`
- `PUT /api/visits/:id/sms-copied` → traçabilité SMS

**Anti double-booking :**
- Index UNIQUE SQLite sur `(property_id, visit_date, visit_time)` WHERE `status != 'cancelled'`
- Vérification SQL avant INSERT (côté API dossier acheteur)
- Un même email ne peut réserver qu'une seule visite par bien

---

### Étape 12 — Contacts acheteurs & Scoring

**API :** `GET /api/connect/overview`, `GET /api/pipeline`, `POST /api/connect/contacts`

Scoring acheteurs — 5 niveaux calculés à la volée (jamais stockés en base) :

| Score | Label | Couleur | Condition |
|-------|-------|---------|-----------|
| 4 | Offre déposée | #2e7d32 vert | Offre dans la table `offers` |
| 3 | Visite réalisée | #C4603A terracotta | Visite `done` ou `confirmed` passée |
| 2 | Visite planifiée | #e65100 orange | Visite `confirmed` à venir |
| 1 | Dossier envoyé | #1565c0 bleu | `dossier_sent=1` |
| 0 | Nouveau | #999 gris | Aucun critère |

- Panel "Acheteurs" dans la sidebar de l'agenda, trié par score décroissant
- Export CSV : `GET /api/connect/contacts/export.csv`
- IA Haiku insight : `POST /api/connect/ai-insight` → conseil pipeline personnalisé

---

### Étape 13 — Séquence post-visite automatisée

**Déclenché par cron quotidien 18h00 (`services/reminders.js`)**

Envoyé uniquement si aucune offre déjà déposée. Un `triggerKey` unique évite les doublons.

| Délai | Destinataire | Email | triggerKey |
|-------|-------------|-------|------------|
| J+1 | Acheteur | **`post_visit_dossier`** — lien dossier complet | `post_visit_dossier:{visit.id}` |
| J+3 | Acheteur | **`post_visit_j3`** — "Avez-vous eu le temps de réfléchir ?" | `post_visit_j3:{visit.id}` |
| J+7 | Acheteur | **`post_visit_buyer`** — dernière relance + lien offre | `post_visit_j7:{visit.id}` |

---

### Étape 14 — Offres d'achat

**Route :** `GET /mes-offres` → `offers.html`
**API :** `GET /api/mes-offres`, `GET /api/offers`, `PUT /api/offers/:id/status`, `POST /api/offers/:id/counter`, `DELETE /api/offers/:id`

Le lien d'offre est `/soumettre-offre/:acheteur_token` (étape 4 du dashboard).

Quand une offre est reçue :
- Notification interne vendeur (type `offer`)
- SMS vers `seller.phone` (numéro personnel) : "💰 Nouvelle offre reçue !"

Actions vendeur : accepter / refuser / contre-proposer (montant)
Statuts : `pending` → `accepted` | `refused` | `countered`

Le dashboard affiche les offres `pending` en priorité maximale, masquées si aucune.

---

### Étape 15 — Vente conclue

**Route :** `POST /api/property/status` avec `status='vendu'`

- Email vendeur : **`sold_congrats`**
- Email acheteurs (tous les visiteurs avec un email) : **`property_sold_to_buyer`**

---

### Étape 16 — Dossier notaire

**Route :** `GET /dossier/notaire/:token` → `dossier-notaire.html`
**API :** `GET /api/dossier/notaire/:token`, `POST /api/dossier/notaire/send-email`

Accessible via lien privé partagé manuellement (étape 5 du dashboard).
Contient : tous les documents, 10 photos max, 5 dernières offres reçues.
Envoi direct par email : `POST /api/dossier/notaire/send-email` → email **`dossier_notaire`** au notaire.

---

### Formation & Coaching (transversal)

**Routes :**
- `GET /ma-formation` → `library.html` — **16 étapes** de formation (progression stockée en `localStorage vpm_done_steps`)
- `GET /coaching-vpm` → `coaching-vpm.html`
- `GET /coach-ia` → `coach.html` — chat IA streaming (SSE, 30 messages/heure max)
- `GET /ma-bibliotheque` → `biblio.html`

**API IA (Claude Haiku) :**
- `POST /api/formation/chat` → Alex coach, historique 6 messages
- `POST /api/formation/speak` → résumé vocal 2 phrases
- `POST /api/coach-ia` → chat expert vente immo streaming SSE

---

### Rapport hebdomadaire vendeur

**Déclenché par cron lundi 8h00**

Email : **`weekly_seller`**
- Vues cette semaine + tendance vs semaine précédente (hausse / baisse / stable)
- Contacts totaux, visites totales, offres totales
- Visites à venir dans les 7 prochains jours
- Conseil personnalisé selon position dans le funnel :
  - Offres présentes → "Répondez rapidement"
  - Visites sans offre → "Relancez vos visiteurs"
  - Contacts sans visite → "Vérifiez vos disponibilités agenda"
  - Vues sans contact → "Revoyez prix et photos"

---

## PARCOURS ACHETEUR

### Étape 1 — Contact direct (hors plateforme)

L'acheteur découvre l'annonce sur LeBonCoin, PAP, SeLoger ou autre portail. Il contacte le vendeur directement par téléphone ou SMS au **numéro personnel du vendeur** indiqué sur l'annonce.

VPM n'intercepte pas ces échanges.

---

### Étape 2 — Réception du lien dossier (action vendeur)

Depuis son dashboard ("Ma vente en 2 clics"), le vendeur copie son lien dossier et l'envoie manuellement à l'acheteur via SMS, WhatsApp ou email.

**Lien :** `https://venduparmo.fr/dossier/acheteur/:token`

Le vendeur peut aussi envoyer le message pré-rédigé ou ouvrir directement WhatsApp avec le bouton dédié. Le token peut être régénéré à tout moment : `POST /api/property/regenerate-tokens`.

---

### Étape 3 — Consultation du dossier

**Route :** `GET /dossier/acheteur/:token` → `dossier-acheteur.html`
**API :** `GET /api/dossier/acheteur/:token`

Accès public, sans compte, sans téléchargement d'application.

L'acheteur consulte :
- Fiche descriptive complète (type, surface, pièces, DPE, chauffage, extérieurs…)
- Galerie photos (pro, extérieur, immersive, technique)
- Diagnostics obligatoires (si `diagnostics_in_dossier=1`)
- Documents complémentaires (si `acheteur_docs_visible=1`)
- Plans (si `plan_docs_visible=1`)
- Agenda de réservation avec les disponibilités du vendeur

---

### Étape 4 — Réservation de visite

**API :** `POST /api/dossier/acheteur/:token/reserver`
**Créneaux disponibles :** `GET /api/dossier/acheteur/:token/creneaux`

Champs obligatoires :
- Nom, email, téléphone, date, heure
- **Budget maximum** *(obligatoire)*
- **Financement** *(obligatoire)*
- **Délai d'achat souhaité** *(obligatoire)*

Validations :
- Budget / financement / délai manquants → erreur 400 + bordure rouge sur les champs
- Anti double-booking créneau : `property_id + visit_date + visit_time`
- Anti double-booking email : un même email ne peut réserver qu'une visite par bien
- Email normalisé en minuscules sur INSERT

Si OK :
- Visite créée avec `status='confirmed'`
- Email acheteur : **`visit_confirmation`** → récap date / heure / adresse
- Email vendeur : **`new_visit_request`** → alerte nouvelle visite
- Notification interne vendeur

---

### Étape 5 — Rappel visite J-1

**Déclenché par cron quotidien 18h00**

- Email acheteur : **`visit_reminder`**
- Email vendeur : **`seller_visit_reminder`** → récap des visites du lendemain

---

### Étape 6 — Jour de visite

La visite se déroule en présentiel. Le vendeur note ses observations dans `PUT /api/visits/:id/notes`.

---

### Étape 7 — Post-visite automatisé (VPM → acheteur)

| Délai | Email | Contenu |
|-------|-------|---------|
| J+1 | **`post_visit_dossier`** | "Bonjour [prénom], voici le dossier complet" + lien |
| J+3 | **`post_visit_j3`** | "Avez-vous eu le temps de réfléchir ?" + CTA offre |
| J+7 | **`post_visit_buyer`** | Dernière relance + lien offre |

---

### Étape 8 — Offre d'achat

**Route :** `GET /soumettre-offre/:token` → `soumettre-offre.html`
**API :** `GET /api/soumettre-offre/:token/info`, `POST /api/soumettre-offre/:token`

Accès public, sans compte. L'acheteur saisit : prénom, nom, email, téléphone, montant, durée de validité (défaut 10j), conditions suspensives, message.

À la soumission :
- Notification interne vendeur (type `offer`)
- SMS vers le numéro personnel du vendeur : "💰 Nouvelle offre reçue !"

---

### Page publique /bien/:slug (canal secondaire)

**Route :** `GET /bien/:slug` → `property-public.html` avec meta OG injectées (SSR)
**API :** `GET /api/bien/:slug`, `GET /api/bien/:slug/creneaux`, `POST /api/bien/:slug/reserver`

Page partageable sur les réseaux sociaux (lien + QR code). Contient fiche + photos + réservation simplifiée (sans qualification acheteur obligatoire). Tracking des pages vues → `property_page_views`. Export PDF : `GET /api/bien/:slug/pdf`.

---

## EMAILS AUTOMATIQUES — CATALOGUE COMPLET

| # | Clé | Déclencheur | Destinataire |
|---|-----|-------------|-------------|
| 1 | `welcome` | Paiement Stripe validé | Vendeur |
| 2 | `invoice` | Paiement Stripe validé | Vendeur |
| 3 | `published` | `POST /api/property/publish` | Vendeur |
| 4 | `visit_confirmation` | Visite confirmée (dossier ou agenda) | Acheteur |
| 5 | `new_visit_request` | Nouvelle visite reçue | Vendeur |
| 6 | `no_property` | Cron — vendeur sans fiche bien | Vendeur |
| 7 | `no_photos` | Cron — fiche sans photos | Vendeur |
| 8 | `not_published` | Cron — fiche complète non publiée | Vendeur |
| 9 | `missing_doc` | Cron — documents manquants | Vendeur |
| 10 | `photographer_request` | Demande photographe | Photographe |
| 11 | `post_first_visit` | Première visite réalisée | Vendeur |
| 12 | `check_in_no_offer` | Cron — 14j sans offre après visite | Vendeur |
| 13 | `contract_renewal` | Cron — fin de contrat approche | Vendeur |
| 14 | `post_visit_dossier` | Cron J+1 post-visite | Acheteur |
| 15 | `post_visit_j3` | Cron J+3 post-visite | Acheteur |
| 16 | `post_visit_buyer` | Cron J+7 post-visite | Acheteur |
| 17 | `price_drop` | Cron — pas d'offre après 30j | Vendeur |
| 18 | `weekly_seller` | Cron lundi 8h | Vendeur |
| 19 | `weekly_admin` | Cron lundi 8h | Admin |
| 20 | `review_request` | Cron — bien vendu | Vendeur |
| 21 | `sold_congrats` | `status='vendu'` | Vendeur |
| 22 | `property_sold_to_buyer` | `status='vendu'` | Tous les acheteurs visiteurs |
| 23 | `visit_reminder` | Cron J-1 visite | Acheteur |
| 24 | `seller_visit_reminder` | Cron J-1 visite | Vendeur |
| 25 | `password_reset` | `POST /api/forgot-password` | Vendeur |
| 26 | `dossier_notaire` | `POST /api/dossier/notaire/send-email` | Notaire |
| 27 | `mission_assigned` | Mission photographe créée | Photographe |
| 28 | `prospect_nudge` | Cron — acheteur sans suite depuis 7j | Vendeur |

---

## JOBS CRON — RÉCAPITULATIF

| Heure | Fréquence | Action |
|-------|-----------|--------|
| 18h00 | Quotidien | Rappels visites J-1 (acheteur + vendeur) |
| 18h00 | Quotidien | Rappels missions photographe |
| 18h00 | Quotidien | Post-visite J+1 dossier |
| 18h00 | Quotidien | Post-visite J+3 relance |
| 18h00 | Quotidien | Post-visite J+7 offre |
| 18h00 | Quotidien | Prélèvements mensualités Stripe (4×) |
| 18h00 | Quotidien | Nudges baisse de prix (30j sans offre) |
| 08h00 | Lundi | Rapport hebdomadaire vendeurs |
| 08h00 | Lundi | Rapport hebdomadaire admin |

---

## NOTIFICATIONS INTERNES (sidebar)

Stockées dans la table `notifications`, lues via `GET /api/me` (25 dernières) ou `GET /api/notifications/all` (100).

Types : `visit_request`, `visit_confirmed`, `new_contact`, `offer`

Compteurs sidebar (`GET /api/notifications/counts`) :
- `pendingOffers` → contacts des 7 derniers jours
- `upcomingVisits` → visites confirmées dans les 7 prochains jours
- `unreadNotifs` → notifications non lues

---

## ESPACE ADMIN

**Route base :** `/admin` (cookie `admin_token`, 8h)

- Dashboard CRM : liste vendeurs, statuts, packs
- Finance : paiements, mensualités
- Marketing : nudges, relances globales
- Missions photographes : assignation, suivi
- Emails preview : `/admin/emails` → 28+ templates avec données factices
- Guide parcours : `/admin/guide` → ce document rendu en HTML

---

## ESPACE PARTENAIRE (photographes)

**Route base :** `/partner` — authentification dédiée (cookie `partner_token`)

- `GET /partner/dashboard` → tableau de bord missions
- `GET /partner/missions` → liste des missions assignées
- `GET /partner/availability` → gestion des créneaux disponibles
- `GET /partner/profile` → profil + zone d'intervention
- `GET /partner/register` → inscription photographe partenaire

---

## CODE EN ATTENTE DE MISE À JOUR (concept abandonné)

Les éléments suivants existent encore dans le code mais correspondent à l'ancien concept de numéro Twilio dédié par vendeur, qui a été abandonné :

| Fichier | Élément | Description |
|---------|---------|-------------|
| `routes/payment.js` | `assignPhoneNumber()` | Assigne encore un numéro Twilio à chaque nouveau vendeur |
| `routes/buyer.js` | `smsWebhook()` | Répond automatiquement aux SMS reçus sur le numéro Twilio du vendeur |
| `routes/buyer.js` | `voiceWebhook()` | Répond aux appels vocaux sur le numéro Twilio |
| `routes/buyer.js` | PDF `/api/bien/:slug/pdf` | Affiche encore le Twilio number + "Envoyez votre email par SMS" |
| `routes/buyer.js` | `GET /api/bien/:slug` | Retourne encore `contact_number: seller.twilio_number` |
