# Relecture de la paire de spines — corpus-mots

Relecture « grille de qualité » (rubric walker) de `DESIGN.md` + `EXPERIENCE.md` du 2026-10-28, contre le PRD 2026-10-27, `.memlog.md` (décisions canoniques) et `.working/`. Aucun dossier `mockups/` ni `wireframes/` à ce stade (maquettes fidèles prévues après cette relecture) ; `imports/` est vide.

## Verdict global

La paire est cohérente, bien sourcée et directement exploitable par l'architecture : les cinq parcours UJ-1 à UJ-5 sont tous déroulés avec protagoniste, étapes, point culminant et échec ; les 68 jetons de couleur ont leur valeur claire et sombre ; les 37 composants portent le même nom dans les deux documents ; la matrice d'états couvre chaque surface. Aucun point critique. Les trois points élevés touchent tous l'écran **Préparation** et les actions en lot : le cœur du produit n'est décrit que par fragments (en-tête, liste de Mots, colonne d'aperçu) alors qu'il ne fait pas partie des quatre maquettes fidèles prévues, et le geste de sélection qui déclenche la Barre d'actions en lot n'est défini nulle part. Ces points sont à trancher avant le développement des stories de Préparation, et idéalement avant les maquettes.

## 1. Couverture des parcours — adéquat

Vérifié : les UJ-1 à UJ-5 du PRD (§2.3) ont chacun leur Key Flow avec protagoniste nommé, étapes numérotées, point culminant en gras et un chemin d'échec ou un cas limite. Les FR-1 à FR-34 ont été recoupés avec les surfaces de l'IA, les Component Patterns et les State Patterns.

### Constats
- **[medium]** UJ-4 : le point d'entrée « Fiches → Fiche thématique → filtres » ne dit pas où vivent ces filtres (écran de filtres dans Fiches ? renvoi vers la Banque filtrée ?), et l'entrée « Génération de Fiche depuis la Banque (filtre) » n'a aucun bouton ni composant nommé (EXPERIENCE › IA, ligne Fiches et Génération de Fiche ; Key Flows › UJ-4 étape 1). Le PRD fait partir UJ-4 d'un filtre de la Banque. *Fix :* choisir un seul chemin (par exemple « Fiche thématique » ouvre la Banque en mode sélection avec un bouton plein « Générer une fiche ») et le nommer dans Component Patterns.
- **[medium]** Deux exigences du PRD n'ont pas de place dans l'interface : l'article masqué par défaut et affichable sur demande (FR-28) est absent des Réglages de Fiche ; le Thème par défaut d'une Préparation (FR-6) est absent du Dialogue « Nouvelle préparation » (Album, Section, Module seulement) (EXPERIENCE › Component Patterns, Réglages de Fiche et Dialogue « Nouvelle préparation »). *Fix :* ajouter « Afficher l'article » aux Réglages de Fiche ; ajouter un Thème facultatif au dialogue, ou noter explicitement qu'il se règle dans l'en-tête de la Préparation.
- **[medium]** Ajout de photo (UJ-3) : seul le cas « Ce mot existe déjà » est couvert. Un Mot nouveau sur le téléphone crée un Sens : sans libellé, sans catégorie grammaticale (FR-10) ? Et quand le Mot a plusieurs Sens, le choix est-il obligatoire avant Enregistrer, ce qui ajouterait un quatrième geste ? (EXPERIENCE › Key Flows UJ-3 étape 2 ; Component Patterns › Bouton Enregistrer mobile ; Responsive « Mot (et Sens si proposé) »). *Fix :* poser la règle : Mot nouveau = Sens par défaut sans catégorie, complété le soir dans la Carte d'identité ; Sens proposé présélectionné, changement facultatif.
- **[low]** Plusieurs actions du PRD n'ont pas de surface : corriger un Album (créateur, FR-4), renommer / supprimer un Module ou un Thème, refus de supprimer un Thème utilisé (FR-5), réactiver un compte, garder au moins un administrateur, signaler les comptes inactifs (FR-32), dupliquer une Préparation en changeant de Section (FR-11). *Fix :* une ligne par cas dans « Référentiels sans écran dédié » et dans l'état Administration.

## 2. Complétude des jetons — adéquat

Vérifié : 34 rôles de couleur clairs, 34 sombres, tous en hexadécimal et appariés ; typographie, arrondis et espacements définis ; toutes les références `{…}` des deux documents (`{colors.*}`, `{typography.*}`, `{spacing.*}`, `{rounded.*}`, `{components.carte-verification-import}`, `{components.bandeau-annuler}`) résolvent. Contrastes des paires porteuses déclarés, en clair et en sombre.

### Constats
- **[high]** Aucun jeton pour le texte posé sur `error` : le Dialogue de confirmation demande un « bouton de confirmation en `error` » (DESIGN › Components, Dialogue de confirmation ; frontmatter `dialogue-confirmation`), mais `on-error` / `on-error-dark` n'existent pas, et la paire n'est pas dans le tableau des contrastes. En sombre, `error-dark` (#ffb4a6) exige un texte foncé : un développeur qui choisit du blanc par défaut échoue en contraste. *Fix :* ajouter `on-error: '#ffffff'` et `on-error-dark` (par exemple #690005), une ligne « Bouton destructif » au tableau des contrastes et `confirm-background` / `confirm-foreground` dans `dialogue-confirmation`.
- **[medium]** `image-photo` (#2c6bd1) est identique à `primary` : la bordure « photo personnelle » se confond avec l'anneau de sélection 2 px `primary` de la première proposition du Panneau de détection, et contredit « `primary` réservé à l'action et à la sélection » (DESIGN › Colors, tableau des types ; Components › Panneau de détection ; Do's and Don'ts). *Fix :* donner à la photo une teinte distincte (par exemple un bleu-vert) ou marquer la sélection autrement (fond `primary-container` + coche).
- **[medium]** `word-cursive` fixe `Segoe Script`, police système Windows absente sur macOS, iOS et Android ; aucune pile de repli n'est donnée, alors que la cursive est l'un des trois marqueurs de l'identité (DESIGN › frontmatter typography, Typography). La provenance de Nunito (auto-hébergée ou CDN tiers, sensible au regard du §6.3 du PRD) n'est pas dite non plus. *Fix :* indiquer une pile de repli (par exemple une cursive libre auto-hébergée) et « Nunito auto-hébergée » ; la décision Q-5 des Fiches reste à part.
- **[low]** Valeurs littérales dans les jetons de composant au lieu de références : `champ-saisie-rapide.radius: '12px 12px 0 0'` (= `{rounded.md}` en haut), `apercu-fiche.page: '#ffffff'`, `shadow: 'élévation 1|2'` (chaîne qui renvoie à la prose). Largeur de la barre latérale, de la colonne d'aperçu (« ≈ 260 px ») et du panneau Carte d'identité non chiffrées (DESIGN › Layout & Spacing). *Fix :* ajouter `elevation-1/2`, `sidebar-width`, `side-panel-width`, `preview-column-width` en `spacing` ou dans les composants.
- **[low]** `badge-etat` ne relie pas chaque état à ses jetons (`etat-*-bg/fg`) dans le frontmatter ; la correspondance n'est qu'en prose. *Fix :* sous-clés `a-illustrer`, `retiree`, `supprimee`, `versee`.

## 3. Couverture des composants — adéquat

Vérifié : les 37 composants de DESIGN › Components ont leur ligne de même nom dans EXPERIENCE › Component Patterns, avec des règles réelles. Les composants cités dans les parcours, l'IA et les états, mais absents des deux tableaux, ont été relevés.

### Constats
- **[high]** L'écran **Préparation**, cœur du produit, n'a pas de composition : l'en-tête (compteur « 14 mots, 10 déjà illustrés » du point culminant d'UJ-1, Module modifiable, champ « Temps passé », bouton « Générer une fiche »), la liste ou grille des Cartes de Mot et la « colonne d'aperçu à droite (≈ 260 px) » ne sont ni nommés ni spécifiés ; la maquette d'exploration y place un « Aperçu de carte » que les spines ne mentionnent pas. « Carte de Mot — clic : changer d'Image » ne dit pas ce qui s'ouvre. Et la Préparation ne fait pas partie des quatre maquettes fidèles prévues (DESIGN › Layout & Spacing, Shapes « bandeau d'en-tête de Préparation » ; EXPERIENCE › IA ligne Préparation, Key Flows UJ-1 étapes 7 à 9). *Fix :* ajouter les composants « En-tête de Préparation », « Liste de Mots » et « Aperçu de carte » (ou retirer la colonne) dans les deux spines ; préciser la cible du clic sur une Carte de Mot ; ajouter la Préparation aux maquettes fidèles ou la promouvoir depuis la direction 3.
- **[high]** Le geste de sélection qui fait apparaître la Barre d'actions en lot n'est défini nulle part, alors que le clic est déjà pris : Carte de Mot = changer d'Image, Vignette d'Image = ouvrir la Carte d'identité. UJ-1 étape 9 (« Sélection de ses 4 pictogrammes → Verser ») et UJ-2 étapes 4-5 en dépendent (EXPERIENCE › Component Patterns, Barre d'actions en lot, Carte de Mot, Vignette d'Image ; Interaction Primitives « Sélection puis action en lot »). *Fix :* définir un composant de sélection (case à cocher au survol et au focus, toujours visible dès qu'une sélection existe, Maj+clic pour une plage, « Tout sélectionner »), identique dans Préparation, Banque et Import, avec son rendu visuel dans DESIGN.
- **[medium]** Composants cités sans spécification visuelle ni comportementale : création de Sens (« Nouveau sens » ouvre « la création de Sens » ; dialogue interdit au-dessus d'un dialogue, panneau ?), sélecteur de catégorie grammaticale, champ à étiquettes (Thème), sélecteur de licence (liste fermée), zone de dépôt de l'Import, ligne d'historique des Fiches (« refaire en un clic »), dialogue de retrait avec motif (les quatre motifs de FR-30 ne sont pas listés), bandeau d'erreur « Réessayer » (différent du Bandeau « Annuler » ?) (EXPERIENCE › IA « Référentiels », State Patterns, Key Flows UJ-1 cas limite, UJ-4 étape 6, UJ-5 étape 3). *Fix :* une ligne par composant dans les deux tableaux, ou une mention explicite « composant Material 3 standard, sans écart » quand c'est le cas.
- **[medium]** « Retirer » désigne deux actions différentes dans le Panneau Carte d'identité : le propriétaire retire de la Banque une Image qu'il a versée (FR-19), l'administrateur retire avec motif et notification (FR-30). Les deux mettent les Préparations des collègues en « image retirée de la banque » (FR-21), mais seul le retrait administrateur figure dans « Confirmer les actions graves » (EXPERIENCE › IA ligne Carte d'identité ; Interaction Primitives). *Fix :* deux libellés distincts (« Ne plus verser » / « Retirer de la banque (motif) ») et la règle de confirmation ou d'annulation de chacun.
- **[low]** Panneau Carte d'identité : la spec visuelle se limite à « panneau latéral droit, élévation 2 » (ordre des champs, emplacement des actions, largeur). Attendu de la maquette fidèle « Banque + Panneau Carte d'identité » : *Fix :* reporter ses décisions dans DESIGN › Components une fois la maquette promue.

## 4. Couverture des états — adéquat

Vérifié : chaque surface de l'IA a sa ligne vide / chargement / erreur / états propres ; droits refusés couverts (Carte d'identité en lecture seule, Administration par URL) ; absence de mode hors connexion énoncée ; hypothèse sur les défauts Material 3 signalée et suivie en Questions ouvertes.

### Constats
- **[medium]** Téléphone : aucun état pour l'appareil photo refusé ou indisponible, pour un navigateur sans capture directe, ni pour une session expirée malgré la session longue (connexion puis retour à l'ajout de photo ?). Le critère qui sert l'« Accueil mobile » plutôt que l'accueil ordinateur (largeur d'écran, appareil) n'est pas dit (EXPERIENCE › State Patterns ligne Ajout de photo ; IA ligne Accueil mobile). *Fix :* ajouter les lignes « Appareil photo refusé : choisir une photo de la galerie » et « Session expirée : connexion puis retour direct à l'ajout » ; fixer le critère (par exemple largeur < 600 px).
- **[medium]** Modèle d'enregistrement de la Carte d'identité non décidé : enregistrement automatique par champ ou bouton « Enregistrer » ? (« Modification non enregistrée signalée sur le champ ») ; et sur ordinateur, que devient un Mot en cours de saisie quand la session expire ? (EXPERIENCE › State Patterns, lignes Carte d'identité et Préparation). *Fix :* trancher (enregistrement automatique à la sortie du champ, recommandé pour la simplicité) et ajouter une ligne « Session expirée » en état global.
- **[low]** Import : l'étape « validation » n'a ni progression ni échec (validation partielle, Mot créé entre-temps par un collègue) (EXPERIENCE › State Patterns ligne Import). *Fix :* une phrase pour la progression et l'échec de la validation.
- **[low]** Bandeau « Annuler » : durée non chiffrée (« quelques secondes ») ; rien ne dit qu'il reste affiché tant qu'il a le focus, ce qu'exige le critère WCAG 2.2.1 (EXPERIENCE › Component Patterns, Accessibility Floor). *Fix :* durée (par exemple 8 s), suspendue au survol et au focus.
- **[low]** Focus visible en `{colors.primary}` : invisible sur un bouton plein, lui-même `primary` (EXPERIENCE › Accessibility Floor). *Fix :* anneau décalé de 2 px sur le fond, ou deux tons.

## 5. Couverture des références visuelles — adéquat

Vérifié : `mockups/` et `wireframes/` absents (attendu), `imports/` vide. Les trois fichiers de `.working/` sont liés en ligne, chacun avec ce qu'il illustre ; « les spines priment » est énoncé dans chaque document ; les quatre maquettes fidèles à venir sont nommées. Aucun orphelin.

### Constats
- **[low]** Le lien vers `.working/ia-2026-10-28.excalidraw` ne nomme pas ses écarts avec les décisions, contrairement à DESIGN pour les maquettes : le schéma garde « Mes images / École / Toutes », l'entrée Thème clair / sombre visible dans le menu de profil, « Panneau « mots déjà illustrés » », et n'a ni Fusion d'Albums, ni Carte « Import en cours », ni export de Mes mots (EXPERIENCE › IA, premier lien). *Fix :* lister ces écarts sur une ligne, ou mettre le schéma à jour.
- **[low]** Les références de composition pointent vers des explorations de `.working/` (directions-1, qui montre encore l'ancienne navigation et GS en vert) faute de maquettes promues ; la Préparation, écran de référence de directions-1, n'aura pas de maquette fidèle (voir § 3). *Fix :* promouvoir la direction 3 de la Préparation dans `mockups/` au moment des maquettes fidèles, avec les mêmes écarts annotés.

## 6. Excès et surspécification — fort

Vérifié : pas de pixels là où un jeton suffit (hors les cas du § 2), pas de restitution des personas ni des FR (citées par identifiant), tableaux partout où ils servent. La sous-section « Fiches (documents générés) » de DESIGN et le tableau Confidentialité d'EXPERIENCE traduisent des exigences en règles applicables : ils méritent leur place.

### Constats
- **[low]** EXPERIENCE › Foundation, ligne « Enjeu » (« documents UX en français, comme le PRD ») : aucune décision exploitable en aval. *Fix :* la supprimer ou la déplacer dans `.memlog.md`.

## 7. Discipline d'héritage — adéquat

Vérifié : toutes les sources du frontmatter existent ; les noms des UJ sont repris mot pour mot ; les termes du Glossaire (Mes mots, Banque de l'école, Verser, Réutiliser, Carte d'identité, Fiche, Écriture…) sont employés tels quels ; les noms de composants sont identiques entre les deux spines ; les références de jetons d'EXPERIENCE résolvent dans DESIGN.

### Constats
- **[low]** « Règle de confidentialité de l'IA » (EXPERIENCE › Component Patterns, Champ de recherche et Panneau de détection) : en français, « IA » se lit « intelligence artificielle » ; un développeur, humain ou agent, peut s'y tromper. *Fix :* « règle de Confidentialité (§ Information Architecture) ».
- **[low]** Le même élément porte deux noms : « Recherche de mot » (IA, tableau Confidentialité) et « Champ de recherche » (composant). *Fix :* garder « Champ de recherche » partout, ou renommer le composant.
- **[low]** `.memlog.md` cite comme sources le brief 2026-10-25 et l'addendum du PRD ; ni l'un ni l'autre n'est dans le frontmatter `sources`, et DESIGN ne liste pas `reconcile-*.md` ni le schéma d'IA alors qu'il en applique les décisions. *Fix :* aligner les deux listes `sources`.

## 8. Adéquation à la forme — fort

Vérifié : sections de DESIGN dans l'ordre canonique (Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts) ; toutes les sections par défaut d'EXPERIENCE présentes ; Responsive & Platform présent (ordinateur + téléphone) ; Inspiration & Anti-patterns présent (directions écartées) ; « Questions ouvertes » ajoutée et justifiée (Q-5, hypothèses suivies).

### Constats
- **[low]** Inspiration & Anti-patterns vient après Key Flows, alors que les exemples de référence la placent avant. *Fix :* la remonter avant Key Flows.

## Notes mécaniques

- **Références croisées** : toutes les références `{…}` résolvent. `barre-superieure.search: '{components.champ-recherche}'` référence un composant, ce que le résolveur accepte. `shadow: 'élévation 1|2'` est une chaîne et non un jeton (§ 2).
- **Noms** : « Recherche de mot » / « Champ de recherche » (§ 7) ; « Encart « mots déjà illustrés » » (spines) / « Panneau « mots déjà illustrés » » (schéma d'IA) ; « Mes images » (schéma, début du memlog) / « Mes mots » (spines, décision finale) : les spines sont à jour, le schéma ne l'est pas.
- **Frontmatter** : DESIGN porte `title`, `status: draft`, `created`, `updated`, `sources`, `name`, `description` et les jetons ; EXPERIENCE porte `title`, `status: draft`, `created`, `updated`, `sources`. Les deux sont en `draft` : passer à `final` après correction des points élevés.
- **Hypothèses** : deux `[ASSUMPTION]` (traitement de « image supprimée, à remplacer » ; défauts Material 3 pour le chargement et les erreurs), toutes deux reprises en Questions ouvertes.
- **Mermaid** : aucun diagramme, rien à vérifier.
- **Comptes** : DESIGN 351 lignes, 68 jetons de couleur, 37 composants (frontmatter et prose) ; EXPERIENCE 299 lignes, 37 lignes de composant, 14 lignes d'états, 5 Key Flows. Conforme au dernier `(change)` du memlog.
