import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { Title } from '@angular/platform-browser';
import { Api } from '../api/api';
import { creerModule } from '../api/fn/albums-resource/creer-module';
import { lireAlbum } from '../api/fn/albums-resource/lire-album';
import { listerModulesDeLAlbum } from '../api/fn/albums-resource/lister-modules-de-l-album';
import { renommerModule } from '../api/fn/modules-resource/renommer-module';
import { supprimerModule } from '../api/fn/modules-resource/supprimer-module';
import { ajouterMotPreparation } from '../api/fn/preparations-resource/ajouter-mot-preparation';
import { lirePreparation } from '../api/fn/preparations-resource/lire-preparation';
import { listerMotsPreparation } from '../api/fn/preparations-resource/lister-mots-preparation';
import { reglerPreparation } from '../api/fn/preparations-resource/regler-preparation';
import { retablirMotPreparation } from '../api/fn/preparations-resource/retablir-mot-preparation';
import { retirerMotPreparation } from '../api/fn/preparations-resource/retirer-mot-preparation';
import { creerTheme } from '../api/fn/themes-resource/creer-theme';
import { listerThemes } from '../api/fn/themes-resource/lister-themes';
import { renommerTheme } from '../api/fn/themes-resource/renommer-theme';
import { supprimerTheme } from '../api/fn/themes-resource/supprimer-theme';
import { AlbumDto } from '../api/models/album-dto';
import { ModuleDto } from '../api/models/module-dto';
import { MotPreparationDto } from '../api/models/mot-preparation-dto';
import { PreparationDto } from '../api/models/preparation-dto';
import { ThemeDto } from '../api/models/theme-dto';
import { BandeauAnnuler } from '../commun/bandeau-annuler/bandeau-annuler';
import { BandeauErreur } from '../commun/bandeau-erreur/bandeau-erreur';
import { ChampThemes, themesParNom } from '../commun/champ-themes/champ-themes';
import { CompteCourant } from '../commun/compte-courant';
import { DialogueConfirmation } from '../commun/dialogue-confirmation/dialogue-confirmation';
import {
  codeErreur,
  erreurPassagere,
  MESSAGES_PAR_CODE,
  messageErreur,
} from '../commun/erreurs/message-erreur';
import { RepereSection } from '../commun/repere-section/repere-section';
import { Squelette } from '../commun/squelette/squelette';
import { CarteMot } from './carte-mot';
import { ChampNomModule } from './champ-nom-module';
import { ouvrirDialogueCorrigerAlbum } from './corriger-album-dialogue';
import { libelleMots } from './preparations';
import { SaisieRapide } from './saisie-rapide';
import { ouvrirDialogueTeleverserImage } from './televerser-image-dialogue';
import {
  ChangementTheme,
  ouvrirDialogueThemeMot,
  phraseSuppressionTheme,
} from './theme-mot-dialogue';

/**
 * « 1 déjà illustré », « 3 déjà illustrés » ; à zéro, l'accord suit le nombre de Mots : « 1 mot, 0 déjà illustré »,
 * « 2 mots, 0 déjà illustrés ».
 */
export function libelleIllustres(nombre: number, nombreMots: number = nombre): string {
  const accord = nombre === 0 ? nombreMots : nombre;
  return `${nombre} déjà illustré${accord === 1 ? '' : 's'}`;
}

/** Borne haute du Temps passé, en heures (le back refuse au-delà de 6 000 minutes). */
export const TEMPS_PASSE_MAXIMUM_HEURES = 100;

export const MESSAGE_TEMPS_PASSE_INVALIDE = MESSAGES_PAR_CODE['preparation.temps_passe_invalide'];

/**
 * Temps passé saisi en heures (« 3,5 » ou « 3.5 »), converti en minutes : `null` pour un champ vide, `undefined` pour
 * une saisie invalide (pas un nombre, hors de 0 à 100, ou pas un multiple d'une demi-heure).
 */
export function heuresEnMinutes(saisie: string): number | null | undefined {
  const texte = saisie.trim().replace(',', '.');
  if (texte === '') {
    return null;
  }
  if (!/^\d+(\.\d+)?$/.test(texte)) {
    return undefined;
  }
  const demiHeures = Number(texte) * 2;
  if (!Number.isInteger(demiHeures) || demiHeures > TEMPS_PASSE_MAXIMUM_HEURES * 2) {
    return undefined;
  }
  return demiHeures * 30;
}

/** Minutes affichées en heures, avec la virgule : 210 → « 3,5 », 60 → « 1 », absent → « ». */
export function minutesEnHeures(minutes: number | null | undefined): string {
  return minutes === null || minutes === undefined
    ? ''
    : String(Number((minutes / 60).toFixed(2))).replace('.', ',');
}

function heuresValides(controle: AbstractControl<string>): ValidationErrors | null {
  return heuresEnMinutes(controle.value) === undefined ? { heures: true } : null;
}

/** Valeur de l'option « Nouveau module » de la liste Module, distincte de tout Module. */
const OPTION_NOUVEAU_MODULE = Symbol('nouveau-module');
type ValeurModule = string | null | typeof OPTION_NOUVEAU_MODULE;

/** Champ en ligne du nom d'un Module : création, ou renommage de `module`. */
interface SaisieModule {
  readonly module?: ModuleDto;
}

interface ErreurAffichee {
  readonly message: string;
  readonly reessayer: () => void;
}

/** Mots dont l'ajout a échoué (autrement que par un doublon), et le message du dernier échec. */
interface EchecAjout {
  readonly saisies: readonly string[];
  readonly message: string;
}

/** « « citrouille » n'a pas été ajouté. », « « a », « b » n'ont pas été ajoutés. », suivi du message de l'échec. */
export function messageEchecAjout(echec: EchecAjout): string {
  const mots = echec.saisies.map((saisie) => `« ${saisie} »`).join(', ');
  const verbe = echec.saisies.length === 1 ? "n'a pas été ajouté" : "n'ont pas été ajoutés";
  return `${mots} ${verbe}. ${echec.message}`;
}

/**
 * Refus d'un Mot déjà présent, qui le nomme : l'enseignant peut déjà taper le Mot suivant quand il s'affiche.
 * « Ce mot est déjà dans la préparation : « citrouille ». »
 */
export function messageMotDejaPresent(saisie: string): string {
  const message = MESSAGES_PAR_CODE['preparation.mot_deja_present'].replace(/\.$/, '');
  return `${message} : « ${saisie} ».`;
}

/** Mots dont le retrait a échoué, revenus à leur place, et le message du dernier échec. */
interface EchecRetrait {
  readonly mots: readonly MotPreparationDto[];
  readonly message: string;
}

/** « « renard » n'a pas été retiré. », « « a », « b » n'ont pas été retirés. », suivi du message de l'échec. */
export function messageEchecRetrait(echec: EchecRetrait): string {
  const mots = echec.mots.map((mot) => `« ${mot.forme} »`).join(', ');
  const verbe = echec.mots.length === 1 ? "n'a pas été retiré" : "n'ont pas été retirés";
  return `${mots} ${verbe}. ${echec.message}`;
}

/** Rétablissement d'un Mot retiré qui a échoué ; `reessayable` n'est vrai que pour une erreur réseau ou 5xx. */
interface EchecRetablissement {
  readonly preparationId: string;
  readonly mot: MotPreparationDto;
  readonly message: string;
  readonly reessayable: boolean;
}

/** « « renard » n'a pas été rétabli. », suivi du message de l'échec. */
export function messageEchecRetablissement(echec: EchecRetablissement): string {
  return `« ${echec.mot.forme} » n'a pas été rétabli. ${echec.message}`;
}

/** Mots dans l'ordre de leur place, `mot` inséré à la sienne. */
function inserer(mots: readonly MotPreparationDto[], mot: MotPreparationDto): MotPreparationDto[] {
  return [...mots.filter((autre) => autre.id !== mot.id), mot].sort((a, b) => a.ordre - b.ordre);
}

/** Champ de l'En-tête relu après une suppression : le Module ou le Thème par défaut. */
type Source = 'module' | 'theme';

/**
 * Page d'une Préparation (`/preparations/:id`), réduite pour l'instant à son En-tête (key-preparation.html › `.hero`) :
 * titre de l'Album, Repère de Section, Module, Thème par défaut, « N mots, M déjà illustrés » et Temps passé.
 * La Préparation d'un collègue est introuvable pour le back : son message traduit s'affiche dans le Bandeau d'erreur.
 *
 * Module, Thème par défaut et Temps passé sont modifiables (story 2.2, partie 1) et enregistrés sans bouton : au choix
 * dans une liste, ou à la sortie du champ Temps passé. Chaque enregistrement envoie les trois valeurs affichées, un à
 * la fois. En cas d'échec, la saisie reste affichée et un Bandeau d'erreur propose « Réessayer », qui renvoie les
 * valeurs affichées. Les listes de Modules et de Thèmes se chargent avec la Préparation et ont leur propre Bandeau.
 *
 * Modules (story 2.2, partie 2) : la liste Module, affichée dès que les listes sont chargées, se termine par
 * « Nouveau module », qui déplie à sa place un champ en ligne ; le Module créé s'ajoute à la liste, est choisi, donc
 * enregistré. Le menu « Actions du module », à côté du Module choisi, n'apparaît que pour son créateur et
 * l'administrateur (le back revérifie) : « Renommer » rouvre le même champ prérempli, « Supprimer » passe par le
 * Dialogue de confirmation puis relit la Préparation et les Modules. Après `preparation.module_invalide` (Module
 * supprimé entre-temps par un collègue), les Modules sont relus et le Module disparu retiré du choix.
 *
 * Thèmes (story 2.2, partie 3) : le Thème par défaut est un Champ à étiquettes limité à une étiquette ; choisir un
 * autre Thème la remplace, la retirer laisse la Préparation sans Thème par défaut, chaque changement est enregistré.
 * « Créer le thème « … » » crée un Thème pour toute l'école, aussitôt choisi. Le menu d'une étiquette (son créateur,
 * l'administrateur) propose « Renommer », qui ouvre à la place du champ le même champ en ligne que le Module, et
 * « Supprimer », qui passe par le Dialogue de confirmation puis relit la Préparation et les Thèmes ; un Thème utilisé
 * par des Images est refusé (`theme.utilise`). Après `preparation.theme_introuvable`, les Thèmes sont relus et le
 * Thème disparu retiré du choix.
 *
 * Corriger l'album (story 2.2, partie 4) : l'Album est lu avec les listes. À côté du titre, le menu « Actions de
 * l'album », réservé à son créateur et à l'administrateur (le back revérifie), propose « Corriger l'album », qui ouvre
 * le dialogue de correction ; l'Album corrigé met à jour le titre de l'En-tête et de l'onglet, sans recharger la page.
 * Le focus revient au bouton du menu à la fermeture du dialogue.
 *
 * Mots (story 2.3, partie 1) : sous l'En-tête, le Champ de saisie rapide et la Grille des Mots, chargés avec la
 * Préparation ; le champ prend le focus si la Préparation n'a aucun Mot. Chaque Mot tapé suivi d'Entrée est envoyé dès
 * que le précédent a reçu sa réponse, dans l'ordre de frappe ; la Carte « à illustrer » du Mot ajouté apparaît en fin
 * de Grille sans prendre le focus, et le compteur de l'En-tête suit la Grille. Un Mot déjà présent est refusé sous le
 * champ, où la saisie revient s'il est vide ; tout autre échec ouvre un Bandeau d'erreur qui nomme le Mot, et
 * « Réessayer » le renvoie.
 *
 * Retrait d'un Mot (story 2.3, partie 2) : « Retirer » sur une Carte la fait disparaître aussitôt, sans confirmation,
 * et le compteur suit ; le focus passe au bouton « Retirer » de la Carte suivante, sinon de la précédente, sinon au
 * Champ de saisie rapide. Une fois le retrait enregistré, le Bandeau « Annuler » (8 s) propose de rétablir le Mot, avec
 * le Sens et la place que le back a renvoyés ; le Mot rétabli reprend sa place dans la Grille et son bouton « Retirer »
 * prend le focus. Échec du retrait : la Carte revient à sa place et un Bandeau d'erreur propose « Réessayer ». Échec du
 * rétablissement : Bandeau d'erreur avec « Réessayer », sauf si le Mot est revenu entre-temps (message seul).
 *
 * Thème de chaque Mot (story 2.3, partie 3) : un Mot ajouté prend le Thème par défaut (le back l'applique), et un Mot
 * rétabli le Thème qu'il avait. Le bouton du Thème d'une Carte, affiché une fois les Thèmes chargés, ouvre le Dialogue
 * « Thème de « … » » ; le Mot renvoyé met à jour la Carte et le focus revient au bouton à la fermeture. Un Thème créé,
 * renommé ou supprimé depuis le Dialogue met aussitôt à jour les Thèmes, l'En-tête et les Cartes ; supprimer un Thème
 * depuis l'En-tête le retire aussi des Cartes.
 *
 * Téléverser une image (story 2.5, partie 1) : « Téléverser » d'une Carte « à illustrer » ouvre le Dialogue
 * « Téléverser une image » ; le Mot illustré renvoyé remplace celui de la Carte, qui passe sur une colonne avec sa
 * vignette et son Badge de type, sans recharger la page ; le focus va à son bouton « Retirer ». Le compteur « M déjà
 * illustrés » suit la Grille une fois chargée. Retirer un Mot illustré ne supprime pas son Image : « Annuler » le
 * rétablit avec la même Image.
 *
 * Le Temps passé est un champ texte en mode de saisie décimal plutôt qu'un `type="number"` : celui-ci, selon la langue
 * du navigateur, refuse la virgule sans le dire (sa valeur devient vide, comme un champ effacé).
 */
@Component({
  selector: 'app-preparation',
  imports: [
    BandeauErreur,
    CarteMot,
    ChampNomModule,
    ChampThemes,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    ReactiveFormsModule,
    RepereSection,
    SaisieRapide,
    Squelette,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../commun/page-rubrique.scss', './preparation.scss'],
  template: `
    <div class="page">
      @if (erreur(); as message) {
        <h1 class="cm-visuellement-masque">Préparation</h1>
        <app-bandeau-erreur
          [message]="message"
          (reessayer)="charger(id())"
          (fermer)="erreur.set(null)"
        />
      }

      @if (preparation(); as courante) {
        @if (erreurEnregistrement(); as message) {
          <app-bandeau-erreur
            class="erreur-enregistrement"
            [message]="message"
            (reessayer)="enregistrer()"
            (fermer)="erreurEnregistrement.set(null)"
          />
        }
        @if (erreurModule(); as affichee) {
          <app-bandeau-erreur
            class="erreur-module"
            [message]="affichee.message"
            (reessayer)="affichee.reessayer()"
            (fermer)="erreurModule.set(null)"
          />
        }
        @if (erreurTheme(); as affichee) {
          <app-bandeau-erreur
            class="erreur-theme"
            [message]="affichee.message"
            (reessayer)="affichee.reessayer()"
            (fermer)="erreurTheme.set(null)"
          />
        }
        @if (erreurMots(); as message) {
          <app-bandeau-erreur
            class="erreur-mots"
            [message]="message"
            (reessayer)="chargerMots(courante.id)"
            (fermer)="erreurMots.set(null)"
          />
        }
        @if (echecAjout(); as echec) {
          <app-bandeau-erreur
            class="erreur-ajout"
            [message]="messageEchecAjout(echec)"
            (reessayer)="reessayerAjouts()"
            (fermer)="echecAjout.set(null)"
          />
        }
        @if (echecRetrait(); as echec) {
          <app-bandeau-erreur
            class="erreur-retrait"
            [message]="messageEchecRetrait(echec)"
            (reessayer)="reessayerRetraits()"
            (fermer)="echecRetrait.set(null)"
          />
        }
        @if (echecRetablissement(); as echec) {
          <app-bandeau-erreur
            class="erreur-retablissement"
            [message]="messageEchecRetablissement(echec)"
            [reessayable]="echec.reessayable"
            (reessayer)="reessayerRetablissement(echec)"
            (fermer)="echecRetablissement.set(null)"
          />
        }
        @if (erreurListes(); as message) {
          <app-bandeau-erreur
            class="erreur-listes"
            [message]="message"
            (reessayer)="chargerListes(courante.albumId)"
            (fermer)="erreurListes.set(null)"
          />
        }
        <section class="entete" aria-labelledby="entete-titre">
          <span class="entete__couverture" aria-hidden="true">
            <mat-icon svgIcon="livre" />
          </span>
          <div class="entete__corps">
            <p class="entete__rubrique">Préparation</p>
            <div class="entete__ligne-titre">
              <h1 id="entete-titre" class="entete__titre">{{ courante.titreAlbum }}</h1>
              @if (albumCorrigeable(); as corrigeable) {
                <button
                  #declencheurAlbum
                  matIconButton
                  class="entete__actions-album"
                  type="button"
                  aria-label="Actions de l'album"
                  [matMenuTriggerFor]="menuAlbum"
                >
                  <mat-icon svgIcon="actions" aria-hidden="true" />
                </button>
                <mat-menu #menuAlbum="matMenu">
                  <button mat-menu-item type="button" (click)="corrigerAlbum(corrigeable)">
                    Corriger l'album
                  </button>
                </mat-menu>
              }
            </div>
            <div class="entete__meta">
              <app-repere-section [section]="courante.section" />
              @if (saisieModule(); as saisie) {
                <app-champ-nom-module
                  class="entete__saisie-module"
                  [etiquette]="saisie.module ? 'Nouveau nom du module' : 'Nom du nouveau module'"
                  [libelleValider]="saisie.module ? 'Renommer' : 'Ajouter'"
                  [valeurInitiale]="saisie.module?.nom ?? ''"
                  [enCours]="saisieEnCours()"
                  [erreur]="erreurSaisieModule()"
                  (valider)="validerSaisieModule($event)"
                  (annuler)="fermerSaisieModule()"
                />
              } @else if (listesChargees()) {
                <mat-form-field class="entete__champ entete__module" subscriptSizing="dynamic">
                  <mat-label>Module</mat-label>
                  <mat-select
                    #listeModule
                    [value]="module()"
                    (selectionChange)="choisirModule($event.value)"
                  >
                    <mat-option [value]="null">Aucun module</mat-option>
                    @for (choix of modules(); track choix.id) {
                      <mat-option [value]="choix.id">{{ choix.nom }}</mat-option>
                    }
                    <mat-option class="entete__nouveau-module" [value]="optionNouveauModule">
                      <mat-icon svgIcon="plus" aria-hidden="true" />
                      Nouveau module
                    </mat-option>
                  </mat-select>
                </mat-form-field>
                @if (moduleGerable(); as gere) {
                  <button
                    matIconButton
                    class="entete__actions-module"
                    type="button"
                    aria-label="Actions du module"
                    [disabled]="suppressionEnCours()"
                    [matMenuTriggerFor]="menuModule"
                  >
                    <mat-icon svgIcon="actions" aria-hidden="true" />
                  </button>
                  <mat-menu #menuModule="matMenu">
                    <button mat-menu-item type="button" (click)="ouvrirRenommage(gere)">
                      Renommer
                    </button>
                    <button mat-menu-item type="button" (click)="supprimerModule(gere)">
                      Supprimer
                    </button>
                  </mat-menu>
                }
              } @else if (courante.nomModule) {
                <span class="entete__nom-module">{{ courante.nomModule }}</span>
              }
              @if (themeARenommer(); as aRenommer) {
                <app-champ-nom-module
                  class="entete__saisie-module"
                  etiquette="Nouveau nom du thème"
                  libelleValider="Renommer"
                  [valeurInitiale]="aRenommer.nom"
                  [enCours]="renommageThemeEnCours()"
                  [erreur]="erreurRenommageTheme()"
                  (valider)="validerRenommageTheme($event)"
                  (annuler)="fermerRenommageTheme()"
                />
              } @else if (listesChargees()) {
                <app-champ-themes
                  class="entete__themes"
                  etiquette="Thème par défaut"
                  [themes]="themes()"
                  [choisis]="themesChoisis()"
                  [limite]="1"
                  [gerable]="themeGerable()"
                  [enCours]="creationThemeEnCours()"
                  [erreur]="erreurCreationTheme()"
                  (choisisChange)="choisirTheme($event[0] ?? null)"
                  (creer)="creerTheme($event)"
                  (renommer)="ouvrirRenommageTheme($event)"
                  (supprimer)="supprimerTheme($event)"
                />
              } @else if (courante.nomThemeDefaut) {
                <span class="entete__nom-theme"
                  ><span class="cm-visuellement-masque">Thème par défaut : </span
                  >{{ courante.nomThemeDefaut }}</span
                >
              }
            </div>
            <div class="entete__bas">
              <p class="entete__compteur">
                <strong>{{ libelleMots(nombreMots()) }}</strong
                >,
                {{ libelleIllustres(nombreIllustres(), nombreMots()) }}
              </p>
              <mat-form-field class="entete__champ entete__temps" subscriptSizing="dynamic">
                <mat-label>Temps passé (facultatif)</mat-label>
                <mat-icon matPrefix svgIcon="horloge" aria-hidden="true" />
                <input
                  matInput
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
                  [formControl]="tempsPasse"
                  (blur)="quitterTempsPasse()"
                />
                <span matTextSuffix>h</span>
                @if (tempsPasse.hasError('heures')) {
                  <mat-error>{{ messageTempsInvalide }}</mat-error>
                }
              </mat-form-field>
            </div>
          </div>
        </section>
        @if (mots(); as motsCharges) {
          <app-saisie-rapide
            [focusInitial]="motsCharges.length === 0"
            (ajouter)="ajouterMot($event)"
          />
          @if (motsCharges.length > 0) {
            <section class="mots" aria-labelledby="mots-titre">
              <h2 id="mots-titre" class="mots__titre">Mots de la préparation</h2>
              <ul class="mots__grille">
                @for (mot of motsCharges; track mot.id) {
                  <li class="mots__element" [class.mots__element--a-illustrer]="!mot.illustre">
                    <app-carte-mot
                      [mot]="mot"
                      [theme]="nomTheme(mot)"
                      (retirer)="retirerMot(mot)"
                      (changerTheme)="ouvrirThemeMot(mot)"
                      (televerser)="ouvrirTeleverser(mot)"
                    />
                  </li>
                }
              </ul>
            </section>
          }
        } @else if (!erreurMots()) {
          <app-squelette forme="carte" [nombre]="3" />
        }
        <p class="cm-visuellement-masque" aria-live="polite">{{ annonce() }}</p>
      } @else if (chargementEnCours()) {
        <app-squelette forme="texte" [nombre]="3" />
      }
    </div>
  `,
})
export class Preparation {
  private readonly api = inject(Api);
  private readonly titre = inject(Title);
  private readonly compteCourant = inject(CompteCourant);
  private readonly confirmation = inject(DialogueConfirmation);
  private readonly injecteur = inject(Injector);
  private readonly bandeauAnnuler = inject(BandeauAnnuler);

  /** Identifiant de la Préparation, lu dans l'URL (`withComponentInputBinding`). */
  readonly id = input.required<string>();

  protected readonly libelleMots = libelleMots;
  protected readonly libelleIllustres = libelleIllustres;
  protected readonly messageTempsInvalide = MESSAGE_TEMPS_PASSE_INVALIDE;
  protected readonly optionNouveauModule = OPTION_NOUVEAU_MODULE;
  protected readonly messageEchecAjout = messageEchecAjout;
  protected readonly messageEchecRetrait = messageEchecRetrait;
  protected readonly messageEchecRetablissement = messageEchecRetablissement;

  /** Préparation telle que le back l'a renvoyée en dernier. */
  protected readonly preparation = signal<PreparationDto | null>(null);
  protected readonly chargementEnCours = signal(false);
  protected readonly erreur = signal<string | null>(null);

  /** Valeurs affichées dans l'En-tête, envoyées à chaque enregistrement. */
  protected readonly module = signal<string | null>(null);
  protected readonly theme = signal<string | null>(null);
  protected readonly tempsPasse = new FormControl('', {
    nonNullable: true,
    validators: heuresValides,
  });

  /** Album de la Préparation, lu avec les listes : son créateur décide du menu « Actions de l'album ». */
  protected readonly album = signal<AlbumDto | null>(null);
  protected readonly modules = signal<ModuleDto[]>([]);
  protected readonly themes = signal<ThemeDto[]>([]);
  protected readonly erreurListes = signal<string | null>(null);
  protected readonly erreurEnregistrement = signal<string | null>(null);
  /** Vrai une fois les listes chargées : la liste Module, avec « Nouveau module », s'affiche alors toujours. */
  protected readonly listesChargees = signal(false);

  /** Champ en ligne du nom d'un Module, ouvert à la place de la liste Module. */
  protected readonly saisieModule = signal<SaisieModule | null>(null);
  protected readonly saisieEnCours = signal(false);
  protected readonly erreurSaisieModule = signal<string | null>(null);
  protected readonly suppressionEnCours = signal(false);
  /** Échec d'une suppression de Module, ou de la relecture qui la suit. */
  protected readonly erreurModule = signal<ErreurAffichee | null>(null);
  private readonly listeModule = viewChild<MatSelect>('listeModule');
  private readonly declencheurAlbum = viewChild('declencheurAlbum', {
    read: ElementRef<HTMLButtonElement>,
  });
  private readonly champThemes = viewChild(ChampThemes);

  /** Thème par défaut choisi, en liste pour le Champ à étiquettes (une étiquette au plus). */
  protected readonly themesChoisis = computed(() => {
    const theme = this.theme();
    return theme === null ? [] : [theme];
  });
  protected readonly creationThemeEnCours = signal(false);
  protected readonly erreurCreationTheme = signal<string | null>(null);
  /** Thème en cours de renommage : le champ en ligne remplace le Champ à étiquettes. */
  protected readonly themeARenommer = signal<ThemeDto | null>(null);
  protected readonly renommageThemeEnCours = signal(false);
  protected readonly erreurRenommageTheme = signal<string | null>(null);
  /** Échec d'une suppression de Thème, ou de la relecture qui la suit. */
  protected readonly erreurTheme = signal<ErreurAffichee | null>(null);
  private suppressionThemeEnCours = false;

  /** Le menu d'une étiquette n'est proposé qu'à son créateur et à l'administrateur (le back revérifie). */
  protected readonly themeGerable = computed(() => {
    const compte = this.compteCourant.compte();
    return (theme: ThemeDto) =>
      compte !== null && (compte.administrateur || theme.createurId === compte.id);
  });

  /** Module choisi, si l'enseignant peut le renommer ou le supprimer : son créateur, ou l'administrateur. */
  protected readonly moduleGerable = computed(() => {
    const choisi = this.modules().find((module) => module.id === this.module());
    const compte = this.compteCourant.compte();
    if (choisi === undefined || compte === null) {
      return null;
    }
    return compte.administrateur || choisi.createurId === compte.id ? choisi : null;
  });

  /** Album de la Préparation, si l'enseignant peut le corriger : son créateur, ou l'administrateur. */
  protected readonly albumCorrigeable = computed(() => {
    const album = this.album();
    const compte = this.compteCourant.compte();
    if (album === null || compte === null) {
      return null;
    }
    return compte.administrateur || album.createurId === compte.id ? album : null;
  });

  /** Nom de chaque Thème par identifiant, `null` tant que les Thèmes ne sont pas chargés. */
  private readonly nomsThemes = computed(() =>
    this.listesChargees() ? new Map(this.themes().map((theme) => [theme.id, theme.nom])) : null,
  );

  /** Mots de la Préparation dans l'ordre de saisie ; `null` tant qu'ils ne sont pas chargés. */
  protected readonly mots = signal<MotPreparationDto[] | null>(null);
  protected readonly erreurMots = signal<string | null>(null);
  protected readonly echecAjout = signal<EchecAjout | null>(null);
  /** Dernier Mot ajouté, annoncé aux lecteurs d'écran : le focus reste dans le champ. */
  protected readonly annonce = signal('');
  /** Compteur de l'En-tête : la Grille une fois chargée, sinon le nombre lu avec la Préparation. */
  protected readonly nombreMots = computed(
    () => this.mots()?.length ?? this.preparation()?.nombreMots ?? 0,
  );
  /** Compteur « M déjà illustrés » : la Grille une fois chargée, sinon le nombre lu avec la Préparation. */
  protected readonly nombreIllustres = computed(() => {
    const mots = this.mots();
    return mots === null
      ? (this.preparation()?.nombreIllustres ?? 0)
      : mots.filter((mot) => mot.illustre).length;
  });
  private readonly saisieRapide = viewChild(SaisieRapide);
  private readonly cartesMots = viewChildren(CarteMot);
  protected readonly echecRetrait = signal<EchecRetrait | null>(null);
  protected readonly echecRetablissement = signal<EchecRetablissement | null>(null);
  /** Saisies en attente d'envoi, dans l'ordre de frappe ; envoyées une à une. */
  private fileAjouts: string[] = [];
  private ajoutEnCours = false;

  /** Numéro du dernier chargement : la réponse d'une Préparation quittée depuis n'écrit rien. */
  private dernierChargement = 0;
  /** Vrai pendant un enregistrement : un changement survenu entre-temps est envoyé après lui. */
  private enregistrementEnCours = false;
  private enregistrementEnAttente = false;

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => void this.charger(id));
    });
  }

  async charger(id: string): Promise<void> {
    const numero = ++this.dernierChargement;
    this.chargementEnCours.set(true);
    this.preparation.set(null);
    this.album.set(null);
    this.modules.set([]);
    this.themes.set([]);
    this.erreurListes.set(null);
    this.erreurEnregistrement.set(null);
    this.listesChargees.set(false);
    this.saisieModule.set(null);
    this.erreurSaisieModule.set(null);
    this.erreurModule.set(null);
    this.erreurCreationTheme.set(null);
    this.themeARenommer.set(null);
    this.erreurRenommageTheme.set(null);
    this.erreurTheme.set(null);
    this.enregistrementEnAttente = false;
    this.mots.set(null);
    this.erreurMots.set(null);
    this.echecAjout.set(null);
    this.echecRetrait.set(null);
    this.echecRetablissement.set(null);
    this.annonce.set('');
    this.fileAjouts = [];
    try {
      const preparation = await this.api.invoke(lirePreparation, { id });
      if (numero === this.dernierChargement) {
        this.module.set(preparation.moduleId ?? null);
        this.theme.set(preparation.themeDefautId ?? null);
        this.tempsPasse.reset(minutesEnHeures(preparation.tempsPasseMinutes));
        this.preparation.set(preparation);
        this.erreur.set(null);
        this.titre.setTitle(`${preparation.titreAlbum} · corpus-mots`);
        void this.chargerListes(preparation.albumId);
        void this.chargerMots(preparation.id);
      }
    } catch (erreur) {
      if (numero === this.dernierChargement) {
        this.erreur.set(messageErreur(erreur));
      }
    } finally {
      if (numero === this.dernierChargement) {
        this.chargementEnCours.set(false);
      }
    }
  }

  /** Album, Modules de l'Album et Thèmes ; en échec, leur propre Bandeau d'erreur, l'En-tête reste affiché. */
  async chargerListes(albumId: string): Promise<void> {
    const numero = this.dernierChargement;
    try {
      const [album, modules, themes] = await Promise.all([
        this.api.invoke(lireAlbum, { id: albumId }),
        this.api.invoke(listerModulesDeLAlbum, { id: albumId }),
        this.api.invoke(listerThemes),
      ]);
      if (numero === this.dernierChargement) {
        this.album.set(album);
        this.modules.set(modules);
        this.themes.set(themes);
        this.listesChargees.set(true);
        this.erreurListes.set(null);
      }
    } catch (erreur) {
      if (numero === this.dernierChargement) {
        this.erreurListes.set(messageErreur(erreur));
      }
    }
  }

  /** Mots de la Préparation ; en échec, leur propre Bandeau d'erreur, l'En-tête reste affiché. */
  async chargerMots(id: string): Promise<void> {
    const numero = this.dernierChargement;
    this.erreurMots.set(null);
    try {
      const mots = await this.api.invoke(listerMotsPreparation, { id });
      if (numero === this.dernierChargement) {
        this.mots.set(mots);
      }
    } catch (erreur) {
      if (numero === this.dernierChargement) {
        this.erreurMots.set(messageErreur(erreur));
      }
    }
  }

  /** Entrée dans le Champ de saisie rapide : la saisie attend son tour, derrière les précédentes. */
  protected ajouterMot(saisie: string): void {
    this.fileAjouts.push(saisie);
    void this.envoyerAjouts();
  }

  /** « Réessayer » : les Mots en échec repartent, dans leur ordre, derrière ceux qui attendent déjà. */
  protected reessayerAjouts(): void {
    const echec = this.echecAjout();
    this.echecAjout.set(null);
    if (echec !== null) {
      this.fileAjouts.push(...echec.saisies);
      void this.envoyerAjouts();
    }
  }

  /** Envoie les saisies en attente une à une, chacune après la réponse de la précédente. */
  private async envoyerAjouts(): Promise<void> {
    if (this.ajoutEnCours) {
      return;
    }
    this.ajoutEnCours = true;
    try {
      let saisie = this.fileAjouts.shift();
      while (saisie !== undefined) {
        await this.envoyerAjout(saisie);
        saisie = this.fileAjouts.shift();
      }
    } finally {
      this.ajoutEnCours = false;
    }
  }

  private async envoyerAjout(saisie: string): Promise<void> {
    const preparation = this.preparation();
    if (preparation === null) {
      return;
    }
    const numero = this.dernierChargement;
    try {
      const ajoute = await this.api.invoke(ajouterMotPreparation, {
        id: preparation.id,
        body: { saisie },
      });
      if (numero === this.dernierChargement) {
        this.mots.update((mots) => (mots === null ? mots : [...mots, ajoute]));
        this.annonce.set(`« ${ajoute.forme} » ajouté.`);
      }
    } catch (erreur) {
      if (numero !== this.dernierChargement) {
        return;
      }
      if (codeErreur(erreur) === 'preparation.mot_deja_present') {
        this.saisieRapide()?.refuser(messageMotDejaPresent(saisie), saisie);
        return;
      }
      this.echecAjout.update((echec) => ({
        saisies: [...(echec?.saisies ?? []), saisie],
        message: messageErreur(erreur),
      }));
    }
  }

  /**
   * « Retirer » sur une Carte : elle disparaît aussitôt et le focus passe à la Carte voisine ; le retrait part ensuite.
   */
  protected retirerMot(mot: MotPreparationDto): void {
    const mots = this.mots();
    const preparation = this.preparation();
    const index = mots?.findIndex((autre) => autre.id === mot.id) ?? -1;
    if (mots === null || preparation === null || index < 0) {
      return;
    }
    const restants = mots.filter((autre) => autre.id !== mot.id);
    this.mots.set(restants);
    this.focaliserApresRendu(restants[index] ?? restants[index - 1]);
    void this.envoyerRetrait(preparation.id, mot);
  }

  /** « Réessayer » : les Mots dont le retrait a échoué sont retirés de nouveau. */
  protected reessayerRetraits(): void {
    const echec = this.echecRetrait();
    this.echecRetrait.set(null);
    for (const mot of echec?.mots ?? []) {
      this.retirerMot(mot);
    }
  }

  /** « Réessayer » : le rétablissement repart. */
  protected reessayerRetablissement(echec: EchecRetablissement): void {
    this.echecRetablissement.set(null);
    void this.retablirMot(echec.preparationId, echec.mot, this.dernierChargement);
  }

  /**
   * Retire le Mot ; en cas de succès, le Bandeau « Annuler » propose de le rétablir avec le Sens et la place renvoyés.
   * En échec, la Carte revient à sa place et le Bandeau d'erreur nomme le Mot.
   */
  private async envoyerRetrait(preparationId: string, mot: MotPreparationDto): Promise<void> {
    const numero = this.dernierChargement;
    try {
      const retire = await this.api.invoke(retirerMotPreparation, {
        id: preparationId,
        motPreparationId: mot.id,
      });
      if (numero === this.dernierChargement) {
        this.bandeauAnnuler.afficher(
          `« ${retire.forme} » retiré de la préparation.`,
          () => void this.retablirMot(preparationId, retire, numero),
        );
      }
    } catch (erreur) {
      if (numero !== this.dernierChargement) {
        return;
      }
      this.mots.update((mots) => (mots === null ? mots : inserer(mots, mot)));
      this.echecRetrait.update((echec) => ({
        mots: [...(echec?.mots ?? []), mot],
        message: messageErreur(erreur),
      }));
    }
  }

  /**
   * Rétablit un Mot retiré, avec son Sens, à sa place si elle est libre (sinon le back le met en fin) ; son bouton
   * « Retirer » prend le focus. Le rétablissement est envoyé même si l'enseignant a ouvert une autre Préparation entre-
   * temps, mais il n'écrit alors rien dans la page : `numero` est le chargement où le retrait a réussi.
   */
  private async retablirMot(
    preparationId: string,
    retire: MotPreparationDto,
    numero: number,
  ): Promise<void> {
    try {
      const retabli = await this.api.invoke(retablirMotPreparation, {
        id: preparationId,
        body: {
          motId: retire.motId,
          sensId: retire.sens.id,
          ordre: retire.ordre,
          themeId: retire.themeId ?? null,
          imageId: retire.image?.id ?? null,
        },
      });
      if (numero === this.dernierChargement) {
        this.mots.update((mots) => (mots === null ? mots : inserer(mots, retabli)));
        // L'Image retirée qui n'est plus proposable ou a changé de Sens n'est pas reliée : le Mot revient « à illustrer ».
        this.annonce.set(
          retire.image && !retabli.image
            ? `« ${retabli.forme} » rétabli, sans son image, qui n'est plus disponible.`
            : `« ${retabli.forme} » rétabli.`,
        );
        this.focaliserApresRendu(retabli);
      }
    } catch (erreur) {
      if (numero !== this.dernierChargement) {
        return;
      }
      this.echecRetablissement.set({
        preparationId,
        mot: retire,
        message: messageErreur(erreur),
        // Un refus du back (Mot revenu entre-temps, Sens disparu…) se répéterait : seuls le réseau et les 5xx se
        // réessaient.
        reessayable: erreurPassagere(erreur),
      });
      // Le Bandeau « Annuler » ou « Réessayer », qui avait le focus, a disparu : le focus revient au Champ de saisie.
      if (
        !(document.activeElement instanceof HTMLElement) ||
        document.activeElement === document.body
      ) {
        this.focaliserApresRendu(undefined);
      }
    }
  }

  /**
   * Nom du Thème de `mot` pour sa Carte : `null` sans thème (ou pour un Thème disparu), `undefined` tant que les Thèmes
   * ne sont pas chargés.
   */
  protected nomTheme(mot: MotPreparationDto): string | null | undefined {
    const noms = this.nomsThemes();
    if (noms === null) {
      return undefined;
    }
    return mot.themeId ? (noms.get(mot.themeId) ?? null) : null;
  }

  /**
   * Bouton du Thème d'une Carte : ouvre le Dialogue du Thème ; le Mot renvoyé remplace celui de la Carte. Le focus
   * revient au bouton du Thème à la fermeture.
   */
  protected async ouvrirThemeMot(mot: MotPreparationDto): Promise<void> {
    const preparation = this.preparation();
    if (preparation === null || !this.listesChargees()) {
      return;
    }
    const numero = this.dernierChargement;
    const declencheur = this.cartesMots()
      .find((carte) => carte.mot().id === mot.id)
      ?.elementTheme();
    const change = await ouvrirDialogueThemeMot(
      this.injecteur,
      {
        preparationId: preparation.id,
        mot,
        themes: this.themes(),
        gerable: this.themeGerable(),
        themesModifies: (changement) => {
          if (numero === this.dernierChargement) {
            this.appliquerChangementTheme(changement);
          }
        },
      },
      declencheur,
    );
    if (change === undefined || numero !== this.dernierChargement) {
      return;
    }
    this.mots.update((mots) =>
      mots === null ? mots : mots.map((autre) => (autre.id === change.id ? change : autre)),
    );
  }

  /**
   * « Téléverser » d'une Carte « à illustrer » : ouvre le Dialogue « Téléverser une image » ; le Mot illustré renvoyé
   * remplace celui de la Carte et son bouton « Retirer » prend le focus. Fermé sans enregistrement, le focus revient au
   * bouton « Téléverser ».
   */
  protected async ouvrirTeleverser(mot: MotPreparationDto): Promise<void> {
    const preparation = this.preparation();
    if (preparation === null) {
      return;
    }
    const numero = this.dernierChargement;
    const declencheur = this.cartesMots()
      .find((carte) => carte.mot().id === mot.id)
      ?.elementTeleverser();
    const illustre = await ouvrirDialogueTeleverserImage(
      this.injecteur,
      { preparationId: preparation.id, mot, titreAlbum: preparation.titreAlbum },
      declencheur,
    );
    if (illustre === undefined || numero !== this.dernierChargement) {
      return;
    }
    this.mots.update((mots) =>
      mots === null ? mots : mots.map((autre) => (autre.id === illustre.id ? illustre : autre)),
    );
    this.annonce.set(`Image enregistrée pour « ${illustre.forme} ».`);
    this.focaliserApresRendu(illustre);
  }

  /** Thème créé, renommé ou supprimé depuis le Dialogue du Thème d'un Mot. */
  private appliquerChangementTheme({ type, theme }: ChangementTheme): void {
    if (type === 'cree') {
      this.themes.update((themes) =>
        themes.some((existant) => existant.id === theme.id)
          ? themes
          : themesParNom([...themes, theme]),
      );
    } else if (type === 'renomme') {
      this.themes.update((themes) =>
        themesParNom(themes.map((existant) => (existant.id === theme.id ? theme : existant))),
      );
      this.preparation.update((courante) =>
        courante?.themeDefautId === theme.id
          ? { ...courante, nomThemeDefaut: theme.nom }
          : courante,
      );
    } else {
      this.themes.update((themes) => themes.filter((existant) => existant.id !== theme.id));
      this.retirerThemeDesMots(theme.id);
      if (this.theme() === theme.id) {
        this.theme.set(null);
      }
      this.preparation.update((courante) =>
        courante?.themeDefautId === theme.id
          ? { ...courante, themeDefautId: undefined, nomThemeDefaut: undefined }
          : courante,
      );
    }
  }

  /** Le Thème `themeId` a été supprimé : le back l'a retiré des Mots qui le portaient, les Cartes suivent. */
  private retirerThemeDesMots(themeId: string): void {
    this.mots.update((mots) =>
      mots === null
        ? mots
        : mots.map((mot) => (mot.themeId === themeId ? { ...mot, themeId: null } : mot)),
    );
  }

  /** Après le rendu, focus au bouton « Retirer » de la Carte de `mot`, ou au Champ de saisie rapide sans Carte. */
  private focaliserApresRendu(mot: MotPreparationDto | undefined): void {
    afterNextRender(
      () => {
        const carte =
          mot === undefined
            ? undefined
            : this.cartesMots().find((autre) => autre.mot().id === mot.id);
        if (carte === undefined) {
          this.saisieRapide()?.focus();
        } else {
          carte.focusRetirer();
        }
      },
      { injector: this.injecteur },
    );
  }

  /**
   * « Corriger l'album » : ouvre le dialogue de correction ; l'Album corrigé met à jour le titre de l'En-tête et de
   * l'onglet. Le focus revient au bouton du menu.
   */
  protected async corrigerAlbum(album: AlbumDto): Promise<void> {
    const numero = this.dernierChargement;
    const corrige = await ouvrirDialogueCorrigerAlbum(
      this.injecteur,
      album,
      this.declencheurAlbum()?.nativeElement,
    );
    if (corrige === undefined || numero !== this.dernierChargement) {
      return;
    }
    this.album.set(corrige);
    this.preparation.update((courante) =>
      courante?.albumId === corrige.id ? { ...courante, titreAlbum: corrige.titre } : courante,
    );
    this.titre.setTitle(`${corrige.titre} · corpus-mots`);
  }

  protected choisirModule(valeur: ValeurModule): void {
    if (valeur === OPTION_NOUVEAU_MODULE) {
      this.ouvrirSaisieModule({});
      return;
    }
    this.module.set(valeur);
    void this.enregistrer();
  }

  protected ouvrirRenommage(module: ModuleDto): void {
    this.ouvrirSaisieModule({ module });
  }

  private ouvrirSaisieModule(saisie: SaisieModule): void {
    this.erreurSaisieModule.set(null);
    this.saisieModule.set(saisie);
  }

  /** Replie le champ en ligne sans rien enregistrer ; le focus revient à la liste Module. */
  protected fermerSaisieModule(): void {
    this.saisieModule.set(null);
    this.erreurSaisieModule.set(null);
    this.rendreFocusALaListe();
  }

  private rendreFocusALaListe(): void {
    afterNextRender(() => this.listeModule()?.focus(), { injector: this.injecteur });
  }

  /**
   * Crée le Module nommé `nom`, l'ajoute à la liste, le choisit et l'enregistre ; ou renomme le Module en cours de
   * renommage. En échec, le champ reste ouvert avec sa saisie et affiche le message.
   */
  protected async validerSaisieModule(nom: string): Promise<void> {
    const saisie = this.saisieModule();
    const preparation = this.preparation();
    if (saisie === null || preparation === null || this.saisieEnCours()) {
      return;
    }
    const numero = this.dernierChargement;
    this.saisieEnCours.set(true);
    // Un nouvel échec réaffiche son message, même identique au précédent.
    this.erreurSaisieModule.set(null);
    try {
      if (saisie.module) {
        const renomme = await this.api.invoke(renommerModule, {
          id: saisie.module.id,
          body: { nom },
        });
        if (numero === this.dernierChargement) {
          this.modules.update((modules) =>
            modules.map((module) => (module.id === renomme.id ? renomme : module)),
          );
          this.preparation.update((courante) =>
            courante?.moduleId === renomme.id ? { ...courante, nomModule: renomme.nom } : courante,
          );
          this.fermerSaisieModule();
        }
      } else {
        const cree = await this.api.invoke(creerModule, { id: preparation.albumId, body: { nom } });
        if (numero === this.dernierChargement) {
          this.modules.update((modules) => [...modules, cree]);
          this.module.set(cree.id);
          this.fermerSaisieModule();
          void this.enregistrer();
        }
      }
    } catch (erreur) {
      if (numero === this.dernierChargement) {
        this.erreurSaisieModule.set(messageErreur(erreur));
      }
    } finally {
      this.saisieEnCours.set(false);
    }
  }

  /** « Supprimer » : Dialogue de confirmation, puis suppression et relecture de la Préparation et des Modules. */
  protected async supprimerModule(module: ModuleDto): Promise<void> {
    const confirme = await this.confirmation.confirmer({
      titre: 'Supprimer le module ?',
      phrase:
        `Le module « ${module.nom} » sera retiré de l'album et de toutes les préparations qui l'utilisent, ` +
        'chez tous les enseignants.',
      libelleConfirmer: 'Supprimer le module',
    });
    if (confirme) {
      await this.envoyerSuppression(module);
    }
  }

  private async envoyerSuppression(module: ModuleDto): Promise<void> {
    const numero = this.dernierChargement;
    this.suppressionEnCours.set(true);
    try {
      await this.api.invoke(supprimerModule, { id: module.id });
      if (numero === this.dernierChargement) {
        this.erreurModule.set(null);
        await this.relire('module');
      }
    } catch (erreur) {
      if (numero !== this.dernierChargement) {
        return;
      }
      const code = codeErreur(erreur);
      if (code === 'ressource.introuvable') {
        // Déjà supprimé par un autre : le résultat attendu est là, il suffit de relire.
        this.erreurModule.set(null);
        await this.relire('module');
        return;
      }
      this.erreurModule.set({
        message: messageErreur(erreur),
        // Un refus (403) se répéterait à l'identique : « Réessayer » efface seulement le message.
        reessayer: () =>
          code === 'module.reserve_au_createur'
            ? this.erreurModule.set(null)
            : void this.envoyerSuppression(module),
      });
    } finally {
      this.suppressionEnCours.set(false);
    }
  }

  /**
   * Relit la Préparation et les listes après la suppression d'un Module ou d'un Thème ; seul le champ de cette
   * `source` reprend la valeur relue, les autres valeurs affichées restent. Le focus revient à ce champ.
   */
  private async relire(source: Source): Promise<void> {
    const numero = this.dernierChargement;
    const erreurSource = source === 'module' ? this.erreurModule : this.erreurTheme;
    try {
      const preparation = await this.api.invoke(lirePreparation, { id: this.id() });
      if (numero !== this.dernierChargement) {
        return;
      }
      if (source === 'module') {
        this.module.set(preparation.moduleId ?? null);
      } else {
        this.theme.set(preparation.themeDefautId ?? null);
      }
      this.preparation.set(preparation);
      erreurSource.set(null);
      await this.chargerListes(preparation.albumId);
      if (source === 'module') {
        this.rendreFocusALaListe();
      } else {
        this.rendreFocusAuxThemes();
      }
    } catch (erreur) {
      if (numero === this.dernierChargement) {
        erreurSource.set({
          message: messageErreur(erreur),
          reessayer: () => void this.relire(source),
        });
      }
    }
  }

  protected choisirTheme(themeId: string | null): void {
    this.theme.set(themeId);
    void this.enregistrer();
  }

  private rendreFocusAuxThemes(): void {
    afterNextRender(() => this.champThemes()?.focus(), { injector: this.injecteur });
  }

  /** « Créer le thème « … » » : le Thème créé, visible de toute l'école, est ajouté, choisi et enregistré. */
  protected async creerTheme(nom: string): Promise<void> {
    if (this.creationThemeEnCours()) {
      return;
    }
    const numero = this.dernierChargement;
    this.creationThemeEnCours.set(true);
    // Un nouvel échec réaffiche son message, même identique au précédent.
    this.erreurCreationTheme.set(null);
    try {
      const cree = await this.api.invoke(creerTheme, { body: { nom } });
      if (numero === this.dernierChargement) {
        this.themes.update((themes) => themesParNom([...themes, cree]));
        this.choisirTheme(cree.id);
      }
    } catch (erreur) {
      if (numero === this.dernierChargement) {
        this.erreurCreationTheme.set(messageErreur(erreur));
      }
    } finally {
      this.creationThemeEnCours.set(false);
    }
  }

  protected ouvrirRenommageTheme(theme: ThemeDto): void {
    this.erreurRenommageTheme.set(null);
    this.themeARenommer.set(theme);
  }

  /** Replie le champ en ligne sans rien renommer ; le focus revient au Champ à étiquettes. */
  protected fermerRenommageTheme(): void {
    this.themeARenommer.set(null);
    this.erreurRenommageTheme.set(null);
    this.rendreFocusAuxThemes();
  }

  /** Renomme le Thème ; en échec, le champ reste ouvert avec sa saisie et affiche le message. */
  protected async validerRenommageTheme(nom: string): Promise<void> {
    const theme = this.themeARenommer();
    if (theme === null || this.renommageThemeEnCours()) {
      return;
    }
    const numero = this.dernierChargement;
    this.renommageThemeEnCours.set(true);
    this.erreurRenommageTheme.set(null);
    try {
      const renomme = await this.api.invoke(renommerTheme, { id: theme.id, body: { nom } });
      if (numero === this.dernierChargement) {
        this.themes.update((themes) =>
          themesParNom(themes.map((existant) => (existant.id === renomme.id ? renomme : existant))),
        );
        this.preparation.update((courante) =>
          courante?.themeDefautId === renomme.id
            ? { ...courante, nomThemeDefaut: renomme.nom }
            : courante,
        );
        this.fermerRenommageTheme();
      }
    } catch (erreur) {
      if (numero === this.dernierChargement) {
        this.erreurRenommageTheme.set(messageErreur(erreur));
      }
    } finally {
      this.renommageThemeEnCours.set(false);
    }
  }

  /** « Supprimer » : Dialogue de confirmation, puis suppression et relecture de la Préparation et des Thèmes. */
  protected async supprimerTheme(theme: ThemeDto): Promise<void> {
    const confirme = await this.confirmation.confirmer({
      titre: 'Supprimer le thème ?',
      phrase: phraseSuppressionTheme(theme),
      libelleConfirmer: 'Supprimer le thème',
    });
    if (confirme) {
      await this.envoyerSuppressionTheme(theme);
    }
  }

  private async envoyerSuppressionTheme(theme: ThemeDto): Promise<void> {
    if (this.suppressionThemeEnCours) {
      return;
    }
    const numero = this.dernierChargement;
    this.suppressionThemeEnCours = true;
    try {
      await this.api.invoke(supprimerTheme, { id: theme.id });
      if (numero === this.dernierChargement) {
        this.erreurTheme.set(null);
        this.retirerThemeDesMots(theme.id);
        await this.relire('theme');
      }
    } catch (erreur) {
      if (numero !== this.dernierChargement) {
        return;
      }
      const code = codeErreur(erreur);
      if (code === 'ressource.introuvable') {
        // Déjà supprimé par un autre : le résultat attendu est là, il suffit de relire.
        this.erreurTheme.set(null);
        this.retirerThemeDesMots(theme.id);
        await this.relire('theme');
        return;
      }
      // Un refus (403, Thème utilisé) se répéterait à l'identique : « Réessayer » efface seulement le message.
      const refus = code === 'theme.reserve_au_createur' || code === 'theme.utilise';
      this.erreurTheme.set({
        message: messageErreur(erreur),
        reessayer: () =>
          refus ? this.erreurTheme.set(null) : void this.envoyerSuppressionTheme(theme),
      });
    } finally {
      this.suppressionThemeEnCours = false;
    }
  }

  /** Sortie du champ : une saisie invalide n'est pas envoyée, une valeur inchangée non plus. */
  protected quitterTempsPasse(): void {
    const minutes = heuresEnMinutes(this.tempsPasse.value);
    if (minutes === undefined) {
      return;
    }
    if (
      minutes === (this.preparation()?.tempsPasseMinutes ?? null) &&
      this.erreurEnregistrement() === null
    ) {
      return;
    }
    void this.enregistrer();
  }

  /**
   * Envoie le Module, le Thème par défaut et le Temps passé affichés. Un Temps passé invalide n'est pas envoyé : le
   * dernier enregistré le remplace.
   */
  async enregistrer(): Promise<void> {
    const preparation = this.preparation();
    if (preparation === null) {
      return;
    }
    if (this.enregistrementEnCours) {
      this.enregistrementEnAttente = true;
      return;
    }
    const numero = this.dernierChargement;
    const saisi = heuresEnMinutes(this.tempsPasse.value);
    this.enregistrementEnCours = true;
    try {
      const reglee = await this.api.invoke(reglerPreparation, {
        id: preparation.id,
        body: {
          moduleId: this.module(),
          themeDefautId: this.theme(),
          tempsPasseMinutes: saisi === undefined ? (preparation.tempsPasseMinutes ?? null) : saisi,
        },
      });
      if (numero === this.dernierChargement) {
        this.preparation.set(reglee);
        this.erreurEnregistrement.set(null);
      }
    } catch (erreur) {
      if (numero === this.dernierChargement) {
        this.erreurEnregistrement.set(messageErreur(erreur));
        const code = codeErreur(erreur);
        if (code === 'preparation.module_invalide') {
          void this.retirerModuleDisparu(preparation.albumId, numero);
        } else if (code === 'preparation.theme_introuvable') {
          void this.retirerThemeDisparu(preparation.albumId, numero);
        }
      }
    } finally {
      this.enregistrementEnCours = false;
      // `charger` efface l'attente : celle qui reste vient d'un changement sur la Préparation affichée.
      if (this.enregistrementEnAttente) {
        this.enregistrementEnAttente = false;
        void this.enregistrer();
      }
    }
  }

  /**
   * Après `preparation.module_invalide` : le Module choisi a été supprimé entre-temps. Les Modules sont relus et, s'il
   * n'y figure plus, il n'est plus choisi (« Réessayer » enverra alors « Aucun module »).
   */
  private async retirerModuleDisparu(albumId: string, numero: number): Promise<void> {
    await this.chargerListes(albumId);
    const choisi = this.module();
    if (
      numero === this.dernierChargement &&
      this.listesChargees() &&
      choisi !== null &&
      !this.modules().some((module) => module.id === choisi)
    ) {
      this.module.set(null);
    }
  }

  /**
   * Après `preparation.theme_introuvable` : le Thème choisi a été supprimé entre-temps. Les Thèmes sont relus et, s'il
   * n'y figure plus, il n'est plus choisi (« Réessayer » enverra alors l'absence de Thème par défaut).
   */
  private async retirerThemeDisparu(albumId: string, numero: number): Promise<void> {
    await this.chargerListes(albumId);
    const choisi = this.theme();
    if (
      numero === this.dernierChargement &&
      this.listesChargees() &&
      choisi !== null &&
      !this.themes().some((theme) => theme.id === choisi)
    ) {
      this.theme.set(null);
    }
  }
}
