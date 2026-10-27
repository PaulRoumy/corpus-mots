---
title: "Réconciliation : addendum du brief → PRD corpus-mots"
created: 2026-10-27
source: docs/briefs/brief-corpus-mots-2026-10-25/addendum.md
cible: docs/prd/prd-corpus-mots-2026-10-27/prd.md + addendum.md
---

# Réconciliation : addendum du brief → PRD

Seuls les écarts sont listés : éléments absents, affaiblis, contredits ou abandonnés sans le dire. Les éléments fidèlement repris ne figurent pas ici.

## Synthèse

| # | Écart | Gravité |
|---|-------|---------|
| 1 | Conditions du protocole « illustrations d'albums » absentes des exigences (résolution, ENT/intranet, œuvre acquise, références) | haute |
| 2 | Référence de l'album absente des exports contenant une image d'album | haute |
| 3 | Droits RGPD des enseignants (information, effacement, conservation) et suppression de compte non couverts | moyenne |
| 4 | Responsabilité du DASEN présentée comme question ouverte alors que la source l'affirme | basse |
| 5 | Pixabay : un point « à vérifier » devenu règle sans trace, nuance CC0 avant 2019 perdue | basse |
| 6 | ARASAAC : obligation de partage à l'identique (SA) non traitée | moyenne |
| 7 | apps.education.fr comme modèle d'authentification abandonné sans justification | basse |
| 8 | Écriture en capitales (format dominant des imagiers) absente | moyenne |
| 9 | Gain de temps (≈ 6 h par album) non mesuré dans les critères de réussite | moyenne |
| 10 | Modules « définis collectivement » devenus création individuelle | basse |
| 11 | Usages loto, memory et mur des mots non reflétés dans les Modèles de fiche | basse |
| 12 | Critère « bonne image » (simple, claire, peu de détails) sans traduction produit | basse |
| 13 | Openclipart : vérification de la licence fichier par fichier non reprise | basse |

---

## 1. Conditions du protocole « illustrations d'albums »

- **Source :** « public d'élèves et d'enseignants, œuvres acquises régulièrement, références citées, mise en ligne seulement sur intranet ou ENT, limites de résolution pour les arts visuels (environ 400 × 400 px, 72 dpi, à vérifier). »
- **PRD :** §6.1 et Q-1 posent la question de la légalité en des termes généraux (« relève-t-il de l'exception pédagogique ? »). FR-11 exige seulement la référence de l'Album. Aucune limite de résolution n'est imposée aux images d'album : FR-14 ne réduit que les photos. Rien ne demande que l'enseignant déclare posséder l'album, et la condition « intranet ou ENT » n'est pas confrontée au choix d'une application web tierce.
- **Gravité :** haute. Ces conditions déterminent si le stockage reste défendable, même dans Mes mots.
- **Correction proposée :** ajouter à FR-11 (et à FR-20 pour l'Import) que toute image d'album est réduite automatiquement sous le seuil du protocole `[ASSUMPTION: 400 × 400 px, 72 dpi]`, et qu'une case « album acquis par l'école ou par moi » doit être cochée. Préciser dans Q-1 les quatre conditions à vérifier, dont l'hébergement hors ENT. Ajouter en §6.1 le rappel que l'application n'est accessible qu'aux enseignants.

## 2. Référence de l'album absente des exports

- **Source :** « références citées » (condition du protocole) ; « ne garder de l'album que la référence (titre, auteur) ».
- **PRD :** FR-26 génère les crédits « exigés par les licences » (exemple ARASAAC). Une image d'album n'a pas de licence : rien n'impose que le titre, l'auteur et l'éditeur de l'album figurent sur une Fiche qui contient son image (Fiche issue d'une Préparation, que §6.1 autorise).
- **Gravité :** haute.
- **Correction proposée :** étendre FR-26 : « Toute image d'album présente dans un export est accompagnée de la référence de l'Album (titre, auteur, éditeur) dans les crédits. »

## 3. Droits RGPD et suppression de compte

- **Source :** « l'application traite des données d'enseignants (comptes, e-mails) […] l'outil doit être analysé avec le DPD académique et inscrit au registre des traitements » ; Modération : « un administrateur peut supprimer des éléments ou des comptes ».
- **PRD :** §6.2 limite les données et prévoit le passage devant le DPD. FR-27 permet seulement de désactiver ou réactiver un compte, pas de le supprimer. Aucune exigence ne couvre l'information des personnes (mentions légales, finalité), le droit d'accès ou d'effacement, ni la durée de conservation des comptes inactifs, que l'analyse du DPD demandera.
- **Gravité :** moyenne.
- **Correction proposée :** ajouter un FR « suppression de compte » (par l'administrateur ou à la demande de l'enseignant), qui précise le sort des Images versées (anonymisation de l'auteur ou maintien sur accord). Ajouter en §6.2 une page d'information RGPD et une durée de conservation `[ASSUMPTION]`.

## 4. Responsable de traitement

- **Source :** « Dans le premier degré, le responsable de traitement est le DASEN. »
- **PRD :** Q-3 demande « qui porte le registre des traitements (DASEN) ? » et « faut-il une analyse ou un avis du DPD ? », alors que la source et §6.2 l'affirment déjà. Le document se contredit légèrement.
- **Gravité :** basse.
- **Correction proposée :** reformuler Q-3 en « Comment obtenir l'inscription au registre du DASEN et l'avis du DPD avant le pilote, et dans quel délai ? »

## 5. Pixabay : de « à vérifier » à règle ferme

- **Source :** « **À vérifier :** une banque partagée stockant des images Pixabay pourrait tomber sous cette interdiction. Contenus antérieurs au 9 janvier 2019 en CC0. »
- **PRD :** §6.1 et FR-11 interdisent sans réserve de verser des images Pixabay. Le choix est prudent et défendable, mais l'incertitude n'apparaît pas dans Q-2 et l'exception CC0 (images antérieures à 2019) disparaît. Rien n'indique non plus comment l'application reconnaît une image Pixabay : la licence est déclarée par l'enseignant, il faut donc une liste de licences qui précise si chacune permet de verser.
- **Gravité :** basse.
- **Correction proposée :** noter dans §6.1 que la règle est volontairement prudente, ajouter Pixabay à Q-2, et prévoir en FR-11 une liste fermée de licences, chacune marquée « versable » ou non (CC0, CC BY, CC BY-SA, CC BY-NC-SA, licence Pixabay, inconnue).

## 6. ARASAAC : partage à l'identique

- **Source :** « pas d'usage commercial ; partage à l'identique. »
- **PRD :** FR-26 reprend l'attribution et §6.1 la clause non commerciale. La clause SA n'est pas traitée : les Fiches qui intègrent des pictogrammes ARASAAC sont des œuvres dérivées, qu'il faudrait diffuser sous CC BY-NC-SA.
- **Gravité :** moyenne. Le risque est faible en usage de classe, mais les crédits de FR-26 doivent le refléter.
- **Correction proposée :** préciser dans FR-26 que, lorsqu'une Fiche contient une Image sous licence SA, le crédit indique que la Fiche est diffusée sous la même licence. Ajouter ce point à Q-2.

## 7. apps.education.fr comme modèle d'authentification

- **Source :** « apps.education.fr ne semble pas pouvoir héberger une application tierce (à confirmer), mais peut servir de modèle d'authentification. »
- **PRD :** §6.3 retient seulement la « piste vers apps.education.fr » par le code libre. FR-1 et FR-2 choisissent l'invitation avec e-mail et mot de passe, sans dire si une authentification académique (compte institutionnel, SSO) a été envisagée puis écartée.
- **Gravité :** basse.
- **Correction proposée :** ajouter une ligne en §8.2 ou une question : « authentification par l'identité académique : écartée en V1 (pourquoi), à étudier pour l'ouverture à d'autres écoles ». Q-4 peut aussi rappeler que l'hébergement sur apps.education.fr reste à confirmer.

## 8. Écriture en capitales

- **Source :** « Format courant : A4 coupé en 4, image + mot en capitales sans article. »
- **PRD :** FR-24 propose cursive, script, Arial et sans texte. Les 4 cartes par page et l'article masqué sont repris, mais pas les capitales d'imprimerie, qui sont pourtant l'écriture la plus répandue dans les imagiers existants (et celle qu'utilise la PS).
- **Gravité :** moyenne. Sans capitales, l'export n'égale pas les fichiers que l'enseignant veut abandonner (SM-2).
- **Correction proposée :** ajouter « capitales » aux Écritures de FR-24 et au Glossaire, ou préciser explicitement que « Arial » s'entend en capitales `[ASSUMPTION]`.

## 9. Gain de temps non mesuré

- **Source :** « ~6 h par album (1 h de choix des mots, ~2 h 30 d'images, ~2 h 30 de fiches), ~5 albums par an, 6 enseignants. »
- **PRD :** la Vision cite les 6 h et UJ-1 promet « une soirée au lieu d'un week-end ». Aucun critère de §9 ne mesure le temps de préparation d'un Album, et SM-C2 ne surveille que le temps passé dans l'application. La ventilation 1 h / 2 h 30 / 2 h 30, qui permettrait de situer le gain (images et fiches), est perdue.
- **Gravité :** moyenne.
- **Correction proposée :** ajouter un SM secondaire déclaratif, par exemple « temps de préparation d'un Album divisé par 2 au moins (moins de 3 h) au troisième trimestre » `[ASSUMPTION]`, en reprenant la ventilation de référence.

## 10. Modules définis collectivement

- **Source :** « modules […] définis collectivement par l'équipe enseignante ».
- **PRD :** Glossaire « défini par l'équipe », mais FR-5 laisse n'importe quel enseignant créer des Modules, et seuls le créateur et l'administrateur peuvent les modifier. Le découpage devient celui du premier qui crée l'Album.
- **Gravité :** basse.
- **Correction proposée :** soit l'assumer explicitement (« le premier découpage fait foi, l'équipe l'ajuste »), soit permettre à tout enseignant de proposer ou modifier un Module d'un Album partagé.

## 11. Usages loto, memory, mur des mots et tri

- **Source :** imagiers « utilisés pour le mur des mots, le loto, le memory, le tri ».
- **PRD :** FR-23 propose cartes, liste illustrée et planche. Le memory (cartes en double) et le loto (planche et cartes à apparier) ne sont ni prévus ni écartés. Le §7 exclut les jeux interactifs, pas les jeux imprimés.
- **Gravité :** basse.
- **Correction proposée :** préciser dans FR-23 si ces supports passent par le modèle « cartes » (option « doubler chaque carte ») ou sont reportés en version ultérieure.

## 12. Critères d'une bonne image

- **Source :** « simple, claire, peu de détails » ; « PS = image concrète et contextualisée ; GS = plusieurs exemples variés ou représentation plus abstraite ».
- **PRD :** les critères n'apparaissent que dans la Vision. Aucune exigence ou consigne UX ne les porte, alors que SM-C3 surveille les images mal adaptées à la Section.
- **Gravité :** basse.
- **Correction proposée :** renvoyer ces critères à l'UX (aide contextuelle lors du choix d'une image, rappel de la progression PS→GS) via une ligne en §5 ou dans l'addendum du PRD.

## 13. Openclipart : vérification de la licence fichier par fichier

- **Source :** « Openclipart : majoritairement CC0, vérifier fichier par fichier. »
- **PRD :** Openclipart n'est cité qu'au §8.2 (recherche intégrée hors V1). En V1, son téléversement manuel n'est encadré que par la règle générale de FR-11.
- **Gravité :** basse.
- **Correction proposée :** aucune exigence nouvelle n'est nécessaire si la liste de licences du point 5 est adoptée. Sinon, ajouter un mot d'aide à la saisie de la licence.
