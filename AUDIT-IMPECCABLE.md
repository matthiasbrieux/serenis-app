# AUDIT-IMPECCABLE — Vendu Par Moi
*Diagnostic UX/interface — septembre 2026. Pas de corrections à ce stade.*

---

## A. SITE VITRINE — Persuader

### A1. Contradiction de prix en hero — impact conversion immédiat
Le sous-titre du hero annonce « 999 € TTC » alors que deux packs existent (Autonome 499 € / Coaching Plus 999 €). Un visiteur qui voit 999 € avant de comprendre qu'il existe une offre à 499 € perçoit un prix plancher deux fois plus élevé que la réalité. Perte probable sur les visiteurs sensibles au prix qui rebondissent avant d'atteindre la page tarifs.
- **Impact business :** fort — friction de conversion dès le premier écran
- **Effort :** faible — modifier 1 ligne de sous-titre, pointer vers les tarifs

### A2. Incohérence des chiffres d'économies sur 4 surfaces
Quatre valeurs différentes pour la même promesse : meta description = 10 000 €, balise OG = 12 000 €, barre de stats = 9 800 €, bande CTA = 5 000–15 000 €. Un acheteur attentif (ou un journaliste) y verra une crédibilité entamée ; un moteur de recherche indexera des données contradictoires.
- **Impact business :** moyen — crédibilité marque + SEO/OG partage social
- **Effort :** faible — aligner sur une seule valeur vérifiable dans 4 endroits

### A3. Erreur de syntaxe JSON-LD dans tarifs.html (rich results cassés)
Lignes 405 et 421 de `tarifs.html` : `"brand", "name"` au lieu de `"brand": {"name"`. Google ne peut pas parser le structured data → zéro rich result (étoiles, prix) dans les SERPs pour la page la plus stratégique du site.
- **Impact business :** fort — rich results = +15–30 % de CTR organique estimé sur requêtes transactionnelles
- **Effort :** faible — corriger 2 lignes de JSON

---

## B. ESPACE VENDEUR — Opérer

### B1. Progression formation et coaching stockée uniquement en localStorage
La progression des modules (`library.html`, `coaching-vpm.html`) n'est jamais persistée en base. Vider le cache, changer d'appareil ou passer en navigation privée remet tout à zéro. Pour un produit dont la valeur principale est la formation pas-à-pas, c'est un risque de désabonnement silencieux : le vendeur recommence depuis le début, perd confiance, abandonne.
- **Impact business :** très fort — rétention et complétion de la formation = cœur de valeur du pack
- **Effort :** élevé — route API + colonnes DB + sync au chargement de page

### B2. Texte de titre invisible dans offers.html (opacité 12 %)
La propriété CSS `.invite-hdr-title` porte `color: rgba(158,58,24,0.12)`. Le titre de section est techniquement présent mais visuellement inexistant. Un vendeur qui reçoit une offre ne voit pas le contexte de la section.
- **Impact business :** moyen — confusion sur la page la plus sensible du parcours (réception d'offre)
- **Effort :** faible — corriger 1 valeur CSS

### B3. Suppression d'offre sans confirmation ni annulation possible
Dans `offers.html`, le bouton de suppression d'offre déclenche la suppression immédiate, sans modale de confirmation et sans possibilité d'annuler. Une offre effacée par erreur est une perte irréversible d'une donnée critique (montant, conditions, coordonnées acheteur).
- **Impact business :** fort — risque légal et opérationnel (traçabilité offres)
- **Effort :** faible — ajouter une modale de confirmation avant appel DELETE

---

## C. FORMATION — Lire et progresser

### C1. Progression localStorage (même problème que B1, périmètre formation)
Identique à B1 mais pour `library.html` : chapitres cochés, quiz répondus, score de progression — tout est en localStorage. La formation est le livrable principal du produit ; sa fragilité technique est le problème le plus grave cross-périmètre.
- **Impact business :** très fort — complétion = satisfaction = renouvellement / recommandation
- **Effort :** élevé — même effort que B1 (partagé)

### C2. Fiche-fondateurs.html — données personnelles exposées sans authentification
Le fichier `fiche-fondateurs.html` est accessible à une URL publique prévisible et contient (selon l'audit) adresses domicile, dates de naissance, numéros de téléphone des fondateurs, nom du dépôt GitHub et informations d'infrastructure Render. Absence d'authentification = exposition totale à tout visiteur ou robot.
- **Impact business :** critique — RGPD (données personnelles sensibles), sécurité, réputation
- **Effort :** faible — passer la route derrière `requireAdmin` ou supprimer le fichier

### C3. Cible tactile des points de carousel trop petite (6 px < 44 px WCAG)
Les dots de navigation dans `library.html` mesurent 6 px. WCAG 2.1 SC 2.5.5 exige 44×44 px. Sur mobile, les vendeurs ratent systématiquement la cible et naviguent dans le mauvais sens ou abandonnent.
- **Impact business :** moyen — abandon formation sur mobile (supposé >40 % du trafic)
- **Effort :** faible — padding CSS autour des dots, sans modifier le visuel

---

## Top 5 cross-périmètres (impact × effort)

| # | Problème | Périmètre | Impact | Effort | Priorité |
|---|----------|-----------|--------|--------|----------|
| 1 | **fiche-fondateurs.html non protégée** (RGPD + sécurité) | C | Critique | Faible | **Sprint 1 — aujourd'hui** |
| 2 | **JSON-LD cassé tarifs.html** (rich results perdus) | A | Fort | Faible | **Sprint 1** |
| 3 | **Progression formation en localStorage uniquement** (rétention) | B + C | Très fort | Élevé | **Sprint 2 — priorité technique** |
| 4 | **Contradiction de prix en hero** (conversion) | A | Fort | Faible | **Sprint 1** |
| 5 | **Suppression d'offre sans confirmation** (risque légal) | B | Fort | Faible | **Sprint 1** |

> **Lecture :** les items Faible/Fort ou Critique occupent la totalité de Sprint 1 (une session de travail). Le seul item Élevé (localStorage → DB) est isolé en Sprint 2 pour ne pas bloquer les gains rapides.
