# GUIDE SAV — Serenis

Matthias Brieux — 06 95 44 36 54 — Douai (59)

Ce guide vous permet de gérer seul les situations courantes sans toucher au code.

---

## 1. AJOUTER UN CLIENT MANUELLEMENT

**Situation** : un client a payé par virement, en espèces, ou son paiement Stripe a échoué.

**Méthode** :
1. Allez sur `https://serenis-app.onrender.com/admin`
2. Entrez votre email et mot de passe admin
3. Cliquez sur **+ Ajouter un client**
4. Remplissez : prénom, nom, email, téléphone, pack
5. Cliquez **Créer le compte**
6. Un mot de passe temporaire s'affiche → **notez-le** et communiquez-le au client
7. Le client reçoit aussi un email automatique avec ses accès

---

## 2. RÉINITIALISER UN MOT DE PASSE

**Situation** : un client a oublié son mot de passe.

**Méthode** :
1. Allez sur `/admin`
2. Trouvez le client dans la liste (cherchez par email)
3. Cliquez sur **MDP** à droite de son nom
4. Cliquez **Générer un nouveau mot de passe**
5. Communiquez le nouveau mot de passe temporaire au client par SMS ou téléphone
6. Dites-lui de le changer dès la première connexion dans "Mon profil"

---

## 3. VOIR LES LOGS EN CAS DE PROBLÈME

**Sur Render.com** :
1. Connectez-vous sur [render.com](https://render.com)
2. Cliquez sur votre service **serenis-app**
3. Onglet **Logs** → vous voyez tout en temps réel

**Codes d'erreur courants** :
- `STRIPE_SECRET_KEY missing` → vérifiez les variables d'environnement sur Render
- `TWILIO error 20003` → token Twilio expiré → régénérez sur console.twilio.com
- `SendGrid 403` → clé API expirée → régénérez sur app.sendgrid.com
- `SQLITE_FULL` → base de données pleine → passez au plan payant Render ou nettoyez

---

## 4. METTRE À JOUR LES TEXTES DU SITE

**Pour des changements simples (textes, prix, FAQ)** :

**Via GitHub** :
1. Allez sur `github.com/matthiasbrieux/serenis-app`
2. Cliquez sur le fichier à modifier (ex: `public/index.html`)
3. Cliquez le crayon ✏️ en haut à droite
4. Modifiez le texte
5. Cliquez **Commit changes**
6. Render redéploie automatiquement en 2-3 minutes

**Changements fréquents et où les trouver** :
- Prix des offres → `public/index.html` (cherchez "99" et "999")
- FAQ → `public/index.html` (cherchez `faq-item`)
- Mails types → `views/seller/library.html` (cherchez `const MAILS`)
- Checklists → `views/seller/library.html` (cherchez `CHECKLIST_PHOTOS`)
- Mentions légales → présentes dans le footer de chaque fichier HTML

---

## 5. CONTACTS SUPPORT

### Stripe (paiements)
- Site : [dashboard.stripe.com](https://dashboard.stripe.com)
- Support : [stripe.com/support](https://stripe.com/support)
- Problème courant : vérifier le webhook sur `stripe.com → Développeurs → Webhooks`
- URL webhook : `https://serenis-app.onrender.com/webhook/stripe`

### Twilio (SMS et appels)
- Site : [console.twilio.com](https://console.twilio.com)
- Support : [twilio.com/help](https://www.twilio.com/help)
- Régénérer token : Account → API Keys & Tokens
- Webhooks SMS : `https://serenis-app.onrender.com/webhook/sms`
- Webhooks Voice : `https://serenis-app.onrender.com/webhook/voice`

### SendGrid (emails)
- Site : [app.sendgrid.com](https://app.sendgrid.com)
- Régénérer clé API : Settings → API Keys
- Vérifier si emails bien envoyés : Activity → Email Activity Feed
- **Important** : le domaine `serenis.fr` doit être vérifié dans Sender Authentication

### Render (hébergement)
- Site : [render.com](https://render.com)
- Dashboard : voir logs, redémarrer le service, modifier les variables d'env
- Si le site est lent au premier appel : c'est normal (plan gratuit = mise en veille après 15 min d'inactivité)
- Pour éviter la mise en veille : passez au plan Starter ($7/mois) ou utilisez un service de ping comme UptimeRobot

### Cloudinary (photos)
- Site : [cloudinary.com](https://cloudinary.com)
- Dashboard : voir les photos uploadées, leur espace utilisé
- Plan gratuit : 25 Go de stockage

---

## 6. VARIABLES D'ENVIRONNEMENT SUR RENDER

Pour modifier une variable :
1. Render.com → Service serenis-app → **Environment**
2. Cliquez **Edit** à côté de la variable
3. Sauvegardez → le service redémarre automatiquement

Variables importantes :
| Clé | Description |
|-----|-------------|
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (commence par `sk_live_`) |
| `STRIPE_WEBHOOK_SECRET` | Secret du webhook Stripe (commence par `whsec_`) |
| `STRIPE_PRICE_AUTONOME` | ID du prix Stripe pour le Pack Autonome (`price_xxx`) |
| `STRIPE_PRICE_SERENITE` | ID du prix Stripe pour le Pack Sérénité (`price_xxx`) |
| `TWILIO_AUTH_TOKEN` | Token Twilio (à régénérer si expiré) |
| `SENDGRID_API_KEY` | Clé API SendGrid |
| `ADMIN_PASSWORD` | Votre mot de passe admin |
| `JWT_SECRET` | Clé de sécurité (ne jamais changer en production) |

---

## 7. PROCÉDURE EN CAS DE PANNE TOTALE

1. Vérifiez les logs sur Render → y a-t-il une erreur évidente ?
2. Essayez de redémarrer le service : Render → **Manual Deploy** → **Deploy latest commit**
3. Vérifiez que les variables d'environnement sont toutes remplies
4. Si la base de données est corrompue → contactez un développeur

---

## 8. CHECKLIST MISE EN PRODUCTION (première fois)

- [ ] Stripe : créer 2 produits, copier les price IDs dans Render
- [ ] Stripe : créer le webhook `BASE_URL/webhook/stripe` (événement: checkout.session.completed)
- [ ] Twilio : régénérer le token, copier dans Render
- [ ] Twilio : configurer webhook SMS `BASE_URL/webhook/sms` sur les numéros achetés
- [ ] Twilio : configurer webhook Voice `BASE_URL/webhook/voice`
- [ ] SendGrid : vérifier le domaine serenis.fr, créer une clé API
- [ ] Cloudinary : copier la CLOUDINARY_URL dans Render
- [ ] Render : remplir toutes les variables d'environnement
- [ ] Tester : paiement test Stripe → réception email → connexion dashboard
- [ ] Tester : remplir fiche bien → uploader photo → publier → voir page publique

---

*Guide rédigé pour Serenis — Matthias Brieux — Douai (59)*
*Serenis est une plateforme numérique d'outils et de formation.*
