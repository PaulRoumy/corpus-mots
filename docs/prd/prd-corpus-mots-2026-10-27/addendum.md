---
title: "Addendum au PRD : corpus-mots"
created: 2026-10-27
updated: 2026-10-27
---

# Addendum au PRD : corpus-mots

Éléments utiles en aval (architecture, UX) ou trop détaillés pour le PRD. Complète l'addendum du brief (`docs/briefs/brief-corpus-mots-2026-10-25/addendum.md`), sans le répéter.

## Recherche complémentaire (2026-10-27)

Légende : **[F]** fait sourcé, **[I]** inférence. Sources à vérifier avant toute citation officielle.

### Cadre institutionnel
- **[F]** Programme « langage oral et écrit » du cycle 1 (BO du 31/10/2024, applicable à la rentrée 2025) : le vocabulaire y est prioritaire. Il vise au moins 2 500 mots en fin de GS, avec un enseignement « explicite, progressif et structuré » dès la PS, et des repères par âge (avant 4 ans, dès 4 ans, dès 5 ans). https://eduscol.education.gouv.fr/4698/le-developpement-et-la-structuration-du-langage-oral-et-ecrit-au-cycle-1
- **[F, à vérifier]** Un nouveau programme complet du cycle 1 serait paru au BO n°19 du 7 mai 2026, applicable à la rentrée 2026 ; la page académique qui l'annonce renvoie une erreur 404. https://sites.ac-nancy-metz.fr/maternelle57/?p=3461
- **[F]** Guide Eduscol « Pour enseigner le vocabulaire à l'école maternelle » (juin 2021) : il recommande des activités régulières de catégorisation, de mémorisation et de réutilisation.
- **[F]** Ressource DGESCO 2010 (Boisseau) : classement par nature de mot, avec des repères d'environ 750 mots en PS, 1 500 en MS et 2 500 en GS. https://pedagogie.ac-nantes.fr/medias/fichier/2010__vocabulaire_comment_le_travailler_en_maternelle_men_dgesco_1285056052417.pdf
- **[I]** Garder le genre ou l'article du Mot dans les données, même si les cartes s'impriment souvent sans article.

### Hébergement et doctrine
- **[F]** Il existe une « Doctrine technique du numérique pour l'éducation » (versions 2023 à 2025), avec un cadre général de sécurité. https://www.education.gouv.fr/sites/default/files/2025-09/doctrine-technique-du-num-rique-pour-l-ducation---cadre-g-n-ral-de-s-curit-des-services-num-riques-pour-l-ducation-439548.pdf
- **[F]** Le ministère recommande les logiciels libres ou ministériels, hébergés dans l'UE.
- **[I]** Une intégration au GAR relève d'une démarche d'éditeur et dépasse ce que peut porter un pilote. Viser plutôt un hébergement dans l'UE et un code libre, qui laisse ouverte une piste vers apps.education.fr.
- **[I]** Un outil réservé aux enseignants, sans aucune donnée d'élève et avec un minimum de données de compte, réduit fortement la charge RGPD, ce qui constitue un argument d'adoption.

### Licences d'images complémentaires
- **[F]** Sclera : CC BY-NC (attribution, pas d'usage commercial). https://www.sclera.be/en/picto/copyright
- **[F]** Mulberry : CC BY-SA. https://www.opensymbols.org/repositories/mulberry
- **[I]** Les mentions d'attribution doivent figurer automatiquement sur les exports Word et PowerPoint. Les licences NC supposent que l'outil reste gratuit.

### Comparables
- **[F]** PictoFacile : outil gratuit qui transforme une phrase en pictogrammes ARASAAC ; aucune fonction de partage entre collègues n'est connue. Lectimage et des kits payants (par exemple 572 mots en 9 thèmes) proposent des imagiers figés.
- **[F]** Aucun générateur « mots d'un album » doté d'une banque partagée à l'échelle d'une école n'a été trouvé.

## Éléments qualitatifs du brainstorming

- Personas de la séance : Claire (collègue, « partage, avec prudence »), Nadia (ATSEM, « le papier est son interface »), Léo (élève), Sophie (parent, V2).
- Risque : avec l'Import, Claire perd ses repères si ses contenus se mélangent à ceux des autres. Le sentiment que « c'est mon travail » doit survivre au partage.
- Écarté : prendre les photos en classe devant les enfants, scénario jugé irréaliste.
- Principe : « la cohérence aide les enfants », donc réutiliser la même image d'un album à l'autre.

## Précisions de mise en œuvre pour l'architecture et l'UX (2026-10-27)

Tenues volontairement hors du PRD lors de sa rédaction.

- **[I] ARASAAC :** l'API publique d'ARASAAC permet de rechercher des pictogrammes par mot-clé en français et de récupérer les images. À vérifier : les conditions d'usage de l'API et le choix entre stocker une copie de l'image ou un simple lien.
- **[I] Import :** dans un .docx, associer chaque image au texte du paragraphe ou de la cellule de tableau voisin. Dans un .pptx, associer chaque image aux zones de texte de la même diapositive. Les imagiers maison sont souvent des tableaux A4 en 4 cases, image et mot en capitales.
- **[I] Détection :** normaliser la casse, les accents et les articles (le, la, l', les, un, une, des) avant la comparaison. Une recherche approchée (fautes de frappe) serait un plus.
- **[I] Réutilisation par lien :** une Préparation référence l'identifiant de l'Image. Le retrait de la Banque de l'école est un changement de visibilité, pas une suppression.
- **[I] Exports :** des bibliothèques de génération .docx et .pptx sont disponibles. La police cursive doit être intégrée ou installée chez l'utilisateur ; une police non intégrée s'affiche mal sur un autre poste.
- **[I] Mobile :** une application web progressive (PWA) installable sur l'écran d'accueil rendrait l'ajout en trois gestes plus direct, sans passer par un magasin d'applications.
