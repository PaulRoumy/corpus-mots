---
title: "Addendum : application de vocabulaire en maternelle"
created: 2026-10-25
updated: 2026-10-25
---

# Addendum : application de vocabulaire en maternelle

Éléments utiles pour la suite (PRD, architecture), trop détaillés pour le brief.

## Recherche de contexte (2026-10-25)

Synthèse d'une recherche web. Les points marqués « à vérifier » n'ont pas été confirmés.

### Outils existants et leurs limites

- **Imagiers faits maison (Word/PowerPoint, blogs, plastification)** : classés par thème ou album, utilisés pour le mur des mots, le loto, le memory, le tri. Format courant : A4 coupé en 4, image + mot en capitales sans article. Limites : fichiers éparpillés, refaits par chacun, aucune banque partagée ni détection des doublons. Sources : https://alcuinfonds.be/blog/guide-vocabulaire-maternelle/, https://gambin.co/blog/liste-vocabulaire-maternelle/
- **ARASAAC / Picto Selector** : logiciel Windows, plus de 35 000 pictogrammes, planches imprimables. Limites : outil local orienté communication alternative et augmentée (CAA), pas d'organisation par album ou module, pas de métadonnées pédagogiques, pas de partage à l'échelle de l'école. Source : https://aulaabierta.arasaac.org/en/picto-selector-home
- **Digipad / La Digitale** : murs collaboratifs gratuits, présentés comme compatibles RGPD. Limites : contenu non structuré, pas de modèle mot-image, pas de dédoublonnage, pas de génération de fiches. Sources : https://pedagogie.ac-nantes.fr/medias/fichier/presentation-la-digitale_1707408271301-pdf, https://sbssa.enseigne.ac-lyon.fr/spip/IMG/pdf/astuce_numerique_mars_2023.pdf
- **Eduscol** : démarche, pas d'outil ni de liste officielle. Guide 2010 « Enseigner le vocabulaire à l'école maternelle » (progression PS→GS, noms puis verbes puis adjectifs) ; fiches 2023 « Enrichir le vocabulaire » (catégorisation, polysémie). Recommande plusieurs représentations d'un même mot, ce qui appuie la fonction « plusieurs images par mot ». Sources : https://eduscol.education.fr/document/15613/download, https://eduscol.education.fr/document/53778/download
- **Canva, LearningApps, Lalilo** (à vérifier) : Canva = mise en page sans banque commune ; LearningApps = exercices interactifs élèves ; Lalilo = lecture CP-CE1, hors sujet.

### Sources d'images libres

- **ARASAAC** : CC BY-NC-SA. Citer l'auteur (Sergio Palao), ARASAAC et le Gobierno de Aragón ; pas d'usage commercial ; partage à l'identique. Compatible avec un projet non commercial si les crédits figurent sur les fiches. Texte exact à vérifier. Source : https://aulaabierta.arasaac.org/en/terms-of-use
- **Pixabay** : usage libre sans attribution, mais redistribution des images telles quelles comme banque d'images interdite. **À vérifier :** une banque partagée stockant des images Pixabay pourrait tomber sous cette interdiction. Contenus antérieurs au 9 janvier 2019 en CC0. Source : https://pixabay.com/service/terms/
- **Openclipart** : majoritairement CC0, vérifier fichier par fichier. Sources : https://opensource.com/life/16/2/create-on-openclipart, https://wiki.creativecommons.org/wiki/Clip_Art
- **Recommandation :** stocker pour chaque image la source, la licence et l'auteur.

### Cadre juridique et institutionnel

- **Illustrations d'albums** : l'exception pédagogique passe par des protocoles sectoriels (ministère, CFC, AVA) : public d'élèves et d'enseignants, œuvres acquises régulièrement, références citées, mise en ligne seulement sur intranet ou ENT, limites de résolution pour les arts visuels (environ 400 × 400 px, 72 dpi, à vérifier). Une banque durable d'illustrations scannées sort probablement du cadre. Aucun protocole postérieur à l'avenant 2019 trouvé. Recommandation : images libres, et ne garder de l'album que la référence (titre, auteur). **Décision retenue dans le brief :** l'image de l'album est autorisée uniquement dans « Mes mots », jamais dans la « Banque de l'école » ; sa légalité, même en espace personnel, reste à vérifier. Sources : https://www.education.gouv.fr/bo/16/Hebdo35/MENE1600684X.htm, https://www.education.gouv.fr/bo/20/Hebdo6/MENE2000032X.htm, https://consortiumariane.gitpages.huma-num.fr/axe1/travaux/juridique_2025-05-17_Exception_Enseignement_Recherche.pdf
- **RGPD** : l'application traite des données d'enseignants (comptes, e-mails). Dans le premier degré, le responsable de traitement est le DASEN ; l'outil doit être analysé avec le DPD académique et inscrit au registre des traitements. Sources : https://www.assemblee-nationale.fr/dyn/15/questions/QANR5L15QE15445.pdf, https://drane.ac-lyon.fr/spip/IMG/pdf/webinaire_rgpd_cde_vf.pdf
- **Hébergement** : UE recommandée. apps.education.fr ne semble pas pouvoir héberger une application tierce (à confirmer), mais peut servir de modèle d'authentification. Sources : https://sms-bse-bgb.ac-normandie.fr/IMG/pdf/appsdigitale.pdf, https://www.education.gouv.fr/les-enjeux-de-la-protection-des-donnees-au-sein-de-l-education-455253

## Détails produit pour le PRD

Précisions issues du brainstorming et des échanges, trop fines pour le brief.

- **Organisation** : un album se découpe en modules (découpage pédagogique, comme des chapitres) définis collectivement par l'équipe enseignante ; les thèmes (automne, cuisine, émotions…) sont transversaux et relient des mots de plusieurs albums.
- **Flux de saisie** : taper les mots, le nom de l'album, le module et le thème ; l'application signale les mots existants et propose des images.
- **Ajout photo sur téléphone** : prendre la photo, taper le mot, cocher les sections. Les photos sont prises hors de la classe.
- **Critères d'une bonne image** : simple, claire, peu de détails.
- **Progression par âge** : PS = image concrète et contextualisée (celle de l'album, dans « Mes mots ») ; GS = plusieurs exemples variés ou représentation plus abstraite (planche de catégorisation).
- **Fiches** : fiches thématiques tous albums confondus ; tri par catégorie grammaticale ; écritures cursive, script, Arial ou sans texte, combinables ; export Word et PowerPoint.
- **Métadonnées d'image à prévoir** : en plus de la carte d'identité, la source, la licence et l'auteur (voir « Sources d'images libres » ; crédits ARASAAC sur les fiches).
- **Modération** : seuls les enseignants inscrits contribuent ; un administrateur peut supprimer des éléments ou des comptes.
- **Pistes pour une version ultérieure (hors corpus)** : envoi hebdomadaire aux parents le vendredi (message court, vidéo en un clic, sans compte) ; vidéos de moins de 30 s pour les verbes d'action.
- **Ordre de grandeur du coût actuel** : ~6 h par album (1 h de choix des mots, ~2 h 30 d'images, ~2 h 30 de fiches), ~5 albums par an, 6 enseignants.
