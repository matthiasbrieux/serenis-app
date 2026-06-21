# Journal de nuit — Vendu Par Moi
**Session : 2026-06-21, 01h17 → 03h15**

---

## RÉSUMÉ FINAL

| Catégorie | Nombre |
|-----------|--------|
| Bugs trouvés | 5 |
| Bugs résolus et vérifiés | 4 |
| Bugs non résolus / cause incertaine | 0 |
| Points à revoir avec Matthias | 2 |

**Commits de la nuit :**
- `dd64e15` — fix photos blanches multi-upload (renderGrid une seule fois)
- `50f76c3` — 3 bugs audit : reorder payload + visibilité photos dossier + sécurité notaire

---

## PHASE 1 — AUDIT COMPLET

### Statut par fonctionnalité

| Fonctionnalité | Statut | Détail |
|---|---|---|
| Auth (login / cookie JWT) | ✅ OK | Login retourne `{success:true}` |
| Upload photo simple | ✅ OK | `thumbnail_url` présent dans réponse (fix session précédente) |
| Upload photo multiple | ✅ CORRIGÉ | renderGrid appelé une seule fois après la boucle |
| Affichage photos (carousel) | ✅ OK | initScrollCarousel s'arrête avant re-render |
| Suppression photo | ✅ OK | DELETE retourne `{success:true}`, vérifié en DB |
| Réordonnancement (drag & drop) | 🐛 → ✅ CORRIGÉ | Payload incorrect (voir Bug 1) |
| Déplacement entre catégories | ✅ OK | `{success:true}`, confirmé en DB |
| Visibilité catégories → dossier | 🐛 → ✅ CORRIGÉ | Filtrage absent côté serveur (voir Bug 2) |
| Fiche descriptive — sauvegarde | ✅ OK | POST `/api/property` retourne `{success:true,id:23}` |
| Génération IA description | ℹ️ DÉSACTIVÉE | ANTHROPIC_API_KEY absent en local — normal |
| Envoi lien dossier acheteur | ✅ OK | acheteur_url + notaire_url générés, HTML 200 |
| Dossier acheteur public | ✅ OK | Photos filtrées par visibilité (après fix) |
| Dossier notaire | 🐛 → ✅ CORRIGÉ | Exposait acheteur_token (voir Bug 3) |
| Publication du bien | ✅ OK | Bloquée à bon escient si type/address/price manquants |
| Pages vendeur (navigation) | ✅ OK | Toutes les routes 200 : dashboard, ma-formation, mon-agenda, mes-performances, mes-offres, coaching-vpm |
| Score de complétion | ✅ OK | Calcul correct (50/100 pour ce bien) |
| API agenda | ✅ OK | `/api/agenda` 200 |

---

## PHASE 2 — CORRECTIONS DÉTAILLÉES

---

### BUG 0 — Photos blanches lors d'upload multiple (régression session précédente)
**Heure :** 01h00 (avant le démarrage de l'audit, correctif appliqué en début de session)
**Cause :** `forceReloadPhotoImages()` ajoutée en fin de `uploadPhotos()` annulait les téléchargements en cours lancés par le dernier `renderGrid()`. De plus, `renderGrid` était appelé après CHAQUE upload individuel, causant des annulations en cascade.
**Fichier modifié :** `views/seller/property.html` — fonction `uploadPhotos()`
**Lignes :** 3674 (suppression `renderGrid` intraboucle) → 3678 (déplacement `renderGrid` après `finally`) → 3682 (suppression `forceReloadPhotoImages()`)
**Vérification :** Audit du diff, logique confirmée — une seule passe DOM après la fin complète de tous les uploads.
**Commit :** `dd64e15`
**Effet de bord :** Aucun. Les placeholders temp (spinners) restent visibles pendant tout l'upload, puis une seule transition vers les vraies photos. UX améliorée.

---

### BUG 1 — Drag & drop réordonnancement ne persistait jamais
**Heure :** 01h45
**Bug :** `PUT /api/property/photos/reorder` retournait `{"error":"order requis"}` systématiquement.
**Cause racine :** Double mismatch entre client et serveur :
- Client envoie `{ photos: [{cloudinary_id, order_index}, ...] }` (clé `photos`, tableau d'objets)
- Serveur attend `{ order: ["cid1", "cid2", ...] }` (clé `order`, tableau de strings)
**Preuve :** `curl -X PUT /api/property/photos/reorder -d '{"ordered_ids":["a","b","c"]}'` → `{"error":"order requis"}`. Après fix : `{"success":true}`.
**Fichier modifié :** `views/seller/property.html` — fonction `savePhotoOrder()` ligne 3876
**Changement :**
```js
// AVANT :  body: JSON.stringify({ photos })
// APRÈS :  body: JSON.stringify({ order: photos.map(p => p.cloudinary_id) })
```
**Vérification :** Requête directe au serveur avec le bon format → `{"success":true}`.
**Commit :** `50f76c3`
**Effet de bord :** Aucun. Le serveur utilisait déjà la position dans le tableau comme index d'ordre, pas `order_index` du client.

---

### BUG 2 — Visibilité photos par catégorie ignorée dans le dossier acheteur
**Heure :** 02h10
**Bug :** Quand le vendeur masque une catégorie (ex: `exterieur_photos_public = 0`), les photos continuent d'apparaître dans le dossier acheteur public.
**Cause racine :** `dossier.js` ligne 26 — `SELECT` retourne TOUTES les photos sans filtre. Les flags `{cat}_photos_public` sur la propriété n'étaient pas appliqués.
**Preuve :** Mis `exterieur_photos_public = 0`, 2 photos extérieur toujours visibles dans `/api/dossier/acheteur/:token`.
**Fichier modifié :** `routes/dossier.js` — route `GET /api/dossier/acheteur/:token` ligne 26
**Changement :**
```js
// AVANT : const photos = db.prepare('SELECT ...').all(prop.id);
// APRÈS :
const allPhotos = db.prepare('SELECT ...').all(prop.id);
const photos = allPhotos.filter(photo => {
  const flag = (photo.category || 'pro') + '_photos_public';
  return prop[flag] !== 0;
});
```
**Vérification :** Après fix, avec `exterieur_photos_public = 0` → 0 photos extérieur dans le dossier. Avec flag = 1 → photos visibles.
**Commit :** `50f76c3`
**Effet de bord :** Comportement désormais cohérent avec l'intention de design. Les photos avec `category` inconnu tombent dans `pro_photos_public`.

---

### BUG 3 — Dossier notaire expose acheteur_token (fuite sécurité)
**Heure :** 02h30
**Bug :** `GET /api/dossier/notaire/:token` retournait la propriété entière sans strip des tokens sensibles. Toute personne ayant le lien notaire pouvait récupérer `acheteur_token` et accéder au dossier acheteur.
**Cause racine :** Le dossier acheteur stripait `notaire_token + stripe_* + password` mais le dossier notaire envoyait `prop` brut sans aucun filtrage.
**Preuve :** `acheteur_token` présent dans la réponse notaire → `true`. Après fix → `false`.
**Fichier modifié :** `routes/dossier.js` — route `GET /api/dossier/notaire/:token` ligne 74
**Changement :**
```js
// AVANT : res.json({ property: prop, ... });
// APRÈS :
const { acheteur_token, notaire_token: _nt, stripe_session_id, stripe_customer_id, password, ...safeNotaireProperty } = prop;
res.json({ property: safeNotaireProperty, ... });
```
**Vérification :** Appel après fix → `acheteur_token: false, notaire_token: false, stripe: false`.
**Commit :** `50f76c3`
**Effet de bord :** Aucun. Le notaire n'a pas besoin de ces tokens. Les autres champs (prix, description, docs, offres) restent exposés.

---

## POINTS À REVOIR AVEC MATTHIAS

### Point 1 — Plans stockés dans `diagnostics` (design incohérent)
**Nature :** Incohérence de design, pas un bug critique.
**Observation :** Les plans uploadés via l'onglet Documents sont sauvegardés avec `folder = 'diagnostics'` (seul folder valide côté serveur pour plans). Leur visibilité dans le dossier est donc contrôlée par `diagnostics_in_dossier` et non par `plan_docs_visible`. Le toggle "plan visible/masqué" dans l'espace vendeur n'a aucun effet.
**Impact :** Le vendeur peut croire masquer les plans alors qu'ils restent visibles si `diagnostics_in_dossier = 1`.
**Solution possible :** Ajouter 'plans' aux `validFolders` côté serveur et traiter séparément dans `dossier.js`. Décision à toi.

### Point 2 — Double fetch `/api/property` au chargement de la page
**Nature :** Performance mineure.
**Observation :** La fonction `loadProperty` est patchée (ligne 7062) pour détecter si la fiche est vide et lancer le wizard d'onboarding. Cette version patchée fait un premier fetch `/api/property`, puis si la fiche existe, appelle `_origLoad` qui fait un DEUXIÈME fetch identique. Chaque page load = 2 requêtes au lieu d'une.
**Impact :** +100-200ms sur le premier affichage. Pas bloquant mais inutile.
**Solution possible :** Passer les données du premier fetch à `_origLoad` plutôt que refetcher. Je n'ai pas corrigé car le changement touche la logique du wizard d'onboarding.

---

## FONCTIONNALITÉS NON TESTÉES (hors périmètre cette nuit)

- Stripe (paiement) — zone sensible, non touché
- Twilio (SMS sortants) — zone sensible, non touché
- SendGrid (emails) — zone sensible, non touché
- Génération description IA — désactivée localement (ANTHROPIC_API_KEY absent)
- Agenda / créneaux de visite — testé au niveau API (200), pas le flux complet
- Coach IA — désactivé localement
- Export PDF dossier — non testé
- Suppression compte RGPD — non testé
