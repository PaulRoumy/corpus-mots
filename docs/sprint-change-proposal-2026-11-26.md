---
title: Proposition de changement de sprint — décisions et écarts issus de la démo du 25 novembre
date: 2026-11-26
status: approuvée (2026-11-26), appliquée aux epics, au PRD et au sprint-status
auteur: Paul (avec bmad-correct-course)
mode: lot
---

# Proposition de changement de sprint — démo du 25 novembre

## 1. Résumé du problème

**Déclencheur.** Le 25 novembre, Paul a regardé la démo de l'application dans l'état où l'ont laissée les stories 3.2 et 3.3. Il l'a vue avec les yeux d'une enseignante qui la découvre. La mise à jour UX qui a suivi (bmad-ux, commit `863aaad`) a pris six décisions. Plusieurs contredisent des critères d'acceptation de stories déjà livrées. La démo a aussi montré cinq écarts entre le code et les spines.

**Type de problème.** Ce sont des exigences précisées à l'usage : des enseignants réels n'ont pas encore utilisé l'application, mais leur parcours type (UJ-1) laisse voir des gestes en trop et des doublons. Ce n'est ni une limite technique ni un pivot.

**Les six décisions UX** (`docs/ux-designs/ux-corpus-mots-2026-10-28/EXPERIENCE.md`, mis à jour le 2026-11-25) :

| # | Décision | Contredit |
|---|---|---|
| D-1 | Dans le Champ de saisie rapide, **Entrée retient l'Image en tête** du Panneau de détection. ↓ + Entrée en choisit une autre. Seul un Mot sans aucune Image visible arrive « à illustrer ». | Story 2.7 : « l'Entrée seule, sans choix, ajoute le Mot « à illustrer » » ; UX-DR-26 |
| D-2 | La Carte « à illustrer » montre **d'abord les Images existantes** (ordre FR-9, Marque « déjà utilisée »), puis les suggestions ARASAAC. Une suggestion ARASAAC dont l'enseignante **possède déjà l'Image** pour ce Mot est marquée « déjà utilisée », et la choisir **réutilise cette Image** (état, Sections et Thèmes gardés) au lieu d'en créer une nouvelle. | Story 2.4 (toujours une nouvelle Image) ; UX-DR-28 |
| D-3 | Une Image créée depuis une Préparation **reçoit la Section de la Préparation**, que l'enseignante peut modifier ensuite dans la Carte d'identité. | Le §4.4 du PRD le prévoyait déjà (« remplie automatiquement à partir du contexte … Section de la Préparation »), mais aucune story ne l'exige et le code ne le fait pas |
| D-4 | Le filtre Album retient **l'album d'origine des images d'album et les Images utilisées dans une Préparation de cet Album**, avec des usages visibles selon la règle de Confidentialité. | Story 3.2 et `FiltresBanqueCommande` (« Album d'origine (image d'album seulement) ») |
| D-5 | Bandeau « Annuler » : 8 s pour un geste unitaire, mais **aucune minuterie pour un geste en lot**. Le bandeau reste jusqu'au geste suivant ou jusqu'à sa fermeture. | UX-DR-13, Story 1.4, Story 3.3 (« Retirer de la Préparation », annulable en 8 s) |
| D-6 | Verser reste autorisé quand le Sens est « à compléter ». | Rien : le code (`Versabilite`) ne bloque déjà pas. Il suffit de l'écrire. |

**Les cinq écarts de code** (memlog UX, entrée « écarts code ») :

| # | Écart | Où |
|---|---|---|
| E-1 | La Carte « à illustrer » n'affiche ni les Images existantes ni la Marque « déjà utilisée ». Pendant la démo, cela a créé 3 doublons privés. | `preparations/carte-mot.ts`, `suggestions-arasaac.ts` (corrigé par D-2) |
| E-2 | La liste « Aucun album trouvé » se rouvre après « Créer l'album ». | `preparations/recherche-albums.ts` (Story 2.1.2) |
| E-3 | Le libellé « Temps passé (facultatif) » est coupé. | `commun/carte-identite/carte-identite.ts` |
| E-4 | Le fond de focus reste sur la puce de provenance après le clic. | Banque, barre de filtres (Story 3.2.2) |
| E-5 | Dans la grille de la Banque, les cartes avec et sans badge « versée » ne sont pas alignées. | Banque (Story 3.3.2) |

**Preuves.** Captures et scripts de la démo (scratchpad de session, temporaire), et memlog UX entrées 63 à 72. Il y a 3 Images ARASAAC privées en double pour un même Mot dans la base de démo, aujourd'hui supprimée.

## 2. Analyse d'impact

### Checklist

| Item | Statut | Constat |
|---|---|---|
| 1.1 Story déclenchante | [x] | Pas de story unique : la démo après 3.3 a remis en cause 2.4, 2.7, 3.2 et 3.3. |
| 1.2 Problème | [x] | Exigences précisées à l'usage (voir §1). |
| 1.3 Preuves | [x] | Memlog UX, diff `863aaad`, doublons observés. |
| 2.1 Epic en cours (3) | [x] | Il reste réalisable tel quel. Les stories 3.4 à 3.6 ne dépendent pas des décisions, sauf 3.5 (« Ne plus verser » annulable, unitaire, donc 8 s, sans changement). |
| 2.2 Changements d'epic | [!] | Ajouter deux stories (2.11 et 3.7). Aucun epic n'est retiré ni redéfini. |
| 2.3 Epics futurs | [x] | Epic 4 (Fiches par filtre, 4.6) hérite du filtre Album élargi, sans nouveau travail. Epic 5 : la Barre d'actions en lot de l'Import (écarter des paires) hérite de D-5. Je l'ajoute comme critère de la Story 5.3. |
| 2.4 Epics obsolètes ou nouveaux | [N/A] | Aucun. |
| 2.5 Ordre | [!] | Faire 2.11 et 3.7 **avant 3.4**. 3.4 (réutiliser l'Image d'un collègue) s'appuie sur la détection et la Carte « à illustrer » que D-1 et D-2 modifient. |
| 3.1 PRD | [!] | FR-9, FR-12 et FR-15 : ajouter des précisions (voir §4). Le MVP ne change pas. |
| 3.2 Architecture | [x] | Aucun AD à changer. D-2 respecte AD-5 (lien, jamais de copie). D-4 s'appuie sur `lien_image.album_id`, qui existe déjà. D-2 demande d'identifier le pictogramme ARASAAC d'une Image. Aujourd'hui, son numéro n'existe que dans le texte de `source`. Je propose une nouvelle migration `V…__vocabulaire_image_arasaac.sql` : colonne `arasaac_id integer` nullable, remplie depuis `source` pour les Images existantes, conformément à AD-22. |
| 3.3 UX | [x] | Déjà à jour (`863aaad`). |
| 3.4 Autres artefacts | [x] | Rien à faire pour le déploiement, la CI ou la page Données personnelles. Le contrat OpenAPI change (D-2, D-3) : il faudra régénérer `front/openapi/`. |

### Impact par epic et story

- **Epic 2** (stories livrées) : les critères de 2.4 et 2.7 sont remplacés pour la saisie, et le §4.4 du PRD est enfin appliqué (D-3). Nouvelle **Story 2.11**.
- **Epic 3** (en cours) : les critères de 3.2 (filtre Album) et de 3.3 (Annuler en lot) sont élargis, et l'écart E-4 et E-5 est à corriger. Nouvelle **Story 3.7**, à faire avant 3.4.
- **Epic 1** : le composant partagé Bandeau « Annuler » (Story 1.4) gagne un mode « lot ». Le code change dans 3.7, et le critère de 1.4 reçoit un renvoi.
- **Epic 5** : la Story 5.3 reçoit un critère D-5.

### Impact technique

| Décision | Back | Front |
|---|---|---|
| D-1 | Aucun : `Usages.lierImage` avec l'origine `reutilisee` existe. | Panneau de détection et `preparation.ts` : Entrée sans choix retient la première Image proposée s'il y en a une. |
| D-2 | `arasaac_id` (migration), lu au choix d'un pictogramme : si l'enseignant possède déjà une Image visible de ce pictogramme pour ce Mot et ce Sens, on lie cette Image au lieu d'en créer une. Les suggestions ARASAAC exposent la marque « déjà utilisée ». | Carte « à illustrer » : Images classées (même source que le Panneau de choix), puis suggestions marquées. |
| D-3 | Création depuis une Préparation (ARASAAC, téléversement depuis la carte, Ajouter une image pour un Mot) : Sections = { Section de la Préparation }. | Aucun, au-delà du contrat régénéré. |
| D-4 | `Images.conditionFiltres` : Album = album d'origine **ou** un lien de l'enseignant courant dont `album_id` vaut ce filtre. Le lien d'un collègue ne compte jamais, comme pour le filtre Section. | Aucun. |
| D-5 | Aucun. | `bandeau-annuler.ts` : option `sansMinuterie`. Fermeture au geste suivant de l'enseignant (nouvelle action qui modifie des données, ou ouverture d'un autre bandeau). Utilisé par « Retirer de la Préparation » en lot. |
| D-6 | Aucun : un test confirme qu'un Sens « à compléter » ne bloque pas Verser. | Aucun. |

## 3. Démarche recommandée

**Ajustement direct.** J'ajoute deux stories au plan existant, sans retour arrière ni révision du MVP.

- **Pourquoi.** Les décisions affinent des parcours livrés sans en changer la structure. Le modèle de données n'est touché que par une colonne nullable. Revenir sur 2.4 ou 2.7 coûterait plus cher que de les compléter.
- **Effort.** Story 2.11 : moyen (back + front, une migration). Story 3.7 : faible à moyen (une requête, un composant partagé, quatre corrections d'interface).
- **Risque.** Faible.
  - D-1 change un geste appris, mais aucun utilisateur réel ne l'a encore appris.
  - D-2 doit rester dans `VisibiliteImages` : seules les Images de l'enseignant comptent pour « possédée » (AD-2).
- **Calendrier.** Les deux stories passent avant 3.4. L'Epic 3 prend environ deux stories de plus.

## 4. Propositions de modification détaillées

### 4.1 Epics (`docs/epics/epics-corpus-mots-2026-10-29/epics.md`)

**Inventaire UX, UX-DR-13**

ANCIEN :
> - UX-DR-13 : Bandeau « Annuler » (snackbar). Pas de confirmation pour les gestes courants. Annulation possible pendant 8 s, décompte suspendu au survol et au focus, un seul bandeau à la fois, annoncé aux lecteurs d'écran. « Annuler » appelle l'opération inverse.

NOUVEAU :
> - UX-DR-13 : Bandeau « Annuler » (snackbar). Pas de confirmation pour les gestes courants. Geste unitaire : annulation possible pendant 8 s, décompte suspendu au survol et au focus. Geste en lot : aucune minuterie, le bandeau reste jusqu'au geste suivant de l'enseignant ou sa fermeture. Un seul bandeau à la fois, annoncé aux lecteurs d'écran ; quitter la page le ferme sans annuler. « Annuler » appelle l'opération inverse.

**Inventaire UX, UX-DR-26**

ANCIEN :
> … Images ordonnées selon FR-9 (mes Images avant celles des collègues à rang égal), ↑ ↓ + Entrée pour choisir, première proposition mise en avant, …

NOUVEAU :
> … Images ordonnées selon FR-9 (mes Images avant celles des collègues à rang égal), première proposition mise en avant et retenue par Entrée, ↑ ↓ + Entrée pour en choisir une autre ; seul un Mot sans aucune Image visible arrive « à illustrer », …

**Inventaire UX, UX-DR-28**

ANCIEN :
> … Carte « à illustrer » (bordure en tirets, suggestions ARASAAC en ligne, « Téléverser »). …

NOUVEAU :
> … Carte « à illustrer » (bordure en tirets, Images existantes classées selon FR-9 puis suggestions ARASAAC en ligne, Marque « déjà utilisée » sur celles que l'enseignant possède déjà, « Téléverser »). …

**Story 1.4, critère « composants partagés »**

ANCIEN :
> - le Bandeau « Annuler » : 8 s, décompte suspendu au survol et au focus, un seul à la fois, annoncé aux lecteurs d'écran ;

NOUVEAU :
> - le Bandeau « Annuler » : 8 s, décompte suspendu au survol et au focus, un seul à la fois, annoncé aux lecteurs d'écran (mode « lot » sans minuterie ajouté par la Story 3.7) ;

**Story 2.4 et Story 2.7 : renvois**

On ajoute sous le critère concerné, sans réécrire l'historique livré :
- Story 2.7, après « **Et** l'Entrée seule, sans choix, ajoute le Mot « à illustrer » » : « *Remplacé par la Story 2.11 : l'Entrée seule retient la première Image proposée.* »
- Story 2.4, après le critère « pictogramme choisi » : « *Complété par la Story 2.11 : pictogramme déjà possédé réutilisé, Section de la Préparation.* »

**Story 3.2 et Story 3.3 : renvois**

- Story 3.2, sous le premier critère : « *Filtre Album élargi par la Story 3.7.* »
- Story 3.3, sous « Retirer de la Préparation », annulable : « *Bandeau sans minuterie pour un geste en lot : Story 3.7.* »

**Nouvelle Story 2.11** (après 2.10)

> ### Story 2.11 : Saisir des Mots qui arrivent illustrés, sans doublon ni Section à refaire
>
> En tant qu'enseignant,
> Je veux qu'un Mot déjà illustré arrive avec son Image dès que je valide, et que mes nouvelles Images portent la Section de ma Préparation,
> Afin de ne faire aucun geste de plus pour ce qui existe déjà et de ne jamais créer deux fois la même Image (FR-6, FR-9, FR-12, §4.4).
>
> **Critères d'acceptation :**
>
> **Étant donné** le Champ de saisie rapide et un Mot qui a au moins une Image `proposable`
> **Quand** l'enseignant appuie sur Entrée sans choisir d'Image
> **Alors** le Mot est ajouté et la première Image proposée (ordre FR-9) est liée par `Usages.lierImage` avec l'origine `reutilisee` (UX-DR-26)
> **Et** ↓ ↑ + Entrée ou un clic retient une autre Image, comme avant
> **Et** un Mot sans aucune Image visible arrive « à illustrer »
> **Et** l'annonce `aria-live` indique que le Mot est arrivé illustré
>
> **Étant donné** une Carte « à illustrer » d'un Mot qui a des Images `proposable`
> **Quand** elle s'affiche
> **Alors** ces Images apparaissent d'abord, classées comme dans la détection, avec la Marque « déjà utilisée », puis les suggestions ARASAAC et « Téléverser » (UX-DR-28)
>
> **Étant donné** une suggestion ARASAAC dont l'enseignant possède déjà une Image pour ce Mot et ce Sens
> **Quand** la suggestion s'affiche
> **Alors** elle porte la Marque « déjà utilisée »
> **Et** la choisir lie cette Image existante (origine `reutilisee`) sans rien télécharger ni créer. Son état, ses Sections et ses Thèmes sont gardés (AD-5)
> **Et** le pictogramme d'une Image est identifié par une colonne `arasaac_id` ajoutée par une nouvelle migration, remplie pour les Images existantes à partir de leur source (AD-22)
> **Et** seules les Images de l'enseignant comptent, et la décision passe par `VisibiliteImages` (AD-2)
>
> **Étant donné** une Image créée depuis une Préparation (pictogramme ARASAAC, « Téléverser » depuis la carte, Panneau de choix ou « Ajouter une image » ouvert pour un Mot)
> **Quand** elle est enregistrée
> **Alors** elle reçoit d'office la Section de la Préparation, et l'enseignant peut la modifier dans la Carte d'identité
> **Et** une Image ajoutée par « + › Ajouter une image », sans Préparation, ne reçoit aucune Section d'office
>
> **Étant donné** la liste de recherche d'Album à la création d'une Préparation
> **Quand** l'enseignant choisit « Créer l'album »
> **Alors** la liste « Aucun album trouvé » ne se rouvre pas (écart E-2)

**Nouvelle Story 3.7** (dans l'epic, à réaliser avant 3.4)

> ### Story 3.7 : Filtre Album par usage, Annuler en lot et finitions de la Banque
>
> En tant qu'enseignant,
> Je veux retrouver par Album toutes les Images que j'y ai utilisées, et pouvoir annuler un geste en lot sans course contre la montre,
> Afin de retrouver mon travail par album et de rattraper une erreur sur plusieurs Mots (FR-15, FR-19, UX-DR-13).
>
> **Critères d'acceptation :**
>
> **Étant donné** la Banque et le filtre Album
> **Quand** il s'applique
> **Alors** il retient les images d'album dont c'est l'album d'origine et les Images liées dans une Préparation de l'enseignant pour cet Album, quelle que soit la provenance
> **Et** le lien d'un collègue ne compte jamais, comme pour le filtre Section (FR-8, AD-2)
>
> **Étant donné** un geste en lot annulable (« Retirer de la Préparation » sur plusieurs Mots)
> **Quand** le Bandeau « Annuler » s'affiche
> **Alors** il n'a aucune minuterie et reste jusqu'au geste suivant de l'enseignant (une action qui modifie des données, ou un autre bandeau) ou jusqu'à sa fermeture (UX-DR-13)
> **Et** il se ferme sans annuler quand l'enseignant quitte la page
> **Et** un geste unitaire garde 8 s, avec le décompte suspendu au survol et au focus
>
> **Étant donné** une de mes Images dont le Sens est « à compléter » et qui est versable par ailleurs
> **Quand** je choisis « Verser »
> **Alors** elle est versée. Le Sens « à compléter » reste mis en avant dans la Carte d'identité sans bloquer le versement (test dédié)
>
> **Étant donné** la Banque et la Carte d'identité
> **Quand** elles s'affichent
> **Alors** le libellé « Temps passé (facultatif) » est lisible en entier (E-3), aucun fond de focus ne reste sur une puce de provenance après le clic, tout en gardant un focus visible au clavier (E-4), et les cartes avec et sans badge « versée » sont alignées dans la grille (E-5)

**Story 5.3** : ajouter un critère

> **Étant donné** des paires écartées en lot
> **Quand** le Bandeau « Annuler » s'affiche
> **Alors** il n'a aucune minuterie, comme tout geste en lot (UX-DR-13)

**Carte de couverture des FR** : aucune ligne ne change, puisque FR-9, FR-12 et FR-15 restent couverts par leurs epics.

### 4.2 PRD (`docs/prd/prd-corpus-mots-2026-10-27/prd.md`)

**FR-9** : ajouter une puce

> - Dans la saisie en série, valider le Mot retient la première Image proposée. L'enseignant peut en choisir une autre ou la changer ensuite.

**FR-12** : ajouter une puce

> - Un pictogramme dont l'enseignant possède déjà l'Image pour ce Mot est signalé, et le choisir réutilise cette Image au lieu d'en créer une nouvelle.

**FR-15** : ajouter une puce

> - Le filtre Album retient les images d'album de cet Album et les Images que l'enseignant a utilisées dans une Préparation de cet Album.

Le MVP ne change pas. Le §4.4 couvre déjà D-3, et D-6 ne contredit aucune FR.

### 4.3 Architecture

Aucun AD ne change. La seule note concerne la colonne `arasaac_id`, une nouvelle migration du module `vocabulaire` (AD-22). Elle est inscrite dans la Story 2.11.

### 4.4 UX

Déjà fait (`863aaad`). Les spines restent en `status: draft`.

### 4.5 Suivi (`docs/realisation/sprint-status.yaml`)

```yaml
  epic-2: in-progress
  …
  2-10-gérer-ses-préparations: done
  2-11-saisir-des-mots-qui-arrivent-illustrés: backlog
  epic-2-retrospective: done

  epic-3: in-progress
  …
  3-3-verser-ses-images-dans-la-banque: done
  3-7-filtre-album-annuler-en-lot-et-finitions-de-la-banque: backlog   # avant 3.4
  3-4-réutiliser-l-image-d-un-collègue: backlog
```

## 5. Passage à la réalisation

- **Portée : modérée.** Le backlog s'enrichit de deux stories et quelques critères, sans replanification.
- **Qui fait quoi :**
  - Paul approuve et réalise, avec `bmad-build`, la story 2.11 puis la story 3.7.
  - Dev (bmad-build) applique les critères ci-dessus et régénère `front/openapi/` après le changement de contrat.
- **Critères de réussite :**
  - Rejouer UJ-1 étape 5 : « farine » + Entrée arrive illustré.
  - Choisir deux fois le même pictogramme ARASAAC ne crée qu'une Image.
  - Une Image ajoutée depuis une Préparation MS porte MS.
  - Le filtre Album retrouve les pictogrammes utilisés dans une Préparation de l'album.
  - « Retirer de la Préparation » sur 3 Mots reste annulable sans limite de temps.
  - Les écarts E-2 à E-5 ne se reproduisent plus.
  - `./mvnw verify` et `npm test` passent.
