---
title: Intention du brainstorming — application de vocabulaire en maternelle
source: .memlog.md (séance de brainstorming, 2026-10-25)
goal: Lancer un produit
status: complete
---

# Intention du brainstorming — application de vocabulaire en maternelle

## Problème & utilisateur
- **Utilisateur :** enseignants de maternelle (3–6 ans ; sections PS/MS/GS). Paul, porteur du produit, est lui-même enseignant ; le besoin vient de sa pratique d'étude d'albums jeunesse.
- **Job :** repérer le vocabulaire nécessaire à la compréhension d'un album, illustrer chaque mot, puis réutiliser ces associations mot-image toute l'année pour la projection, les cartes imprimées et les fiches d'activité.
- **Outils actuels :** Word et PowerPoint.
- **Douleurs :**
  1. Ne pas savoir si un mot existe déjà dans un autre album, d'où une perte de temps à vérifier.
  2. Temps perdu à chercher une illustration adaptée au contexte de l'album et à l'âge de l'enfant.
- **Principe :** saisir une fois, réutiliser partout. Réutiliser la même image pour un mot d'un album à l'autre (cohérence).

## Cœur de la V1 : les 3 priorités (une seule chaîne : banque → équipe → sorties imprimées)
1. **Banque mot-image centralisée anti-doublons** (cœur du produit)
   - À la saisie d'un mot : alerte immédiate s'il existe déjà, avec la liste des albums où il apparaît.
   - Affiche toutes les images déjà utilisées pour ce mot (les miennes et celles des collègues) pour pouvoir en réutiliser une.
   - Une nouvelle image peut être ajoutée ; elle coexiste avec les précédentes.
   - Les images se filtrent par sens, section et album.
2. **Partage au sein de l'école**
   - Deux espaces séparés : un onglet « Mes mots » (personnel) et un onglet « Banque de l'école » (partagé).
   - Partage volontaire : c'est l'enseignant qui choisit les mots à partager vers la banque de l'école.
   - Pas d'écrasement : plusieurs images d'un même mot coexistent.
   - Seuls les enseignants inscrits peuvent ajouter du contenu. Un rôle administrateur peut supprimer des éléments ou des utilisateurs (modération).
   - Le partage n'est adopté que s'il est sûr : personne ne peut casser ni polluer le travail d'un autre enseignant.
3. **Génération de fiches imprimées**
   - Fiches d'activité créées à partir des associations mot-image.
   - Fiches thématiques (ex : l'automne) regroupant tous les mots d'un thème, tous albums confondus.
   - Tri des mots par catégorie grammaticale (nom, verbe, adjectif…).
   - Fiches imprimées en un clic (images + mots) pour l'ATSEM, qui anime des ateliers de vocabulaire en petits groupes.

## Modèle de données : la « carte d'identité » de l'image
Chaque image porte :
- mot
- sens : la polysémie implique qu'un mot peut avoir plusieurs images (ex : « étalé » = après une chute vs en cuisine)
- section visée : PS / MS / GS
- album d'origine
- module
- thème
- catégorie grammaticale

Cette carte rend possibles les trois priorités : détection de doublons, coexistence des images partagées et filtrage pour les fiches.

**Progression par âge (par mot) :** en PS, l'image tirée de l'album (concrète, contextualisée). En GS, plusieurs exemples variés ou une représentation plus abstraite, ex : une planche de plusieurs exemples pour catégoriser.

## Organisation
- **Album > modules :** un module est un découpage pédagogique d'un album, comme un chapitre, défini collectivement par l'équipe enseignante et partagé à l'école.
- **Thèmes :** catégories transversales (l'automne, la cuisine, les émotions) qui relient des mots de plusieurs albums.

## Leviers clés
- **Import des fichiers Word/PowerPoint existants** (mots + images). C'est le déclencheur de bascule des collègues, et cela évite que la banque partagée démarre à vide.
- **Flux de saisie rapide :** taper les mots, le nom de l'album, le module et le thème.
- **Suggestions d'images :** l'appli propose des images pour chaque mot saisi, et propose des mots déjà associés à des images.
- **Ajout photo sur mobile :** l'appli doit être utilisable sur téléphone. Ajout en 3 gestes : prendre la photo, taper le mot, cocher les sections. Les photos sont prises hors de la classe, pas devant les enfants.
- **Projection** des images en classe.

## Qualité & sources des images
- **Critères :** simple, claire, peu de détails.
- **Sources :** images libres de droits sur internet et photos prises par l'enseignant.

## Contraintes
- Seuls les enseignants utilisent l'appli. ATSEM, parents et enfants n'y ont pas accès ; ils reçoivent seulement ce que l'enseignant imprime ou envoie.
- Non commercial : pas de modèle de revenus, pas de pub.
- Simple à utiliser, peu de texte, images faciles à imprimer.
- Périmètre de lancement : d'abord l'école de Paul, extension éventuelle ensuite.

## Reporté en V2 (déjà compatible avec le modèle de données)
- Message hebdomadaire aux parents le vendredi (pour le week-end) : court, vidéo qui se lance en un clic sans compte ni installation, fréquence limitée pour éviter l'abandon des parents.
- Vidéos courtes (<30 s) pour les verbes d'action et les mots de mouvement, pour soutenir le mime et le visionnage répété.
- Extension à d'autres écoles.

## Questions ouvertes
- Droits d'auteur : peut-on utiliser les illustrations d'albums (souhaitées en PS) dans une banque partagée avec l'école, puis avec les parents ?
- Qui administre l'instance de l'école ?
