# RAPPORT PRÉ-LANCEMENT — SERENIS
> Généré le 2026-05-29 · À relire avant tout lancement client

---

## 1. ARCHITECTURE & SÉCURITÉ

| Risque | Niveau | Détail |
|--------|--------|--------|
| SQLite sur Render | 🔴 BLOQUANT | Les données sont **effacées à chaque redéploiement** si le fichier DB n'est pas persisté. Render ephemeral filesystem. Utiliser Render Disk (5$/mois) ou migrer vers PostgreSQL. |
| JWT_SECRET faible | 🔴 BLOQUANT | Si `JWT_SECRET` n'est pas défini en prod, `undefined` est utilisé → tout token est forgeable. Vérifier que la variable est bien renseignée sur Render. |
| ANTHROPIC_API_KEY manquante | 🟡 IMPORTANT | Le générateur IA et le Coach IA ne fonctionnent pas sans cette clé. Guard en place mais fonctionnalité inutilisable. Ajouter sur Render Dashboard > Environment. |
| `/admin/create-seller` | ✅ Corrigé | Protégé par `requireAdmin` (fix session précédente). |
| Uploads locaux (`public/uploads/`) | 🔴 BLOQUANT | Les photos/docs uploadés localement sont perdus au redéploiement. Cloudinary est configuré — vérifier que TOUS les uploads passent bien par Cloudinary et non par le disque local. |
| Secrets dans `.env.example` | 🟢 MINEUR | `.env.example` ne contient que des placeholders `xxx`. OK. |
| Rate limiting | ✅ OK | `express-rate-limit` configuré (300 req/15min). |
| CORS/CSP | ✅ OK | Helmet configuré avec CSP. |
| SQL injection | ✅ OK | `better-sqlite3` avec requêtes préparées partout. |

---

## 2. FONCTIONNALITÉS VENDEUR

| Fonctionnalité | État | Notes |
|----------------|------|-------|
| Inscription / Login | ✅ | JWT cookie, bcrypt, middleware `requireAuth` |
| Onboarding (étapes) | ✅ | `views/seller/onboarding.html` |
| Fiche bien complète | ⚠️ | Chips/toggles/steppers fonctionnels. **Champ `virtual_tour_url` ajouté au backend** (fix récent). Vérifier que tous les champs se sauvegardent |
| Sauvegarde fiche | ⚠️ | Lente sur réseau lent (round-trip normal). Cache `_sellerInfoCache` ajouté. **Tester sur mobile 4G.** |
| Galerie photos | ✅ | Upload Cloudinary, réorganisation drag, 20 photos max |
| Documents (3 dossiers) | ⚠️ | Restructuration effectuée (diagnostics/acheteur/notaire). À tester : upload dans chaque dossier + persistance affichage |
| Générateur annonce IA | ⚠️ | Prompt amélioré. **Nécessite `ANTHROPIC_API_KEY` sur Render.** Tester avec la clé configurée. |
| Coach IA | ⚠️ | **Nécessite `ANTHROPIC_API_KEY`.** SSE streaming. À tester en prod. |
| Agenda visites | ✅ | Créneaux disponibles, confirmation, rappels J-1 |
| Fiche publique acheteur | ✅ | `views/property/property-public.html` |
| Dossier acheteur sérieux | ✅ | SMS Twilio + email notification vendeur |
| Publications (portails) | ⚠️ | `views/seller/publications.html` — vérifier liens portails (LeBonCoin, SeLoger, etc.) |
| Offres reçues | ✅ | `views/seller/offers.html` + notification email |
| Performances / stats | ⚠️ | `views/seller/performances.html` — vérifier que les stats chargent |
| Formation / bibliothèque | ✅ | `views/seller/library.html` + `views/seller/biblio.html` |
| Contrat numérique | ✅ | Signature électronique, horodatage IP |
| Notifications | ⚠️ | `views/seller/notifications.html` — badge PWA via seller-nav.js |

---

## 3. FONCTIONNALITÉS ADMIN

| Section | État | Notes |
|---------|------|-------|
| Dashboard | ✅ | Stats en temps réel, alertes, revenus |
| CRM Vendeurs | ✅ | Vue liste + **vue pipeline Kanban** (ajouté), filtres rapides, alertes progression |
| Emails | ✅ | Catalogue 22 types, historique, envoi manuel — **page `/admin/emails` créée** |
| Photographes | ✅ | CRUD photographes, assignation missions |
| Missions | ✅ | Suivi missions photo, statuts |
| Numéros IA | ✅ | Gestion numéros 09 dédiés |
| Marketing | ✅ | Flyer, parrainage, partenaires, présentation |
| Documents légaux | ✅ | Contrats signés, relances |
| Finance | ✅ | Revenus, factures |
| Création vendeur | ✅ | POST `/admin/create-seller` protégé |
| Seed démo | ✅ | POST `/api/seed-demo` pour données de démonstration |
| Backup DB | ✅ | `/api/backup` + liste des backups |
| Rapport hebdo | ✅ | Email lundi 8h avec stats semaine |

---

## 4. SYSTÈME EMAIL

| Email | Trigger | État |
|-------|---------|------|
| Bienvenue | Création compte | ✅ Auto |
| Bienvenue v2 (amélioré) | Création compte | ✅ Prêt (manuel) |
| Relance prospect | J+48h inscrit non payé | ✅ Auto |
| Pas de bien créé | J+24h payé sans fiche | ✅ Auto |
| Photos manquantes | J+48h sans photos | ✅ Auto |
| Demande dispos photographe | J+3 payé sans photos | ✅ Auto |
| Documents manquants | J+7j sans diag | ✅ Auto |
| Fiche non publiée | J+72h non publié (score≥70) | ✅ Auto |
| Confirmation visite | Réservation validée | ✅ Auto |
| Rappel visite vendeur | J-1 visite | ✅ Auto (SMS aussi) |
| Nouvelle demande visite | Demande soumise | ✅ Auto |
| Notification contact acheteur | SMS dossier acheteur | ✅ Auto |
| Retour 1ère session visites (vendeur) | J+2 après 1ère visite | ✅ Auto |
| Retour visite (acheteur) | J+1 après visite | ⚠️ Manuel seulement |
| Check-in sans offre | J+14 publié sans offre | ✅ Auto |
| Renseignements manquants | Manuel admin | ✅ Manuel |
| Publication confirmée | Mise en ligne | ✅ Auto |
| Notification offre | Offre reçue | ✅ Auto |
| Renouvellement contrat | 30j avant expiration | ✅ Auto |
| Demande avis | Après vente | ✅ Manuel |
| Félicitations vendu | Vente confirmée | ⚠️ Manuel seulement |
| Mission assignée/confirmée | Attribution photo | ✅ Auto |
| Rapport admin hebdo | Lundi 8h | ✅ Auto |
| Email personnalisé admin | Manuel | ✅ Manuel |

---

## 5. INTÉGRATIONS TIERCES

| Service | État | À vérifier |
|---------|------|-----------|
| **Stripe** | ⚠️ | Webhooks `payment_intent.succeeded` en place. Tester en mode test avec Stripe CLI. Vérifier `STRIPE_WEBHOOK_SECRET` sur Render. |
| **SendGrid** | ⚠️ | Guard `if (!SENDGRID_API_KEY)` en place. Vérifier domaine d'expéditeur vérifié sur SendGrid. Tester un email en prod. |
| **Twilio** | ⚠️ | SMS + numéros dédiés. Vérifier que le numéro est actif. Tester SMS vendeur après visite. |
| **Cloudinary** | ⚠️ | Upload photos/docs. Vérifier `CLOUDINARY_URL`. Tester upload photo en prod → doit aller sur Cloudinary, PAS sur disque local. |
| **Anthropic** | ❌ | Clé non configurée en prod → IA désactivée. **Ajouter `ANTHROPIC_API_KEY` sur Render immédiatement.** |
| **Render** | 🔴 | Ephemeral filesystem → perte DB. Configurer Render Disk ou migrer PostgreSQL avant 1er client. |

---

## 6. AXES PRIORITAIRES AVANT LANCEMENT

### 🔴 BLOQUANTS (à faire avant tout client payant)

1. **Configurer Render Disk** pour persister `serenis.db` 🕐 < 1h
   - Render Dashboard > Disks > Ajouter un disque 1GB à `/data`
   - Modifier `DATABASE_URL=./data/serenis.db` en var d'env
   - Modifier `database.js` pour utiliser ce chemin

2. **Tester les uploads Cloudinary** end-to-end 🕐 < 1h
   - Uploader une photo → vérifier qu'elle apparaît sur cloudinary.com
   - Uploader un doc → idem
   - Si certains uploads vont encore dans `public/uploads/`, corriger

3. **Ajouter `ANTHROPIC_API_KEY` sur Render** 🕐 < 15min
   - Render Dashboard > Environment > + Add Variable
   - Tester générateur annonce + Coach IA

4. **Vérifier `JWT_SECRET` non vide en prod** 🕐 < 15min

5. **Test Stripe en mode live** 🕑 < 4h
   - Paiement pack Autonome 290€ + pack Sérénité 990€
   - Vérifier webhook reçu et `paid_at` mis à jour

### 🟡 IMPORTANTS (avant lancement marketing)

6. **Test end-to-end parcours vendeur** 🕑 < 4h
   - Créer compte → payer → fiche → photos → documents → publier → visite → offre
   - Utiliser les comptes de test (`node scripts/seed-test-sellers.js`)

7. **Test emails SendGrid** 🕐 < 1h
   - Email de bienvenue reçu
   - Email notification visite reçu
   - Vérifier pas dans les spams

8. **Test SMS Twilio** 🕐 < 30min
   - Dossier acheteur → SMS vendeur reçu

9. **Mobile responsive** 🕑 < 4h
   - Tester espace vendeur sur iPhone/Android
   - Tester agenda réservation visite

10. **Champs fiche bien** 🕐 < 1h
    - Vérifier que TOUS les champs se sauvegardent (notamment `virtual_tour_url`, `rooms_detail`)
    - Retourner sur la fiche → tous les champs doivent être pré-remplis

### 🟢 NICE TO HAVE (post-lancement)

11. Migrer SQLite → PostgreSQL 🕒 1-2 jours
12. Tests automatisés (jest + supertest) 🕒 2+ jours
13. Monitoring erreurs (Sentry) 🕐 < 1h
14. Backup quotidien automatique vérifié en prod 🕐 < 1h

---

## 7. PROMPTS PRÊTS POUR DEMAIN MATIN

### Prompt 1 — Configurer la persistance base de données sur Render
```
Dans l'app Serenis (/Users/brieuxmatthias/serenis-app), configure la persistance 
de la base SQLite sur Render en utilisant un Render Disk :

1. Modifie database.js pour utiliser le chemin depuis DATABASE_URL en priorité
   ou un chemin par défaut adapté au disque Render (/data/serenis.db)
2. Assure-toi que le répertoire /data est créé si inexistant au démarrage
3. Met à jour .env.example avec DATABASE_URL=/data/serenis.db

Ne pas push — laisser à l'utilisateur le soin de créer le disque Render 
(Dashboard > Disks > 1GB monté sur /data) puis de définir DATABASE_URL en var d'env.
```

### Prompt 2 — Test end-to-end complet espace vendeur
```
Dans l'app Serenis (/Users/brieuxmatthias/serenis-app), crée un script de test 
manuel scripts/test-checklist.md qui liste toutes les actions à tester manuellement 
pour valider le parcours vendeur complet :

Sections : Inscription → Paiement → Fiche bien (chaque champ) → Photos → 
Documents → Publication → Agenda → Visite → Offre → Contrat

Pour chaque étape : action, résultat attendu, case à cocher ✅/❌, 
et commande node pour vérifier en DB si besoin.
```

### Prompt 3 — Vérification et correction des uploads Cloudinary
```
Dans l'app Serenis (/Users/brieuxmatthias/serenis-app), audite tous les endpoints 
d'upload de fichiers dans routes/seller.js et routes/admin.js :

1. Identifie ceux qui sauvegardent sur le disque local (fs.writeFile, multer diskStorage)
2. Identifie ceux qui uploadent bien sur Cloudinary
3. Pour chaque upload disque local trouvé, migre-le vers Cloudinary (utilise le 
   pattern déjà en place dans le projet pour les photos)

L'objectif : zéro fichier sauvegardé dans public/uploads/ en production — 
tout doit aller sur Cloudinary.
```

### Prompt 4 — Page "Mon profil vendeur" complète
```
Dans l'app Serenis, la page profil vendeur (/seller/dashboard ou similaire) 
doit permettre de modifier : prénom, nom, téléphone, email, photo de profil.

Vérifie que :
1. Le formulaire de profil existe et est fonctionnel
2. Le changement de mot de passe fonctionne (avec vérification ancien mot de passe)
3. Les modifications sont bien sauvegardées en base
4. Un message de succès s'affiche après sauvegarde

Corrige ou complète ce qui manque dans views/seller/dashboard.html et routes/seller.js.
```

### Prompt 5 — Améliorer les emails transactionnels (HTML responsive)
```
Dans l'app Serenis (/Users/brieuxmatthias/serenis-app/services/email.js), 
les templates email sont en HTML inline. Améliore-les pour être 100% responsive 
sur mobile (Gmail, Apple Mail, Outlook) :

1. Ajoute un meta viewport dans chaque email
2. Remplace les grids CSS par des tables imbriquées pour compatibilité Outlook
3. Assure que les boutons font min 44px de hauteur sur mobile
4. Teste avec https://www.emailonacid.com ou similaire

Priorité : sendWelcomeEmail, sendVisitConfirmation, sendOfferNotification
```

### Prompt 6 — Dashboard vendeur : alertes et progression
```
Dans l'app Serenis, le dashboard vendeur (views/seller/dashboard.html) 
doit afficher une section "Prochaines étapes" claire en haut de page.

Ajoute un composant qui calcule et affiche :
- Score de complétude de la fiche (0-100%)
- Les 3 prochaines actions prioritaires avec bouton d'action direct
- Une barre de progression visuelle

Les données viennent de GET /api/property (déjà existant). 
Ne crée pas de nouvel endpoint.
```

### Prompt 7 — Tester et corriger le générateur IA
```
Dans l'app Serenis, teste le générateur d'annonce IA dans views/seller/property.html.

ANTHROPIC_API_KEY doit être configurée. Si ce n'est pas le cas en local, 
utilise une clé de test.

Vérifie :
1. Le bouton "Générer" appelle bien POST /api/property/generate-description
2. Le spinner s'affiche pendant la génération
3. Le texte généré s'affiche dans la zone éditable
4. Les boutons "Utiliser" et "Régénérer" fonctionnent
5. Le compteur de mots se met à jour

Corrige tout ce qui ne fonctionne pas.
```

### Prompt 8 — Système de notifications vendeur
```
Dans l'app Serenis, views/seller/notifications.html doit afficher 
toutes les notifications du vendeur (nouvelles visites, offres reçues, 
messages acheteurs, etc.).

Vérifie que :
1. La route GET /api/notifications existe dans routes/seller.js
2. Les notifications sont stockées en base (table notifications ou via email_log)
3. Le badge de notifications dans la nav (seller-nav.js) est mis à jour

Si la table notifications n'existe pas, crée-la dans database.js avec migration.
Ajoute les insertions aux bons endroits (nouvelle visite, offre reçue, etc.).
```

### Prompt 9 — Fiche publique acheteur : optimisation SEO et partage
```
Dans l'app Serenis, la fiche publique (views/property/property-public.html) 
doit être optimisée pour le partage et le SEO :

1. Ajoute les meta tags Open Graph (og:title, og:description, og:image) 
   avec les données du bien
2. Ajoute schema.org JSON-LD pour RealEstateListing
3. Vérifie que l'URL est propre (/bien/[slug] ou /annonce/[id])
4. Ajoute un bouton "Partager" avec génération de lien de partage

Les données sont chargées via l'API existante.
```

### Prompt 10 — Audit et correction des formulaires mobiles
```
Dans l'app Serenis, tester et corriger l'affichage mobile de :
1. views/seller/property.html (fiche bien) — formulaire très long
2. views/seller/agenda.html (agenda) — sélecteur de créneaux
3. views/seller/property.html (onglet photos) — upload photos

Pour chaque page :
- Identifier les éléments qui débordent ou sont inutilisables sur mobile (< 390px)
- Corriger avec CSS responsive (flexbox/grid + media queries)
- S'assurer que les inputs, selects et boutons sont >= 44px de hauteur

Tester en mode responsive de Chrome DevTools sur iPhone 14 Pro (390px).
```

---

## CHECKLIST FINALE PRÉ-LANCEMENT

```
☐ Render Disk configuré (SQLite persistant)
☐ ANTHROPIC_API_KEY ajoutée sur Render
☐ JWT_SECRET défini et non vide sur Render
☐ STRIPE_WEBHOOK_SECRET configuré
☐ Test paiement Stripe live (Autonome + Sérénité)
☐ Test email de bienvenue reçu
☐ Test SMS Twilio reçu
☐ Uploads photos → Cloudinary (PAS disque local)
☐ Uploads documents → Cloudinary (PAS disque local)
☐ Générateur IA fonctionnel
☐ Coach IA fonctionnel
☐ Fiche bien : tous les champs sauvegardés et repopulés
☐ Agenda : réservation → confirmation → rappel J-1
☐ Parcours complet vendeur testé (mobile + desktop)
☐ Domaine email SendGrid vérifié (pas de spam)
```
