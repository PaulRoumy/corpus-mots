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
  linkedSignal,
  output,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { debounceTime, distinctUntilChanged, filter, from, map, of, switchMap } from 'rxjs';
import { Api } from '../../api/api';
import { listerModulesDeLAlbum } from '../../api/fn/albums-resource/lister-modules-de-l-album';
import { rechercherAlbums } from '../../api/fn/albums-resource/rechercher-albums';
import { carteIdentiteImage } from '../../api/fn/images-resource/carte-identite-image';
import { classerImage } from '../../api/fn/images-resource/classer-image';
import { fichierImage } from '../../api/fn/images-resource/fichier-image';
import { modifierDescriptionImage } from '../../api/fn/images-resource/modifier-description-image';
import { creerTheme } from '../../api/fn/themes-resource/creer-theme';
import { listerThemes } from '../../api/fn/themes-resource/lister-themes';
import { AlbumDto } from '../../api/models/album-dto';
import { CarteIdentiteImageDto } from '../../api/models/carte-identite-image-dto';
import { ClassementImageDto } from '../../api/models/classement-image-dto';
import { DescriptionImageDto } from '../../api/models/description-image-dto';
import { ThemeDto } from '../../api/models/theme-dto';
import {
  DELAI_RECHERCHE_ALBUMS_MS,
  LONGUEUR_MIN_RECHERCHE,
  MESSAGE_AUCUN_ALBUM,
} from '../../preparations/recherche-albums';
import { Annuaire } from '../annuaire';
import { BadgeTypeImage } from '../badge-type-image/badge-type-image';
import { BandeauErreur } from '../bandeau-erreur/bandeau-erreur';
import { ChampThemes, themesParNom } from '../champ-themes/champ-themes';
import { CompteCourant } from '../compte-courant';
import { DialogueConfirmation } from '../dialogue-confirmation/dialogue-confirmation';
import { erreurPassagere, MESSAGES_PAR_CODE, messageErreur } from '../erreurs/message-erreur';
import { ChargementImage, ImageSecurisee } from '../image-securisee/image-securisee';
import {
  Licence,
  LIBELLES_LICENCE,
  LIBELLES_TYPE_IMAGE,
  LICENCES_CHOISIES,
  LICENCES_IMPOSEES,
  LicenceChoisie,
  TYPES_IMAGE,
  TypeImage,
} from '../libelles-images';
import {
  LIBELLES_SECTION,
  RepereSection,
  Section,
  SECTIONS,
} from '../repere-section/repere-section';
import { Squelette } from '../squelette/squelette';

/** Valeur affichée d'un champ vide. */
export const CHAMP_VIDE = '—';

/** Propriétaire absent de l'annuaire (compte supprimé). */
export const PROPRIETAIRE_INCONNU = "un ancien membre de l'équipe";

/** Texte du Dialogue de confirmation avant de passer une Image en image d'album. */
export const CONFIRMATION_IMAGE_ALBUM = {
  titre: "Réduire l'image à 400 × 400 px ?",
  phrase: 'Cette réduction est définitive.',
  libelleConfirmer: 'Réduire',
} as const;

/** Sous un champ dont l'enregistrement a échoué ; le message traduit est dans le Bandeau d'erreur. */
export const MESSAGE_NON_ENREGISTRE = 'Non enregistré';

/** Nombre de suggestions d'Albums demandées. */
const NOMBRE_SUGGESTIONS = 20;

interface ErreurAffichee {
  readonly message: string;
  readonly reessayable: boolean;
}

/** Choix « Aucun module » de la liste des Modules. */
export const LIBELLE_AUCUN_MODULE = 'Aucun module';

/** Champ de la description (`PUT /images/{id}/description`). */
type ChampDescription = 'type' | 'source' | 'licence' | 'auteur' | 'album';
/** Champ du classement (`PUT /images/{id}/classement`). */
type ChampClassement = 'sections' | 'module' | 'themes';
/** Champ modifiable de la Carte d'identité. */
type Champ = ChampDescription | ChampClassement;

const CHAMPS_CLASSEMENT: ReadonlySet<Champ> = new Set<Champ>(['sections', 'module', 'themes']);

/** Album choisi (d'origine ou du Module) : celui de la Carte, ou une suggestion de la recherche. */
interface AlbumChoisi {
  readonly id: string;
  readonly titre: string;
  readonly auteur?: string;
}

/** Module proposé dans la liste des Modules d'un Album. */
interface ModuleChoix {
  readonly id: string;
  readonly nom: string;
}

/** Modification prête à partir : sa requête, puis la reprise de la Carte renvoyée dans les champs. */
interface Modification {
  readonly envoyer: () => Promise<CarteIdentiteImageDto>;
  readonly reprendre: (maj: CarteIdentiteImageDto) => void;
}

/**
 * Recherche d'Album par titre pendant la frappe dans `controle` (réglages de `recherche-albums.ts`) : suggestions,
 * « Aucun album trouvé », et message d'échec propre à cette recherche. À créer dans un contexte d'injection.
 */
class RechercheAlbums {
  readonly suggestions = signal<AlbumDto[]>([]);
  /** Vrai quand la dernière recherche lancée (2 caractères au moins) n'a rien trouvé. */
  readonly aucunAlbum = signal(false);
  /** Message de l'échec de la dernière recherche, effacé par la recherche réussie suivante. */
  readonly erreur = signal<string | null>(null);

  constructor(
    private readonly controle: FormControl<string | AlbumChoisi>,
    private readonly api: Api,
  ) {
    controle.valueChanges
      .pipe(
        map((valeur) => (typeof valeur === 'string' ? valeur.trim() : null)),
        filter((texte) => texte !== null),
        debounceTime(DELAI_RECHERCHE_ALBUMS_MS),
        distinctUntilChanged(),
        switchMap((texte) =>
          texte.length < LONGUEUR_MIN_RECHERCHE ? of(null) : from(this.chercher(texte)),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((albums) => {
        this.suggestions.set(albums ?? []);
        this.aucunAlbum.set(albums !== null && albums.length === 0);
      });
  }

  /** « Réessayer » du Bandeau de la recherche : relance la recherche du texte tapé et rouvre les suggestions. */
  async relancer(declencheur: MatAutocompleteTrigger | undefined): Promise<void> {
    const saisie = this.controle.value;
    if (typeof saisie !== 'string' || saisie.trim().length < LONGUEUR_MIN_RECHERCHE) {
      this.erreur.set(null);
      return;
    }
    const albums = await this.chercher(saisie.trim());
    if (albums !== null) {
      this.suggestions.set(albums);
      this.aucunAlbum.set(albums.length === 0);
      declencheur?.openPanel();
    }
  }

  /** Albums trouvés pour `texte`, ou `null` en échec (message dans `erreur`). */
  private async chercher(texte: string): Promise<AlbumDto[] | null> {
    try {
      const page = await this.api.invoke(rechercherAlbums, {
        recherche: texte,
        taille: NOMBRE_SUGGESTIONS,
      });
      this.erreur.set(null);
      return page.elements;
    } catch (erreur) {
      this.erreur.set(messageErreur(erreur));
      return null;
    }
  }
}

/** Album choisi dans les suggestions (un texte tapé sans choix ne suffit pas). */
function albumChoisi(controle: AbstractControl<string | AlbumChoisi>): ValidationErrors | null {
  return typeof controle.value === 'object' && controle.value !== null
    ? null
    : { albumRequis: true };
}

/** Licence de la Carte, si elle se choisit dans le Sélecteur ; `null` sinon. */
function licenceChoisie(licence: Licence | null | undefined): LicenceChoisie | null {
  return LICENCES_CHOISIES.find((choix) => choix.valeur === licence)?.valeur ?? null;
}

/** Texte rogné, `null` s'il est vide. */
function texte(saisie: string): string | null {
  const rogne = saisie.trim();
  return rogne === '' ? null : rogne;
}

/**
 * Panneau Carte d'identité d'une Image (story 2.6, partie 1 ; key-banque.html › `.cid`, `dl.ro`), en lecture seule
 * pour tous. `aside` nommé « Carte d'identité » : titre, bouton « Fermer », grande vignette (`?taille=grande`, chargée
 * en `blob`), Badge de type d'image, « basse résolution » pour une image d'album, « lecture seule » pour un
 * non-propriétaire, « à compléter » pour une image libre sans source ou sans licence ; puis les douze champs dans
 * l'ordre du Glossaire : Mot (cursive), Sens, catégorie, Sections, album d'origine (titre puis auteur), Module,
 * Thèmes, type, source, licence, auteur, propriétaire. Un champ vide affiche « — ». Les Sections s'affichent en
 * Repères de Section, le Module en « Module 1 · *Roule galette* », les Thèmes par nom. Un Sens « à compléter » est mis
 * en avant par la couleur, l'icône crayon et le libellé.
 *
 * Le propriétaire est lu dans l'Annuaire, suivi de « (vous) » pour l'enseignant connecté ; absent de l'annuaire
 * chargé, il devient « un ancien membre de l'équipe ».
 *
 * La Carte est lue par `GET /images/{id}` à chaque nouvel `imageId` : squelette pendant la lecture, puis le panneau
 * prend le focus. En échec, le message traduit s'affiche dans un Bandeau d'erreur du panneau, avec « Réessayer » pour
 * une erreur réseau ou serveur. « Fermer » et Échap émettent `fermer` ; la page rend le focus à la vignette.
 *
 * Propriétaire (story 2.6, partie 2 ; key-banque.html › section 1) : type, Album d'origine (image d'album seulement),
 * source, licence et auteur deviennent des champs Material, les autres restent en lecture. Chaque champ est enregistré
 * par `PUT /images/{id}/description` dès qu'il est quitté (saisie quittée, choix fait dans une liste), sans bouton ;
 * rien n'est envoyé si rien n'a changé. La licence suit le type, comme au téléversement (`libelles-images.ts`). Choisir
 * « image d'album » fait apparaître le champ Album (recherche d'Album de `recherche-albums.ts`) : rien n'est envoyé
 * sans Album (« Album d'origine requis »), puis le Dialogue de confirmation demande la réduction à 400 × 400 px ;
 * « Annuler » remet le type précédent. En échec, la saisie reste, le champ est signalé et un Bandeau d'erreur s'affiche
 * dans le panneau. Chaque Carte renvoyée est passée à `appliquer`, même après la fermeture du panneau.
 *
 * Classement du propriétaire (story 2.6, partie 3), enregistré par `PUT /images/{id}/classement` à chaque changement :
 * Sections en puces à cocher (Repère de Section : forme, couleur, libellé) ; Module choisi en cherchant un Album (au
 * départ celui du Module, ou l'Album d'origine d'une image d'album sans Module), puis dans « Aucun module » et les
 * Modules de cet Album ; Thèmes dans le Champ à étiquettes, « Créer le thème « … » » créant le Thème pour toute l'école
 * avant de l'ajouter. Les Thèmes de l'école sont lus à la première entrée dans le Champ, les Modules d'un Album au
 * choix de l'Album (ou à la première entrée dans la liste). Même file d'enregistrement et mêmes échecs que la
 * description : la valeur choisie reste, le champ est signalé, Bandeau d'erreur dans le panneau.
 */
@Component({
  selector: 'app-carte-identite',
  imports: [
    BadgeTypeImage,
    BandeauErreur,
    ChampThemes,
    ImageSecurisee,
    MatAutocompleteModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    NgTemplateOutlet,
    ReactiveFormsModule,
    RepereSection,
    Squelette,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './carte-identite.scss',
  host: {
    '(keydown.escape)': 'fermerParEchap($event)',
    '(focusout)': 'quitterPanneau($event)',
  },
  template: `
    <aside #panneau class="carte-identite" tabindex="-1" aria-labelledby="carte-identite-titre">
      <div class="carte-identite__entete">
        <h2 id="carte-identite-titre" class="carte-identite__titre">Carte d'identité</h2>
        <button
          matIconButton
          class="carte-identite__fermer"
          type="button"
          aria-label="Fermer"
          (click)="fermer.emit()"
        >
          <mat-icon svgIcon="fermer" aria-hidden="true" />
        </button>
      </div>
      @if (carte(); as carte) {
        <div class="carte-identite__vignette">
          @if (echecVignette()) {
            <mat-icon class="carte-identite__repli" svgIcon="image" aria-hidden="true" />
            <span class="cm-visuellement-masque">{{ alternative() }}</span>
          } @else if (chargerVignette(); as charger) {
            <img
              class="carte-identite__image"
              [appImageSecurisee]="charger"
              [alt]="alternative()"
              (echec)="echecVignette.set(true)"
            />
          }
        </div>
        <div class="carte-identite__reperes">
          <app-badge-type-image [type]="carte.typeImage" />
          @if (carte.typeImage === 'image_album') {
            <span class="carte-identite__repere carte-identite__basse-resolution"
              >basse résolution</span
            >
          }
          @if (lectureSeule()) {
            <span class="carte-identite__repere carte-identite__lecture-seule">lecture seule</span>
          }
          @if (carte.aCompleter) {
            <span class="carte-identite__a-completer carte-identite__image-a-completer">
              <mat-icon svgIcon="crayon" aria-hidden="true" />
              à compléter
            </span>
          }
        </div>
        @if (modifiable()) {
          @if (erreurEnregistrement(); as affichee) {
            <app-bandeau-erreur
              class="carte-identite__erreur"
              [message]="affichee.message"
              [reessayable]="affichee.reessayable"
              (reessayer)="reessayerEnregistrement()"
              (fermer)="erreurEnregistrement.set(null)"
            />
          }
          <div class="carte-identite__formulaire">
            <dl class="carte-identite__champs">
              <ng-container *ngTemplateOutlet="debutChamps; context: { $implicit: carte }" />
              <dt id="carte-identite-sections">Sections</dt>
              <dd>
                <mat-chip-listbox
                  class="carte-identite__sections-choix"
                  aria-labelledby="carte-identite-sections"
                  [multiple]="true"
                  [value]="sections()"
                  (change)="changerSections($event.value)"
                >
                  @for (section of toutesSections; track section) {
                    <mat-chip-option
                      class="carte-identite__section carte-identite__section--{{ section }}"
                      [value]="section"
                    >
                      <span
                        class="forme-section forme-section--{{ section }}"
                        aria-hidden="true"
                      ></span>
                      <span class="cm-visuellement-masque">Section </span
                      >{{ libellesSection[section] }}
                    </mat-chip-option>
                  }
                </mat-chip-listbox>
                @if (champEnErreur() === 'sections') {
                  <span class="carte-identite__non-enregistre">{{ messageNonEnregistre }}</span>
                }
              </dd>
            </dl>
            @if (typeChoisi() === 'image_album') {
              @if (rechercheOrigine.erreur(); as message) {
                <app-bandeau-erreur
                  class="carte-identite__erreur carte-identite__erreur-recherche"
                  [message]="message"
                  (reessayer)="rechercheOrigine.relancer(declencheurOrigine)"
                  (fermer)="rechercheOrigine.erreur.set(null)"
                />
              }
              <mat-form-field class="carte-identite__champ" subscriptSizing="dynamic">
                <mat-label>Album d'origine</mat-label>
                <mat-icon matPrefix svgIcon="recherche" aria-hidden="true" />
                <input
                  matInput
                  class="carte-identite__album-saisie"
                  type="text"
                  autocomplete="off"
                  required
                  #declencheurOrigine="matAutocompleteTrigger"
                  [formControl]="album"
                  [matAutocomplete]="suggestionsAlbums"
                  (blur)="quitterAlbum()"
                />
                @if (album.hasError('albumRequis') && album.touched) {
                  <mat-error>{{ messageAlbumRequis }}</mat-error>
                } @else if (album.hasError('enregistrement')) {
                  <mat-error>{{ messageNonEnregistre }}</mat-error>
                } @else if (auteurAlbum(); as auteur) {
                  <mat-hint class="carte-identite__album-auteur">{{ auteur }}</mat-hint>
                } @else {
                  <mat-hint>Tapez au moins 2 lettres du titre</mat-hint>
                }
                <mat-autocomplete
                  #suggestionsAlbums="matAutocomplete"
                  [displayWith]="titreAlbum"
                  (optionSelected)="choisirAlbum()"
                >
                  @for (suggestion of rechercheOrigine.suggestions(); track suggestion.id) {
                    <mat-option [value]="suggestion">{{ suggestion.titre }}</mat-option>
                  }
                  @if (rechercheOrigine.aucunAlbum()) {
                    <mat-option disabled>{{ messageAucunAlbum }}</mat-option>
                  }
                </mat-autocomplete>
              </mat-form-field>
            }
            <dl class="carte-identite__champs">
              <dt>Module</dt>
              <dd>
                <ng-container *ngTemplateOutlet="moduleAffiche; context: { $implicit: carte }" />
              </dd>
            </dl>
            <div class="carte-identite__module" (focusin)="chargerModules()">
              @if (rechercheModule.erreur(); as message) {
                <app-bandeau-erreur
                  class="carte-identite__erreur carte-identite__erreur-recherche-module"
                  [message]="message"
                  (reessayer)="rechercheModule.relancer(declencheurModule)"
                  (fermer)="rechercheModule.erreur.set(null)"
                />
              }
              @if (erreurModules(); as message) {
                <app-bandeau-erreur
                  class="carte-identite__erreur carte-identite__erreur-modules"
                  [message]="message"
                  (reessayer)="relancerModules()"
                  (fermer)="erreurModules.set(null)"
                />
              }
              <mat-form-field class="carte-identite__champ" subscriptSizing="dynamic">
                <mat-label>Album du module</mat-label>
                <mat-icon matPrefix svgIcon="recherche" aria-hidden="true" />
                <input
                  matInput
                  class="carte-identite__album-module"
                  type="text"
                  autocomplete="off"
                  #declencheurModule="matAutocompleteTrigger"
                  [formControl]="albumModule"
                  [matAutocomplete]="suggestionsAlbumsModule"
                />
                <mat-hint>Tapez au moins 2 lettres du titre</mat-hint>
                <mat-autocomplete
                  #suggestionsAlbumsModule="matAutocomplete"
                  [displayWith]="titreAlbum"
                  (optionSelected)="choisirAlbumModule()"
                >
                  @for (suggestion of rechercheModule.suggestions(); track suggestion.id) {
                    <mat-option [value]="suggestion">{{ suggestion.titre }}</mat-option>
                  }
                  @if (rechercheModule.aucunAlbum()) {
                    <mat-option disabled>{{ messageAucunAlbum }}</mat-option>
                  }
                </mat-autocomplete>
              </mat-form-field>
              @if (albumDuModule() !== null) {
                <mat-form-field class="carte-identite__champ" subscriptSizing="dynamic">
                  <mat-label>Module de cet album</mat-label>
                  <mat-select
                    class="carte-identite__module-choix"
                    [formControl]="module"
                    (selectionChange)="enregistrer('module')"
                  >
                    <mat-option [value]="null">{{ libelleAucunModule }}</mat-option>
                    @for (choix of modulesAlbum(); track choix.id) {
                      <mat-option [value]="choix.id">{{ choix.nom }}</mat-option>
                    }
                  </mat-select>
                  @if (module.hasError('enregistrement')) {
                    <mat-error>{{ messageNonEnregistre }}</mat-error>
                  }
                </mat-form-field>
              }
            </div>
            <div class="carte-identite__champ carte-identite__themes" (focusin)="chargerThemes()">
              <app-champ-themes
                etiquette="Thèmes"
                [themes]="themesProposes()"
                [choisis]="themesChoisis()"
                [enCours]="creationThemeEnCours()"
                [erreur]="erreurThemes()"
                (choisisChange)="choisirThemes($event)"
                (creer)="creerTheme($event)"
              />
              @if (champEnErreur() === 'themes') {
                <span class="carte-identite__non-enregistre">{{ messageNonEnregistre }}</span>
              }
            </div>
            <mat-form-field class="carte-identite__champ" subscriptSizing="dynamic">
              <mat-label>Type d'image</mat-label>
              <mat-select
                class="carte-identite__type"
                [formControl]="typeImage"
                (selectionChange)="changerType($event.value)"
              >
                @for (valeur of types; track valeur) {
                  <mat-option [value]="valeur">{{ libellesTypes[valeur] }}</mat-option>
                }
              </mat-select>
              @if (typeImage.hasError('enregistrement')) {
                <mat-error>{{ messageNonEnregistre }}</mat-error>
              }
            </mat-form-field>
            <mat-form-field class="carte-identite__champ" subscriptSizing="dynamic">
              <mat-label>Source</mat-label>
              <input
                matInput
                class="carte-identite__source"
                autocomplete="off"
                maxlength="500"
                [formControl]="source"
                (blur)="enregistrer('source')"
              />
              @if (source.hasError('enregistrement')) {
                <mat-error>{{ messageNonEnregistre }}</mat-error>
              }
            </mat-form-field>
            @if (licenceImposee(); as imposee) {
              <mat-form-field class="carte-identite__champ" subscriptSizing="dynamic">
                <mat-label>Licence</mat-label>
                <input
                  matInput
                  class="carte-identite__licence-imposee"
                  readonly
                  [value]="imposee"
                />
              </mat-form-field>
            } @else {
              <mat-form-field class="carte-identite__champ" subscriptSizing="dynamic">
                <mat-label>Licence</mat-label>
                <mat-select
                  class="carte-identite__licence"
                  [formControl]="licence"
                  (selectionChange)="enregistrer('licence')"
                >
                  <mat-option [value]="null">Non renseignée</mat-option>
                  @for (choix of licences; track choix.valeur) {
                    <mat-option [value]="choix.valeur">
                      {{ choix.libelle }}
                      @if (!choix.partageable) {
                        <span class="carte-identite__non-partageable">· non partageable</span>
                      }
                    </mat-option>
                  }
                </mat-select>
                @if (licence.hasError('enregistrement')) {
                  <mat-error>{{ messageNonEnregistre }}</mat-error>
                }
              </mat-form-field>
            }
            <mat-form-field class="carte-identite__champ" subscriptSizing="dynamic">
              <mat-label>Auteur</mat-label>
              <input
                matInput
                class="carte-identite__auteur"
                autocomplete="off"
                maxlength="500"
                [formControl]="auteur"
                (blur)="enregistrer('auteur')"
              />
              @if (auteur.hasError('enregistrement')) {
                <mat-error>{{ messageNonEnregistre }}</mat-error>
              }
            </mat-form-field>
            <dl class="carte-identite__champs">
              <dt>Propriétaire</dt>
              <dd class="carte-identite__proprietaire">{{ proprietaire() }}</dd>
            </dl>
          </div>
        } @else {
          <dl class="carte-identite__champs">
            <ng-container *ngTemplateOutlet="debutChamps; context: { $implicit: carte }" />
            <dt>Sections</dt>
            <dd>
              @if (carte.sections.length > 0) {
                <span class="carte-identite__sections">
                  @for (section of carte.sections; track section) {
                    <app-repere-section [section]="section" />
                  }
                </span>
              } @else {
                {{ vide }}
              }
            </dd>
            <dt>Album d'origine</dt>
            <dd>
              @if (carte.albumOrigine; as album) {
                <span class="carte-identite__album">
                  <span>{{ album.titre }}</span
                  ><span class="cm-visuellement-masque">, </span>
                  <span class="carte-identite__album-auteur">{{ album.auteur }}</span>
                </span>
              } @else {
                {{ vide }}
              }
            </dd>
            <dt>Module</dt>
            <dd>
              <ng-container *ngTemplateOutlet="moduleAffiche; context: { $implicit: carte }" />
            </dd>
            <dt>Thèmes</dt>
            <dd class="carte-identite__themes-lus">{{ nomsThemes() || vide }}</dd>
            <dt>Type</dt>
            <dd>{{ libellesTypes[carte.typeImage] }}</dd>
            <dt>Source</dt>
            <dd>{{ carte.source || vide }}</dd>
            <dt>Licence</dt>
            <dd>{{ carte.licence ? libellesLicences[carte.licence] : vide }}</dd>
            <dt>Auteur</dt>
            <dd>{{ carte.auteur || vide }}</dd>
            <dt>Propriétaire</dt>
            <dd class="carte-identite__proprietaire">{{ proprietaire() }}</dd>
          </dl>
        }
      } @else if (erreur(); as affichee) {
        <app-bandeau-erreur
          class="carte-identite__erreur"
          [message]="affichee.message"
          [reessayable]="affichee.reessayable"
          (reessayer)="lire(imageId())"
          (fermer)="fermer.emit()"
        />
      } @else {
        <app-squelette class="carte-identite__squelette" forme="texte" [nombre]="6" />
      }
    </aside>
    <ng-template #debutChamps let-carte>
      <dt>Mot</dt>
      <dd>
        <span class="carte-identite__mot">{{ carte.forme }}</span>
      </dd>
      <dt>Sens</dt>
      <dd>
        @if (carte.sens.aCompleter) {
          <span class="carte-identite__a-completer carte-identite__sens-a-completer">
            <mat-icon svgIcon="crayon" aria-hidden="true" />
            à compléter
          </span>
        } @else {
          {{ carte.sens.libelle }}
        }
      </dd>
      <dt>Catégorie</dt>
      <dd>{{ carte.sens.categorie || vide }}</dd>
    </ng-template>
    <ng-template #moduleAffiche let-carte>
      @if (carte.module; as module) {
        <span class="carte-identite__module-lu"
          >{{ module.nom }} · <cite class="carte-identite__titre-album">{{ module.titreAlbum }}</cite></span
        >
      } @else {
        {{ vide }}
      }
    </ng-template>
  `,
})
export class CarteIdentite {
  /** Image dont la Carte d'identité est affichée ; en changer relit la Carte. */
  readonly imageId = input.required<string>();
  readonly fermer = output<void>();
  /**
   * Reçoit la Carte d'identité renvoyée par chaque modification enregistrée, pour que la page la reporte sur ses
   * Cartes de Mot ; appelée même si le panneau a été fermé ou remplacé pendant la requête.
   */
  readonly appliquer = input<(carte: CarteIdentiteImageDto) => void>();

  private readonly api = inject(Api);
  private readonly annuaire = inject(Annuaire);
  private readonly compteCourant = inject(CompteCourant);
  private readonly confirmation = inject(DialogueConfirmation);
  private readonly injecteur = inject(Injector);

  protected readonly vide = CHAMP_VIDE;
  protected readonly libellesTypes = LIBELLES_TYPE_IMAGE;
  protected readonly libellesLicences = LIBELLES_LICENCE;
  protected readonly types = TYPES_IMAGE;
  protected readonly licences = LICENCES_CHOISIES;
  protected readonly messageAlbumRequis = MESSAGES_PAR_CODE['image.album_requis'];
  protected readonly messageAucunAlbum = MESSAGE_AUCUN_ALBUM;
  protected readonly messageNonEnregistre = MESSAGE_NON_ENREGISTRE;

  /** Vue du propriétaire : type, Album d'origine, source, licence et auteur modifiables. */
  protected readonly typeImage = new FormControl<TypeImage>('inconnu', { nonNullable: true });
  /** Type choisi dans le champ, qui peut précéder l'enregistrement (image d'album en attente de son Album). */
  protected readonly typeChoisi = signal<TypeImage>('inconnu');
  protected readonly licence = new FormControl<LicenceChoisie | null>(null);
  protected readonly source = new FormControl('', { nonNullable: true });
  protected readonly auteur = new FormControl('', { nonNullable: true });
  /** Texte tapé, ou l'Album choisi (celui de la Carte ou une suggestion). */
  protected readonly album = new FormControl<string | AlbumChoisi>('', {
    nonNullable: true,
    validators: albumChoisi,
  });
  /** Album choisi, pour son auteur affiché sous le champ. */
  private readonly albumAffiche = signal<string | AlbumChoisi>('');
  protected readonly rechercheOrigine = new RechercheAlbums(this.album, this.api);
  protected readonly erreurEnregistrement = signal<ErreurAffichee | null>(null);
  /** Champ dont le dernier enregistrement a échoué, signalé jusqu'au prochain enregistrement réussi. */
  protected readonly champEnErreur = signal<Champ | null>(null);

  /** Classement du propriétaire : Sections cochées, Module choisi, Thèmes choisis. */
  protected readonly toutesSections = SECTIONS;
  protected readonly libellesSection = LIBELLES_SECTION;
  protected readonly libelleAucunModule = LIBELLE_AUCUN_MODULE;
  protected readonly sections = signal<Section[]>([]);
  protected readonly module = new FormControl<string | null>(null);
  /** Album dont les Modules sont proposés : texte tapé, ou l'Album choisi. */
  protected readonly albumModule = new FormControl<string | AlbumChoisi>('', { nonNullable: true });
  protected readonly rechercheModule = new RechercheAlbums(this.albumModule, this.api);
  /** Album choisi dont les Modules sont proposés, `null` tant qu'aucun n'est choisi. */
  protected readonly albumDuModule = signal<AlbumChoisi | null>(null);
  /** Modules de `albumDuModule`, au départ le seul Module de la Carte s'il est de cet Album. */
  protected readonly modulesAlbum = signal<readonly ModuleChoix[]>([]);
  /** Album dont les Modules ont été demandés, pour ne pas les redemander. */
  private modulesDemandesPour: string | null = null;
  protected readonly themesChoisis = signal<string[]>([]);
  /** Thèmes de l'école, lus à la première entrée dans le Champ à étiquettes. */
  private readonly themesEcole = signal<ThemeDto[] | null>(null);
  private lectureThemes: Promise<void> | null = null;
  protected readonly creationThemeEnCours = signal(false);
  /** Échec de la lecture des Thèmes de l'école ou de la création d'un Thème, sous le Champ à étiquettes. */
  protected readonly erreurThemes = signal<string | null>(null);
  /** Échec de la lecture des Modules de l'Album choisi, dans son propre Bandeau (« Réessayer » les relit). */
  protected readonly erreurModules = signal<string | null>(null);

  private readonly selecteurs = viewChildren(MatSelect);
  private readonly declencheurs = viewChildren(MatAutocompleteTrigger);
  private readonly champThemes = viewChild(ChampThemes);

  protected readonly carte = signal<CarteIdentiteImageDto | null>(null);
  protected readonly erreur = signal<ErreurAffichee | null>(null);

  private readonly panneau = viewChild.required<ElementRef<HTMLElement>>('panneau');

  /** Grande taille de l'Image, d'identité stable tant que l'Image affichée ne change pas. */
  private readonly idAffiche = computed(() => this.carte()?.id ?? null);
  protected readonly chargerVignette = computed<ChargementImage | null>(() => {
    const id = this.idAffiche();
    return id === null ? null : () => this.api.invoke(fichierImage, { id, taille: 'grande' });
  });
  protected readonly echecVignette = linkedSignal({
    source: this.idAffiche,
    computation: () => false,
  });

  /** Alternative de la vignette : « citrouille, légume ». */
  protected readonly alternative = computed(() => {
    const carte = this.carte();
    return carte === null ? '' : `${carte.forme}, ${carte.sens.libelle}`;
  });

  /** Vue modifiable : l'enseignant connecté est le propriétaire de l'Image (l'administrateur ne l'est pas). */
  protected readonly modifiable = computed(() => {
    const carte = this.carte();
    const compte = this.compteCourant.compte();
    return carte !== null && compte !== null && compte.id === carte.proprietaireId;
  });

  /** Licence imposée par le type choisi (photo personnelle, image d'album), sinon `null`. */
  protected readonly licenceImposee = computed(() => LICENCES_IMPOSEES[this.typeChoisi()] ?? null);

  /** Auteur de l'Album d'origine choisi, sous le champ. */
  protected readonly auteurAlbum = computed(() => {
    const album = this.albumAffiche();
    return typeof album === 'object' ? (album.auteur ?? null) : null;
  });

  protected readonly titreAlbum = (valeur: string | AlbumChoisi | null): string =>
    typeof valeur === 'string' ? valeur : (valeur?.titre ?? '');

  /** Thèmes de la Carte, par nom, séparés par des virgules ; vide sans Thème. */
  protected readonly nomsThemes = computed(() =>
    (this.carte()?.themes ?? []).map((theme) => theme.nom).join(', '),
  );

  /** Thèmes proposés dans le Champ à étiquettes : ceux de l'école, et ceux de la Carte avant leur lecture. */
  protected readonly themesProposes = computed<readonly ThemeDto[]>(() => {
    const ecole = this.themesEcole() ?? [];
    const connus = new Set(ecole.map((theme) => theme.id));
    const deLaCarte = (this.carte()?.themes ?? []).filter((theme) => !connus.has(theme.id));
    return deLaCarte.length === 0 ? ecole : themesParNom([...ecole, ...deLaCarte]);
  });

  /** « lecture seule » pour un non-propriétaire, une fois le compte connu. */
  protected readonly lectureSeule = computed(() => {
    const carte = this.carte();
    const compte = this.compteCourant.compte();
    return carte !== null && compte !== null && compte.id !== carte.proprietaireId;
  });

  /** Nom affiché du propriétaire, « (vous) » pour l'enseignant connecté. */
  protected readonly proprietaire = computed(() => {
    const carte = this.carte();
    if (carte === null) {
      return CHAMP_VIDE;
    }
    const compte = this.compteCourant.compte();
    const moi = compte !== null && compte.id === carte.proprietaireId;
    const nom =
      this.annuaire.enseignant(carte.proprietaireId)?.nomAffiche ??
      (moi ? compte.nomAffiche : null);
    if (nom !== null) {
      return moi ? `${nom} (vous)` : nom;
    }
    return this.annuaire.etat().statut === 'charge' ? PROPRIETAIRE_INCONNU : CHAMP_VIDE;
  });

  /** Numéro de la dernière lecture : la réponse d'une Image remplacée depuis n'écrit rien. */
  private derniereLecture = 0;

  /** Enregistrements en file : un seul à la fois, chacun comparé à la Carte renvoyée par le précédent. */
  private fileEnregistrements: Promise<void> = Promise.resolve();

  constructor() {
    void this.annuaire.charger();
    this.album.valueChanges.pipe(takeUntilDestroyed()).subscribe((valeur) => {
      this.albumAffiche.set(valeur);
    });
    // Un nouveau texte tapé masque la liste des Modules, jusqu'au choix d'un autre Album.
    this.albumModule.valueChanges.pipe(takeUntilDestroyed()).subscribe((valeur) => {
      if (typeof valeur === 'string') {
        this.albumDuModule.set(null);
      }
    });
    effect(() => {
      const id = this.imageId();
      untracked(() => {
        void this.lire(id);
        afterNextRender(() => this.focus(), { injector: this.injecteur });
      });
    });
  }

  /** Donne le focus au panneau. */
  focus(): void {
    this.panneau().nativeElement.focus();
  }

  protected async lire(id: string): Promise<void> {
    const numero = ++this.derniereLecture;
    this.carte.set(null);
    this.erreur.set(null);
    try {
      const carte = await this.api.invoke(carteIdentiteImage, { id });
      if (numero === this.derniereLecture) {
        this.carte.set(carte);
        this.remplir(carte);
      }
    } catch (erreur) {
      if (numero === this.derniereLecture) {
        this.erreur.set({ message: messageErreur(erreur), reessayable: erreurPassagere(erreur) });
      }
    }
  }

  protected fermerParEchap(evenement: Event): void {
    evenement.stopPropagation();
    // Échap ferme d'abord la liste ouverte d'un champ, pas le panneau.
    if (
      this.selecteurs().some((selecteur) => selecteur.panelOpen) ||
      this.champThemes()?.listeOuverte()
    ) {
      return;
    }
    const declencheur = this.declencheurs().find((candidat) => candidat.panelOpen);
    if (declencheur !== undefined) {
      declencheur.closePanel();
      return;
    }
    // Le champ texte quitté par Échap ne reçoit pas de blur : sa saisie est enregistrée avant la fermeture.
    const champ = this.champTexteModifie();
    if (champ !== null) {
      void this.enregistrer(champ);
    }
    this.fermer.emit();
  }

  /** Source ou Auteur dont la saisie diffère de la Carte enregistrée, sinon `null`. */
  private champTexteModifie(): 'source' | 'auteur' | null {
    const carte = this.carte();
    if (carte === null || !this.modifiable()) {
      return null;
    }
    if (texte(this.source.value) !== (carte.source ?? null)) {
      return 'source';
    }
    return texte(this.auteur.value) !== (carte.auteur ?? null) ? 'auteur' : null;
  }

  /** Remplit les champs modifiables avec la Carte lue, sans erreur signalée. */
  private remplir(carte: CarteIdentiteImageDto): void {
    this.typeImage.setValue(carte.typeImage);
    this.typeChoisi.set(carte.typeImage);
    this.licence.setValue(licenceChoisie(carte.licence));
    this.source.setValue(carte.source ?? '');
    this.auteur.setValue(carte.auteur ?? '');
    this.album.setValue(carte.albumOrigine ?? '', { emitEvent: false });
    this.albumAffiche.set(carte.albumOrigine ?? '');
    this.sections.set([...carte.sections]);
    this.module.setValue(carte.module?.id ?? null);
    this.themesChoisis.set(carte.themes.map((theme) => theme.id));
    // La recherche du Module part de l'Album du Module, sinon de l'Album d'origine d'une image d'album.
    const albumDepart: AlbumChoisi | null = carte.module
      ? { id: carte.module.albumId, titre: carte.module.titreAlbum }
      : (carte.albumOrigine ?? null);
    this.albumModule.setValue(albumDepart ?? '', { emitEvent: false });
    this.albumDuModule.set(albumDepart);
    this.modulesAlbum.set(carte.module ? [{ id: carte.module.id, nom: carte.module.nom }] : []);
    this.modulesDemandesPour = null;
    for (const controle of [
      this.typeImage,
      this.licence,
      this.source,
      this.auteur,
      this.album,
      this.module,
      this.albumModule,
    ]) {
      controle.markAsUntouched();
    }
    this.champEnErreur.set(null);
    this.erreurEnregistrement.set(null);
    this.rechercheOrigine.erreur.set(null);
    this.rechercheModule.erreur.set(null);
    this.erreurModules.set(null);
    this.erreurThemes.set(null);
  }

  /**
   * Type choisi : enregistré aussitôt, sauf le passage en image d'album, qui attend son Album d'origine (le champ
   * apparaît) puis la confirmation de la réduction.
   */
  protected changerType(type: TypeImage): void {
    this.typeChoisi.set(type);
    if (type === 'image_album' && this.carte()?.typeImage !== 'image_album') {
      this.album.setValue('');
      this.album.markAsUntouched();
      return;
    }
    void this.enregistrer('type');
  }

  /**
   * Album choisi dans les suggestions : enregistré ; pour un passage en image d'album, après confirmation de la
   * réduction. « Annuler » remet le type enregistré, sans requête.
   */
  protected async choisirAlbum(): Promise<void> {
    const carte = this.carte();
    if (carte === null) {
      return;
    }
    if (this.typeChoisi() === 'image_album' && carte.typeImage !== 'image_album') {
      const reduire = await this.confirmation.confirmer(CONFIRMATION_IMAGE_ALBUM);
      if (this.carte() !== carte) {
        return;
      }
      if (!reduire) {
        this.typeImage.setValue(carte.typeImage);
        this.typeChoisi.set(carte.typeImage);
        this.album.setValue('', { emitEvent: false });
        this.albumAffiche.set('');
        // Source ou Auteur quittés pendant l'attente de l'Album n'avaient pas pu partir.
        const champ = this.champTexteModifie();
        if (champ !== null) {
          await this.enregistrer(champ);
        }
        return;
      }
    }
    await this.enregistrer('album');
  }

  /** Sortie du champ Album sans Album choisi : « Album d'origine requis », rien n'est envoyé. */
  protected quitterAlbum(): void {
    this.album.markAsTouched();
  }

  /** Sortie du panneau avec une image d'album sans Album choisi : l'erreur s'affiche sous le champ. */
  protected quitterPanneau(evenement: FocusEvent): void {
    const vers = evenement.relatedTarget;
    if (vers instanceof Node && this.panneau().nativeElement.contains(vers)) {
      return;
    }
    if (this.typeChoisi() === 'image_album' && typeof this.album.value === 'string') {
      this.album.markAsTouched();
    }
  }

  /** Puce de Section cochée ou décochée : enregistrée aussitôt. */
  protected changerSections(valeur: Section[] | Section | null): void {
    const choisies = new Set(Array.isArray(valeur) ? valeur : valeur === null ? [] : [valeur]);
    this.sections.set(SECTIONS.filter((section) => choisies.has(section)));
    void this.enregistrer('sections');
  }

  /** Album choisi pour le Module : ses Modules sont proposés dans la liste. */
  protected choisirAlbumModule(): void {
    const album = this.albumModule.value;
    if (typeof album !== 'object') {
      return;
    }
    this.albumDuModule.set(album);
    const carte = this.carte();
    this.modulesAlbum.set(
      carte?.module?.albumId === album.id ? [{ id: carte.module.id, nom: carte.module.nom }] : [],
    );
    this.modulesDemandesPour = null;
    void this.chargerModules();
  }

  /** Modules de l'Album choisi pour le Module, demandés une seule fois par Album. */
  protected async chargerModules(): Promise<void> {
    const album = this.albumDuModule();
    if (album === null || this.modulesDemandesPour === album.id) {
      return;
    }
    this.modulesDemandesPour = album.id;
    try {
      const modules = await this.api.invoke(listerModulesDeLAlbum, { id: album.id });
      if (this.albumDuModule()?.id === album.id) {
        this.modulesAlbum.set(modules.map((module) => ({ id: module.id, nom: module.nom })));
        this.erreurModules.set(null);
      }
    } catch (erreur) {
      if (this.albumDuModule()?.id === album.id) {
        // Redemandés par « Réessayer » ou à la prochaine entrée dans la zone du Module.
        this.modulesDemandesPour = null;
        this.erreurModules.set(messageErreur(erreur));
      }
    }
  }

  /**
   * « Réessayer » du Bandeau des Modules : les relit. L'échec a déjà oublié la demande ; si le clic, entrée dans la
   * zone, l'a déjà relancée, aucune seconde demande ne part.
   */
  protected relancerModules(): void {
    void this.chargerModules();
  }

  /** Thèmes de l'école, lus une seule fois ; un échec est affiché sous le Champ et relu à la prochaine entrée. */
  protected chargerThemes(): void {
    if (this.themesEcole() !== null || this.lectureThemes !== null) {
      return;
    }
    this.lectureThemes = (async () => {
      try {
        this.themesEcole.set(themesParNom(await this.api.invoke(listerThemes)));
      } catch (erreur) {
        this.erreurThemes.set(messageErreur(erreur));
      } finally {
        this.lectureThemes = null;
      }
    })();
  }

  /** Thèmes ajoutés ou retirés dans le Champ à étiquettes : enregistrés aussitôt. */
  protected choisirThemes(ids: string[]): void {
    this.themesChoisis.set(ids);
    void this.enregistrer('themes');
  }

  /** « Créer le thème « … » » : le Thème créé, visible de toute l'école, est ajouté à l'Image et enregistré. */
  protected async creerTheme(nom: string): Promise<void> {
    if (this.creationThemeEnCours()) {
      return;
    }
    const numero = this.derniereLecture;
    this.creationThemeEnCours.set(true);
    // Un nouvel échec réaffiche son message, même identique au précédent.
    this.erreurThemes.set(null);
    try {
      const cree = await this.api.invoke(creerTheme, { body: { nom } });
      this.themesEcole.update((themes) =>
        themes === null ? null : themesParNom([...themes, cree]),
      );
      if (numero === this.derniereLecture) {
        this.choisirThemes([...this.themesChoisis(), cree.id]);
      }
    } catch (erreur) {
      if (numero === this.derniereLecture) {
        this.erreurThemes.set(messageErreur(erreur));
      }
    } finally {
      this.creationThemeEnCours.set(false);
    }
  }

  protected reessayerEnregistrement(): void {
    void this.enregistrer(this.champEnErreur() ?? 'type');
  }

  /**
   * Enregistre la description ou le classement, selon `champ`, s'il diffère de la Carte enregistrée ; rien n'est
   * envoyé sinon, ni pour une description d'image d'album sans Album choisi. En échec, la saisie reste, le champ
   * `champ` est signalé et un Bandeau d'erreur s'affiche dans le panneau.
   */
  protected enregistrer(champ: Champ): Promise<void> {
    this.fileEnregistrements = this.fileEnregistrements.then(() => this.envoyer(champ));
    return this.fileEnregistrements;
  }

  private async envoyer(champ: Champ): Promise<void> {
    const carte = this.carte();
    if (carte === null || !this.modifiable()) {
      return;
    }
    const modification = CHAMPS_CLASSEMENT.has(champ)
      ? this.modificationClassement(carte)
      : this.modificationDescription(carte);
    if (modification === null) {
      return;
    }
    const numero = this.derniereLecture;
    try {
      const maj = await modification.envoyer();
      // La page reçoit la Carte même si le panneau a été fermé ou remplacé entre-temps.
      this.appliquer()?.(maj);
      if (numero !== this.derniereLecture) {
        return;
      }
      this.carte.set(maj);
      modification.reprendre(maj);
      this.effacerErreur();
    } catch (erreur) {
      if (numero !== this.derniereLecture) {
        return;
      }
      this.effacerErreur();
      this.champEnErreur.set(champ);
      const controle = this.controle(champ);
      controle?.setErrors({ enregistrement: true });
      controle?.markAsTouched();
      this.erreurEnregistrement.set({
        message: messageErreur(erreur),
        reessayable: erreurPassagere(erreur),
      });
    }
  }

  /** Description saisie à envoyer, ou `null` si elle ne change rien ou attend l'Album d'une image d'album. */
  private modificationDescription(carte: CarteIdentiteImageDto): Modification | null {
    const description = this.description();
    if (description === null || identique(description, carte)) {
      return null;
    }
    return {
      envoyer: () =>
        this.api.invoke(modifierDescriptionImage, { id: carte.id, body: description }),
      reprendre: (maj) => this.reprendre(maj, description),
    };
  }

  /** Classement choisi à envoyer, ou `null` s'il ne change rien. Les choix restent tels quels après l'envoi. */
  private modificationClassement(carte: CarteIdentiteImageDto): Modification | null {
    const classement = this.classement();
    if (classementIdentique(classement, carte)) {
      return null;
    }
    return {
      envoyer: () => this.api.invoke(classerImage, { id: carte.id, body: classement }),
      reprendre: () => undefined,
    };
  }

  /** Description saisie, ou `null` pour une image d'album sans Album choisi (« Album d'origine requis »). */
  private description(): DescriptionImageDto | null {
    const type = this.typeImage.value;
    const album = this.album.value;
    if (type === 'image_album' && typeof album === 'string') {
      this.album.markAsTouched();
      return null;
    }
    return {
      typeImage: type,
      licence: LICENCES_IMPOSEES[type] === undefined ? this.licence.value : null,
      source: texte(this.source.value),
      auteur: texte(this.auteur.value),
      albumId: type === 'image_album' && typeof album === 'object' ? album.id : undefined,
    };
  }

  /** Classement choisi : Sections dans l'ordre PS, MS, GS, Module, Thèmes sans doublon. */
  private classement(): ClassementImageDto {
    const choisies = new Set(this.sections());
    return {
      sections: SECTIONS.filter((section) => choisies.has(section)),
      moduleId: this.module.value ?? null,
      themeIds: [...new Set(this.themesChoisis())],
    };
  }

  /**
   * Reprend dans les champs la Carte renvoyée (licence imposée ou effacée, textes rognés), sauf ceux que
   * l'enseignant a changés depuis l'envoi.
   */
  private reprendre(maj: CarteIdentiteImageDto, envoyee: DescriptionImageDto): void {
    if (this.typeImage.value === envoyee.typeImage) {
      this.typeChoisi.set(maj.typeImage);
    }
    if (
      LICENCES_IMPOSEES[envoyee.typeImage] !== undefined ||
      this.licence.value === (envoyee.licence ?? null)
    ) {
      this.licence.setValue(licenceChoisie(maj.licence));
    }
    if (texte(this.source.value) === (envoyee.source ?? null)) {
      this.source.setValue(maj.source ?? '');
    }
    if (texte(this.auteur.value) === (envoyee.auteur ?? null)) {
      this.auteur.setValue(maj.auteur ?? '');
    }
  }

  private effacerErreur(): void {
    const champ = this.champEnErreur();
    if (champ !== null) {
      const controle = this.controle(champ);
      controle?.setErrors(null);
      controle?.updateValueAndValidity({ emitEvent: false });
    }
    this.champEnErreur.set(null);
    this.erreurEnregistrement.set(null);
  }

  /** Contrôle de formulaire du champ, `null` pour les Sections et les Thèmes (signalés par `champEnErreur`). */
  private controle(champ: Champ): AbstractControl | null {
    switch (champ) {
      case 'type':
        return this.typeImage;
      case 'licence':
        return this.licence;
      case 'source':
        return this.source;
      case 'auteur':
        return this.auteur;
      case 'album':
        return this.album;
      case 'module':
        return this.module;
      case 'sections':
      case 'themes':
        return null;
    }
  }
}

/** Vrai si la description ne change rien à la Carte enregistrée. */
function identique(description: DescriptionImageDto, carte: CarteIdentiteImageDto): boolean {
  const imposee = LICENCES_IMPOSEES[description.typeImage] !== undefined;
  const album = description.typeImage === 'image_album';
  return (
    description.typeImage === carte.typeImage &&
    (imposee || (description.licence ?? null) === (carte.licence ?? null)) &&
    (description.source ?? null) === (carte.source ?? null) &&
    (description.auteur ?? null) === (carte.auteur ?? null) &&
    (!album || description.albumId === carte.albumOrigine?.id)
  );
}

/** Vrai si le classement ne change rien à la Carte enregistrée (Sections dans l'ordre PS, MS, GS des deux côtés). */
function classementIdentique(
  classement: ClassementImageDto,
  carte: CarteIdentiteImageDto,
): boolean {
  const themes = new Set(carte.themes.map((theme) => theme.id));
  return (
    classement.sections.join(',') === carte.sections.join(',') &&
    (classement.moduleId ?? null) === (carte.module?.id ?? null) &&
    classement.themeIds.length === themes.size &&
    classement.themeIds.every((id) => themes.has(id))
  );
}
