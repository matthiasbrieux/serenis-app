# Serenis — Recommandations finales

## État de la fiche bien (property.html)

### Sections implémentées
- Type de bien (Maison / Appartement / Terrain) + Mitoyenneté
- Localisation avec notice de confidentialité adresse
- Surfaces (habitable, terrain, hauteur plafond) + aide cadastre
- Pièces par niveau (tableau style Laforêt, étages progressifs)
- Année de construction (slider + badge DPE/isolation)
- Chauffage (30+ chips multi-select) + Mécanisme diffusion + upload factures
- Cheminée (multi-select) + upload facture/ramonage
- Production d'eau chaude (multi-select)
- WC (compteur 1–5+)
- Cuisine (type multi-select)
- Assainissement (type + toggle certificat + upload)
- DPE (barres colorées officielles A→G + champs conso/GES/coûts annuels)
- Taxe foncière + upload
- Factures énergie privées (eau/électricité/gaz €/mois — jamais transmis)
- Toiture (19 options)
- Grenier (toggle + état isolé/aménageable)
- Fenêtres (15 options)
- Volets (14 options)
- Sols / Dalle
- Stationnement + détail garage (motorisé, sol, surface)
- Extérieur (jardin + détail terrasse avec surface/revêtement)
- Exposition + coach tip
- Proximité (commerces, écoles, autoroute, gare)
- Équipements (tuile-grid cliquable + champ libre)
- Raison de vente + coach tip
- Description libre + génération IA + mise en situation

### Onglet Photos
- Visite virtuelle (URL → fiche acheteur)
- Guide par catégorie (Découverte / Détaillées / Professionnelles / Points forts)
- Upload drag & drop + grille avec badge "Principale"
- Compteur + conseils d'ordre

### Onglet Documents
- **Section Acheteurs** : DPE, Amiante, Plomb, Électricité, Gaz, Assainissement, ERP, Ramonage — intégrés dans la fiche
- **Section Confidentiels** : Titre, Taxe, Compromis, Acte notarié, Identité — jamais transmis
- Checklist diagnostics obligatoires avec indicateurs verts

### Onglet Fiche acheteur
- Génération HTML complète avec toutes les caractéristiques
- Lien visite virtuelle intégré si renseigné
- Impression / PDF
- Contact vendeur auto-rempli

---

## Recommandations techniques prioritaires

### 1. Sécurité — Validation côté serveur
Les champs `facture_eau`, `facture_electricite`, `facture_gaz`, `dpe_conso_energie` etc. sont stockés mais **ne doivent jamais apparaître dans les routes publiques** (`/bien/:slug`). Vérifier que la route publique filtre ces champs :
```js
// routes/public.js — s'assurer que ces colonnes sont exclues du SELECT
const PRIVATE_FIELDS = ['facture_eau','facture_electricite','facture_gaz','sale_reason'];
```

### 2. Slug unique et URL propre
Le slug est généré à la création : `uuid-court + ville`. Si le vendeur change de ville, le slug ne se met pas à jour. À terme, ajouter une route de re-génération du slug ou accepter l'immuabilité.

### 3. Génération IA (description)
La route `/api/property/generate-description` doit inclure les nouveaux champs dans le prompt :
- `cheminee_type`, `eau_chaude_type`, `wc_count`, `cuisine_type`, `grenier`
- `fenetres_type`, `volets_type`, `toiture_couverture`
Ces informations enrichissent considérablement la description générée.

### 4. Fiche acheteur — Confidentialité adresse
L'adresse exacte est visible dans la fiche HTML générée côté client. Pour les envois par SMS/email, s'assurer que la route de génération PDF côté serveur masque le numéro de rue (garder seulement ville + CP).

### 5. Performance photos
Les photos sont actuellement affichées sans lazy-loading natif sur les thumbnails Cloudinary. Utiliser les transformations Cloudinary (`w_400,c_fill,q_auto`) pour les miniatures :
```js
const thumbUrl = url.replace('/upload/', '/upload/w_400,c_fill,q_auto/');
```

---

## Recommandations UX à court terme

### Ordre de remplissage guidé
Ajouter une logique qui, à l'ouverture, amène l'utilisateur au premier champ vide obligatoire plutôt que de démarrer en haut. Un bouton "Continuer où j'en étais →" basé sur le draft localStorage.

### Indicateur de complétion par section
La barre de complétion globale est bonne. Ajouter un petit badge rouge/vert par section dans le formulaire (ex : "✓ Chauffage" ou "! DPE manquant") pour guider visuellement.

### Sauvegarde serveur automatique
Le draft est actuellement en localStorage uniquement. Si l'utilisateur change d'appareil, il perd tout. Déclencher une sauvegarde serveur silencieuse toutes les 2 minutes si des modifications sont détectées.

### Photos — Catégorisation réelle
Si souhaité à terme : ajouter une colonne `category TEXT` dans `property_photos` + une UI de tri par catégorie dans la grille. Non prioritaire mais améliore la présentation.

---

## Base de données — Colonnes ajoutées (migrations)

Toutes ces colonnes ont été ajoutées via `ALTER TABLE ... ADD COLUMN` dans `database.js` :

| Colonne | Type | Description |
|---|---|---|
| `heating_mechanism` | TEXT | Mécanisme diffusion chauffage |
| `hauteur_plafond` | REAL | Hauteur sous plafond (m) |
| `assainissement_type` | TEXT | Type assainissement |
| `certificat_assainissement` | BOOLEAN | Certificat de conformité |
| `toiture_couverture` | TEXT | Type(s) couverture toiture |
| `volets_type` | TEXT | Type(s) volets |
| `sols_dalle` | TEXT | Type dalle/plancher |
| `stationnement_type` | TEXT | Type(s) stationnement |
| `mitoyennete` | TEXT | Mitoyenneté maison |
| `heating_details` | TEXT | JSON années par système chauffage |
| `garage_motorise` | TEXT | Porte garage (motorisée/manuelle) |
| `garage_sol` | TEXT | Sol du garage |
| `garage_surface` | REAL | Surface garage (m²) |
| `terrace_revetement` | TEXT | Revêtement terrasse |
| `terrace_surface` | REAL | Surface terrasse (m²) |
| `fenetres_type` | TEXT | Type(s) menuiseries |
| `cheminee_type` | TEXT | Type(s) cheminée |
| `eau_chaude_type` | TEXT | Production eau chaude |
| `wc_count` | INTEGER | Nombre de WC |
| `cuisine_type` | TEXT | Type(s) cuisine |
| `grenier` | TEXT | État grenier (isolé/aménageable…) |
| `grenier_present` | BOOLEAN | Présence grenier |
| `dpe_conso_energie` | REAL | Consommation énergie kWh/m²/an |
| `dpe_ges` | REAL | GES kg CO₂/m²/an |
| `dpe_cout_min` | INTEGER | Coût énergétique estimé min €/an |
| `dpe_cout_max` | INTEGER | Coût énergétique estimé max €/an |
| `facture_eau` | INTEGER | Facture eau €/mois (privé) |
| `facture_electricite` | INTEGER | Facture électricité €/mois (privé) |
| `facture_gaz` | INTEGER | Facture gaz €/mois (privé) |
