import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  from,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { Api } from '../api/api';
import { creerAlbum } from '../api/fn/albums-resource/creer-album';
import { creerModule } from '../api/fn/albums-resource/creer-module';
import { listerModulesDeLAlbum } from '../api/fn/albums-resource/lister-modules-de-l-album';
import { listerTitresProches } from '../api/fn/albums-resource/lister-titres-proches';
import { rechercherAlbums } from '../api/fn/albums-resource/rechercher-albums';
import { creerPreparation } from '../api/fn/preparations-resource/creer-preparation';
import { lireDerniereSection } from '../api/fn/preparations-resource/lire-derniere-section';
import { creerTheme } from '../api/fn/themes-resource/creer-theme';
import { listerThemes } from '../api/fn/themes-resource/lister-themes';
import { AlbumDto } from '../api/models/album-dto';
import { ModuleDto } from '../api/models/module-dto';
import { PreparationDto } from '../api/models/preparation-dto';
import { ThemeDto } from '../api/models/theme-dto';
import { BandeauErreur } from '../commun/bandeau-erreur/bandeau-erreur';
import { ChampThemes } from '../commun/champ-themes/champ-themes';
import { codeErreur, messageErreur } from '../commun/erreurs/message-erreur';
import { LIBELLES_SECTION, Section, SECTIONS } from '../commun/repere-section/repere-section';
import { ChampNomModule } from './champ-nom-module';
import {
  DELAI_RECHERCHE_ALBUMS_MS,
  LONGUEUR_MIN_RECHERCHE,
  MESSAGE_AUCUN_ALBUM,
} from './recherche-albums';

export { DELAI_RECHERCHE_ALBUMS_MS, LONGUEUR_MIN_RECHERCHE, MESSAGE_AUCUN_ALBUM };

/** Longueur maximale du titre, de l'auteur et de l'éditeur d'un Album (le back applique la même). */
export const LONGUEUR_MAX_CHAMP_ALBUM = 200;

/** Nombre de suggestions d'Albums demandées. */
const NOMBRE_SUGGESTIONS = 20;

/** « 0 modules », « 1 module », « 3 modules ». */
export function libelleModules(nombre: number): string {
  return `${nombre} module${nombre === 1 ? '' : 's'}`;
}

interface ErreurAffichee {
  message: string;
  reessayer: () => void;
}

/** Valeur de l'option « Créer l'album « … » » de l'autocomplete, distincte de tout Album. */
const OPTION_CREER_ALBUM = Symbol('creer-album');
type ValeurOption = AlbumDto | typeof OPTION_CREER_ALBUM;

/** Valeur de l'option « Nouveau module » de la liste Module, distincte de tout Module. */
const OPTION_NOUVEAU_MODULE = Symbol('nouveau-module');
type ValeurModule = string | null | typeof OPTION_NOUVEAU_MODULE;

/**
 * Dialogue « Nouvelle préparation » (UJ-1, key-accueil.html › 4) : Album cherché pendant la frappe (à partir de
 * 2 caractères, « n modules » à droite de chaque suggestion, puis « Créer l'album « … » »), Section (PS, MS, GS,
 * préremplie avec celle de la dernière Préparation), Module (dès que les Modules de l'Album choisi sont chargés) et
 * Thème par défaut (Champ à étiquettes, dès que les Thèmes sont chargés), tous deux facultatifs. « Créer » reste désactivé tant qu'Album
 * et Section manquent ; il crée la Préparation et ferme le dialogue avec elle.
 *
 * « Créer l'album » déplie sur place le volet de création (pas de dialogue sur un dialogue) : Titre, Auteur, Éditeur,
 * et les Albums au titre proche, que l'enseignant peut choisir à la place. L'Album créé est aussitôt choisi.
 *
 * « Nouveau module », dernière option de la liste Module, déplie à sa place le champ « Nom du nouveau module » ; le
 * Module créé en fin d'Album est aussitôt choisi, et une erreur de création s'affiche dans ce champ. Ni renommage ni
 * suppression ici : ils se font depuis l'En-tête de la Préparation.
 *
 * Le Thème par défaut porte une étiquette au plus : choisir un autre Thème la remplace. « Créer le thème « … » » crée
 * un Thème pour toute l'école, aussitôt choisi ; une erreur de création s'affiche sous le champ. Comme pour les
 * Modules, ni renommage ni suppression ici (pas de dialogue sur un dialogue) : aucun menu d'étiquette.
 *
 * Chaque source (recherche, Modules, Thèmes, création de Préparation, titres proches, création d'Album) a son propre
 * Bandeau d'erreur et son « Réessayer » ; un succès n'efface que l'erreur de sa source.
 */
@Component({
  selector: 'app-nouvelle-preparation',
  imports: [
    BandeauErreur,
    ChampNomModule,
    ChampThemes,
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './nouvelle-preparation-dialogue.scss',
  template: `
    <h2 mat-dialog-title>Nouvelle préparation</h2>
    <mat-dialog-content class="nouvelle-preparation">
      @for (source of erreursDuDialogue(); track source.nom) {
        <app-bandeau-erreur
          [class]="'nouvelle-preparation__erreur--' + source.nom"
          [message]="source.erreur.message"
          (reessayer)="source.erreur.reessayer()"
          (fermer)="source.effacer()"
        />
      }

      @if (voletOuvert()) {
        <section class="nouvelle-preparation__volet" aria-labelledby="nouvelle-preparation-volet">
          <h3 id="nouvelle-preparation-volet" class="nouvelle-preparation__titre-volet">
            Créer l'album
          </h3>
          @if (erreurTitresProches(); as affichee) {
            <app-bandeau-erreur
              class="nouvelle-preparation__erreur--titres-proches"
              [message]="affichee.message"
              (reessayer)="affichee.reessayer()"
              (fermer)="erreurTitresProches.set(null)"
            />
          }
          @if (erreurAlbum(); as affichee) {
            <app-bandeau-erreur
              class="nouvelle-preparation__erreur--album"
              [message]="affichee.message"
              (reessayer)="affichee.reessayer()"
              (fermer)="erreurAlbum.set(null)"
            />
          }
          <mat-form-field class="nouvelle-preparation__champ">
            <mat-label>Titre</mat-label>
            <input
              #champTitre
              matInput
              type="text"
              autocomplete="off"
              [maxlength]="longueurMax"
              [formControl]="titreNouvelAlbum"
            />
          </mat-form-field>
          <mat-form-field class="nouvelle-preparation__champ">
            <mat-label>Auteur</mat-label>
            <input
              matInput
              type="text"
              autocomplete="off"
              [maxlength]="longueurMax"
              [formControl]="auteurNouvelAlbum"
            />
          </mat-form-field>
          <mat-form-field class="nouvelle-preparation__champ">
            <mat-label>Éditeur (facultatif)</mat-label>
            <input
              matInput
              type="text"
              autocomplete="off"
              [maxlength]="longueurMax"
              [formControl]="editeurNouvelAlbum"
            />
          </mat-form-field>

          @if (titresProches().length > 0) {
            <div class="nouvelle-preparation__proches">
              <h4 id="nouvelle-preparation-proches" class="nouvelle-preparation__etiquette">
                Albums au titre proche
              </h4>
              <ul aria-labelledby="nouvelle-preparation-proches">
                @for (proche of titresProches(); track proche.id) {
                  <li class="nouvelle-preparation__proche">
                    <mat-icon svgIcon="livre" aria-hidden="true" />
                    <span class="nouvelle-preparation__titre" [id]="'proche-' + proche.id">
                      {{ proche.titre }}
                      <span class="nouvelle-preparation__auteur">{{ proche.auteur }}</span>
                    </span>
                    <button
                      matButton
                      type="button"
                      [attr.aria-describedby]="'proche-' + proche.id"
                      [disabled]="creationAlbumEnCours()"
                      (click)="choisirAlbumProche(proche)"
                    >
                      Choisir cet album
                    </button>
                  </li>
                }
              </ul>
            </div>
          }

          <div class="nouvelle-preparation__actions-volet">
            <button
              matButton
              type="button"
              [disabled]="creationAlbumEnCours()"
              (click)="fermerVolet()"
            >
              Annuler
            </button>
            <button
              matButton="tonal"
              type="button"
              [disabled]="!albumComplet() || creationAlbumEnCours()"
              (click)="creerAlbum()"
            >
              Créer l'album
            </button>
          </div>
        </section>
      } @else {
        <mat-form-field class="nouvelle-preparation__champ">
          <mat-label>Album</mat-label>
          <mat-icon matPrefix svgIcon="recherche" aria-hidden="true" />
          <input
            #champAlbum
            matInput
            type="text"
            autocomplete="off"
            [formControl]="rechercheAlbum"
            [matAutocomplete]="suggestionsAlbums"
          />
          <mat-hint>Tapez au moins 2 lettres du titre</mat-hint>
          <mat-autocomplete
            #suggestionsAlbums="matAutocomplete"
            [displayWith]="titreAlbum"
            (optionSelected)="choisirOption($event.option.value)"
          >
            @for (suggestion of suggestions(); track suggestion.id) {
              <mat-option [value]="suggestion">
                <span class="nouvelle-preparation__suggestion">
                  <mat-icon svgIcon="livre" aria-hidden="true" />
                  <span class="nouvelle-preparation__titre">{{ suggestion.titre }}</span>
                  <span class="nouvelle-preparation__modules">{{
                    libelleModules(suggestion.nombreModules)
                  }}</span>
                </span>
              </mat-option>
            }
            @if (aucunAlbum()) {
              <mat-option disabled>{{ messageAucunAlbum }}</mat-option>
            }
            @if (texteCherche().length >= longueurMin) {
              <mat-option class="nouvelle-preparation__creer" [value]="optionCreerAlbum">
                <span class="nouvelle-preparation__suggestion">
                  <mat-icon svgIcon="plus" aria-hidden="true" />
                  <span class="nouvelle-preparation__titre"
                    >Créer l'album « {{ texteCherche() }} »</span
                  >
                </span>
              </mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>
      }

      <div class="nouvelle-preparation__groupe">
        <span id="nouvelle-preparation-section" class="nouvelle-preparation__etiquette"
          >Section</span
        >
        <mat-button-toggle-group
          class="nouvelle-preparation__sections"
          aria-labelledby="nouvelle-preparation-section"
          [value]="section()"
          (change)="section.set($event.value)"
        >
          @for (choix of sections; track choix) {
            <mat-button-toggle [value]="choix">
              <span class="nouvelle-preparation__section">
                <span class="forme-section forme-section--{{ choix }}" aria-hidden="true"></span>
                {{ libellesSection[choix] }}
              </span>
            </mat-button-toggle>
          }
        </mat-button-toggle-group>
      </div>

      @if (saisieModuleOuverte()) {
        <app-champ-nom-module
          class="nouvelle-preparation__champ"
          etiquette="Nom du nouveau module"
          libelleValider="Ajouter"
          [enCours]="creationModuleEnCours()"
          [erreur]="erreurCreationModule()"
          (valider)="ajouterModule($event)"
          (annuler)="fermerSaisieModule()"
        />
      } @else if (modulesCharges()) {
        <mat-form-field class="nouvelle-preparation__champ">
          <mat-label>Module (facultatif)</mat-label>
          <mat-select
            #listeModule
            [value]="module()"
            (selectionChange)="choisirModule($event.value)"
          >
            <mat-option [value]="null">Aucun module</mat-option>
            @for (choix of modules(); track choix.id) {
              <mat-option [value]="choix.id">{{ choix.nom }}</mat-option>
            }
            <mat-option class="nouvelle-preparation__creer" [value]="optionNouveauModule">
              <span class="nouvelle-preparation__suggestion">
                <mat-icon svgIcon="plus" aria-hidden="true" />
                <span class="nouvelle-preparation__titre">Nouveau module</span>
              </span>
            </mat-option>
          </mat-select>
        </mat-form-field>
      }

      @if (themesCharges()) {
        <app-champ-themes
          class="nouvelle-preparation__champ"
          etiquette="Thème par défaut (facultatif)"
          [themes]="themes()"
          [choisis]="themesChoisis()"
          [limite]="1"
          [enCours]="creationThemeEnCours()"
          [erreur]="erreurCreationTheme()"
          (choisisChange)="theme.set($event[0] ?? null)"
          (creer)="creerTheme($event)"
        />
      }
    </mat-dialog-content>
    <mat-dialog-actions>
      <button
        matButton
        type="button"
        mat-dialog-close
        [disabled]="
          envoiEnCours() ||
          creationAlbumEnCours() ||
          creationModuleEnCours() ||
          creationThemeEnCours()
        "
      >
        Annuler
      </button>
      <button
        matButton="filled"
        type="button"
        [disabled]="
          !complet() ||
          envoiEnCours() ||
          voletOuvert() ||
          saisieModuleOuverte() ||
          creationThemeEnCours()
        "
        (click)="creer()"
      >
        Créer
      </button>
    </mat-dialog-actions>
  `,
})
export class NouvellePreparationDialogue implements OnInit {
  private readonly api = inject(Api);
  private readonly reference =
    inject<MatDialogRef<NouvellePreparationDialogue, PreparationDto>>(MatDialogRef);
  private readonly destruction = inject(DestroyRef);
  private readonly injecteur = inject(Injector);

  protected readonly sections = SECTIONS;
  protected readonly libellesSection = LIBELLES_SECTION;
  protected readonly messageAucunAlbum = MESSAGE_AUCUN_ALBUM;
  protected readonly libelleModules = libelleModules;
  protected readonly longueurMin = LONGUEUR_MIN_RECHERCHE;
  protected readonly longueurMax = LONGUEUR_MAX_CHAMP_ALBUM;
  protected readonly optionCreerAlbum = OPTION_CREER_ALBUM;
  protected readonly optionNouveauModule = OPTION_NOUVEAU_MODULE;

  private readonly champAlbum = viewChild<ElementRef<HTMLInputElement>>('champAlbum');
  private readonly champTitre = viewChild<ElementRef<HTMLInputElement>>('champTitre');
  private readonly listeModule = viewChild<MatSelect>('listeModule');

  /** Texte saisi, ou l'Album choisi dans les suggestions. */
  protected readonly rechercheAlbum = new FormControl<string | ValeurOption>('', {
    nonNullable: true,
  });
  /** Texte saisi dans le champ Album, rogné ; vide quand un Album est choisi. */
  protected readonly texteCherche = signal('');
  protected readonly suggestions = signal<AlbumDto[]>([]);
  /** Vrai quand la dernière recherche lancée (2 caractères au moins) n'a rien trouvé. */
  protected readonly aucunAlbum = signal(false);

  readonly album = signal<AlbumDto | null>(null);
  readonly section = signal<Section | null>(null);
  readonly module = signal<string | null>(null);
  readonly theme = signal<string | null>(null);
  protected readonly modules = signal<ModuleDto[]>([]);
  /** Vrai une fois les Modules de l'Album choisi chargés : la liste Module, avec « Nouveau module », s'affiche. */
  protected readonly modulesCharges = signal(false);
  /** Champ en ligne « Nom du nouveau module », ouvert à la place de la liste Module. */
  protected readonly saisieModuleOuverte = signal(false);
  protected readonly creationModuleEnCours = signal(false);
  protected readonly erreurCreationModule = signal<string | null>(null);
  protected readonly themes = signal<ThemeDto[]>([]);
  /** Vrai une fois les Thèmes chargés : le Champ à étiquettes, avec « Créer le thème », s'affiche. */
  protected readonly themesCharges = signal(false);
  protected readonly themesChoisis = computed(() => {
    const theme = this.theme();
    return theme === null ? [] : [theme];
  });
  protected readonly creationThemeEnCours = signal(false);
  protected readonly erreurCreationTheme = signal<string | null>(null);

  /** Volet « Créer l'album », déplié à la place du champ Album. */
  protected readonly voletOuvert = signal(false);
  protected readonly titreNouvelAlbum = new FormControl('', { nonNullable: true });
  protected readonly auteurNouvelAlbum = new FormControl('', { nonNullable: true });
  protected readonly editeurNouvelAlbum = new FormControl('', { nonNullable: true });
  /** Titre saisi dans le volet, tenu à jour à chaque frappe (le préremplissage l'écrit sans événement). */
  private readonly titreSaisi = signal('');
  private readonly auteurSaisi = toSignal(this.auteurNouvelAlbum.valueChanges, {
    initialValue: '',
  });
  protected readonly titresProches = signal<AlbumDto[]>([]);
  protected readonly creationAlbumEnCours = signal(false);
  protected readonly albumComplet = computed(
    () => this.titreSaisi().trim() !== '' && this.auteurSaisi().trim() !== '',
  );

  protected readonly erreurRecherche = signal<ErreurAffichee | null>(null);
  protected readonly erreurModules = signal<ErreurAffichee | null>(null);
  protected readonly erreurThemes = signal<ErreurAffichee | null>(null);
  protected readonly erreurCreation = signal<ErreurAffichee | null>(null);
  protected readonly erreurTitresProches = signal<ErreurAffichee | null>(null);
  protected readonly erreurAlbum = signal<ErreurAffichee | null>(null);

  /** Erreurs affichées en tête du dialogue (celles du volet s'affichent dans le volet). */
  protected readonly erreursDuDialogue = computed(() =>
    [
      { nom: 'recherche', erreur: this.erreurRecherche(), signal: this.erreurRecherche },
      { nom: 'modules', erreur: this.erreurModules(), signal: this.erreurModules },
      { nom: 'themes', erreur: this.erreurThemes(), signal: this.erreurThemes },
      { nom: 'creation', erreur: this.erreurCreation(), signal: this.erreurCreation },
    ]
      .filter((source) => source.erreur !== null)
      .map((source) => ({
        nom: source.nom,
        erreur: source.erreur!,
        effacer: () => source.signal.set(null),
      })),
  );

  protected readonly envoiEnCours = signal(false);
  protected readonly complet = computed(() => this.album() !== null && this.section() !== null);

  /** Numéro du dernier chargement de Modules : une réponse pour un Album quitté depuis n'écrit rien. */
  private dernierChargementModules = 0;
  /** Numéro du dernier chargement de titres proches : une réponse pour un titre modifié depuis n'écrit rien. */
  private dernierChargementProches = 0;
  /** Titre du dernier chargement de titres proches : un titre retapé à l'identique ne recharge rien. */
  private titreDesProches: string | null = null;

  protected readonly titreAlbum = (valeur: string | ValeurOption | null): string =>
    typeof valeur === 'string'
      ? valeur
      : valeur === OPTION_CREER_ALBUM
        ? ''
        : (valeur?.titre ?? '');

  ngOnInit(): void {
    this.rechercheAlbum.valueChanges
      .pipe(
        map((valeur) => (typeof valeur === 'string' ? valeur.trim() : null)),
        filter((texte) => texte !== null),
        // Toute frappe défait l'Album choisi : « Créer » attend un nouveau choix.
        tap((texte) => {
          this.texteCherche.set(texte);
          this.quitterAlbum();
        }),
        debounceTime(DELAI_RECHERCHE_ALBUMS_MS),
        distinctUntilChanged(),
        switchMap((texte) =>
          texte.length < LONGUEUR_MIN_RECHERCHE ? of(null) : from(this.chercher(texte)),
        ),
        takeUntilDestroyed(this.destruction),
      )
      .subscribe((albums) => {
        this.suggestions.set(albums ?? []);
        this.aucunAlbum.set(albums !== null && albums.length === 0);
      });
    this.titreNouvelAlbum.valueChanges
      .pipe(
        tap((titre) => {
          this.titreSaisi.set(titre);
          // Le message d'échec de création porte sur l'ancien titre.
          this.erreurAlbum.set(null);
        }),
        map((titre) => titre.trim()),
        debounceTime(DELAI_RECHERCHE_ALBUMS_MS),
        takeUntilDestroyed(this.destruction),
      )
      .subscribe((titre) => {
        if (this.voletOuvert() && titre !== this.titreDesProches) {
          void this.chargerTitresProches(titre);
        }
      });
    this.auteurNouvelAlbum.valueChanges
      .pipe(takeUntilDestroyed(this.destruction))
      .subscribe(() => this.erreurAlbum.set(null));
    void this.prerempliSection();
    void this.chargerThemes();
  }

  /** Texte actuellement saisi dans le champ Album, ou `null` si un Album y est choisi. */
  private texteCourant(): string | null {
    const valeur = this.rechercheAlbum.value;
    return typeof valeur === 'string' ? valeur.trim() : null;
  }

  /** Albums trouvés pour `texte`, ou `null` en échec (Bandeau d'erreur, « Réessayer » relance la recherche). */
  private async chercher(texte: string): Promise<AlbumDto[] | null> {
    try {
      const page = await this.api.invoke(rechercherAlbums, {
        recherche: texte,
        taille: NOMBRE_SUGGESTIONS,
      });
      this.erreurRecherche.set(null);
      return page.elements;
    } catch (erreur) {
      this.erreurRecherche.set({
        message: messageErreur(erreur),
        // Le texte a changé depuis l'échec : la recherche du nouveau texte est déjà partie, on efface seulement.
        reessayer: () =>
          this.texteCourant() === texte
            ? void this.relancerRecherche(texte)
            : this.erreurRecherche.set(null),
      });
      return null;
    }
  }

  private async relancerRecherche(texte: string): Promise<void> {
    const albums = await this.chercher(texte);
    if (albums !== null && this.texteCourant() === texte) {
      this.suggestions.set(albums);
      this.aucunAlbum.set(albums.length === 0);
    }
  }

  protected choisirOption(valeur: ValeurOption): void {
    if (valeur === OPTION_CREER_ALBUM) {
      this.ouvrirVolet();
    } else {
      this.choisirAlbum(valeur);
    }
  }

  protected choisirAlbum(album: AlbumDto): void {
    this.album.set(album);
    this.texteCherche.set('');
    // Changer d'Album efface l'erreur des Modules de l'Album précédent.
    this.erreurModules.set(null);
    void this.chargerModules(album);
  }

  private quitterAlbum(): void {
    if (this.album() !== null) {
      this.album.set(null);
      this.dernierChargementModules++;
      this.modules.set([]);
      this.module.set(null);
      this.modulesCharges.set(false);
      this.fermerSaisieModule(false);
    }
  }

  private async chargerModules(album: AlbumDto): Promise<void> {
    const numero = ++this.dernierChargementModules;
    this.modules.set([]);
    this.module.set(null);
    this.modulesCharges.set(false);
    this.fermerSaisieModule(false);
    try {
      const modules = await this.api.invoke(listerModulesDeLAlbum, { id: album.id });
      if (numero === this.dernierChargementModules) {
        this.modules.set(modules);
        this.modulesCharges.set(true);
        this.erreurModules.set(null);
      }
    } catch (erreur) {
      if (numero === this.dernierChargementModules) {
        this.erreurModules.set({
          message: messageErreur(erreur),
          // Un autre Album (ou aucun) est choisi depuis : rien à recharger.
          reessayer: () =>
            this.album()?.id === album.id
              ? void this.chargerModules(album)
              : this.erreurModules.set(null),
        });
      }
    }
  }

  protected choisirModule(valeur: ValeurModule): void {
    if (valeur === OPTION_NOUVEAU_MODULE) {
      this.erreurCreationModule.set(null);
      this.saisieModuleOuverte.set(true);
    } else {
      this.module.set(valeur);
    }
  }

  /** Replie le champ « Nom du nouveau module » sans rien créer ; le focus revient à la liste Module si demandé. */
  protected fermerSaisieModule(rendreFocus = true): void {
    if (!this.saisieModuleOuverte()) {
      return;
    }
    this.saisieModuleOuverte.set(false);
    this.erreurCreationModule.set(null);
    if (rendreFocus) {
      afterNextRender(() => this.listeModule()?.focus(), { injector: this.injecteur });
    }
  }

  /**
   * Crée le Module `nom` en fin de l'Album choisi, l'ajoute à la liste et le choisit. En échec, le champ reste ouvert
   * avec sa saisie et affiche le message.
   */
  async ajouterModule(nom: string): Promise<void> {
    const album = this.album();
    if (album === null || this.creationModuleEnCours()) {
      return;
    }
    const numero = this.dernierChargementModules;
    this.creationModuleEnCours.set(true);
    // Un nouvel échec réaffiche son message, même identique au précédent.
    this.erreurCreationModule.set(null);
    this.reference.disableClose = true;
    try {
      const cree = await this.api.invoke(creerModule, { id: album.id, body: { nom } });
      if (numero === this.dernierChargementModules) {
        this.modules.update((modules) => [...modules, cree]);
        this.module.set(cree.id);
        this.fermerSaisieModule();
      }
    } catch (erreur) {
      if (numero === this.dernierChargementModules) {
        this.erreurCreationModule.set(messageErreur(erreur));
      }
    } finally {
      this.creationModuleEnCours.set(false);
      this.reference.disableClose = false;
    }
  }

  /** Section de la dernière Préparation, si l'enseignant n'en a pas déjà choisi une ; sans elle, rien de choisi. */
  private async prerempliSection(): Promise<void> {
    try {
      const { section } = await this.api.invoke(lireDerniereSection);
      if (section && this.section() === null) {
        this.section.set(section);
      }
    } catch {
      // Préremplissage seulement : sans lui, l'enseignant choisit la Section.
    }
  }

  private async chargerThemes(): Promise<void> {
    try {
      this.themes.set(await this.api.invoke(listerThemes));
      this.themesCharges.set(true);
      this.erreurThemes.set(null);
    } catch (erreur) {
      this.erreurThemes.set({
        message: messageErreur(erreur),
        reessayer: () => void this.chargerThemes(),
      });
    }
  }

  /**
   * Crée le Thème `nom`, visible de toute l'école, l'ajoute à la liste et le choisit. En échec, le message s'affiche
   * sous le Champ à étiquettes, qui garde la saisie.
   */
  async creerTheme(nom: string): Promise<void> {
    if (this.creationThemeEnCours()) {
      return;
    }
    this.creationThemeEnCours.set(true);
    // Un nouvel échec réaffiche son message, même identique au précédent.
    this.erreurCreationTheme.set(null);
    this.reference.disableClose = true;
    try {
      const cree = await this.api.invoke(creerTheme, { body: { nom } });
      this.themes.update((themes) =>
        [...themes, cree].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
      );
      this.theme.set(cree.id);
    } catch (erreur) {
      this.erreurCreationTheme.set(messageErreur(erreur));
    } finally {
      this.creationThemeEnCours.set(false);
      this.reference.disableClose = false;
    }
  }

  /** Déplie le volet « Créer l'album », Titre prérempli avec le texte cherché, et y met le focus. */
  private ouvrirVolet(): void {
    const texte = this.texteCherche();
    // L'autocomplete a écrit son option dans le champ : on y remet le texte, sans relancer de recherche.
    this.rechercheAlbum.setValue(texte, { emitEvent: false });
    this.titreNouvelAlbum.setValue(texte, { emitEvent: false });
    this.auteurNouvelAlbum.setValue('');
    this.editeurNouvelAlbum.setValue('');
    this.titreSaisi.set(texte);
    this.titresProches.set([]);
    this.erreurAlbum.set(null);
    this.erreurTitresProches.set(null);
    this.voletOuvert.set(true);
    void this.chargerTitresProches(texte.trim());
    afterNextRender(() => this.champTitre()?.nativeElement.focus(), { injector: this.injecteur });
  }

  /** Replie le volet sans rien créer ; le focus revient au champ Album. */
  protected fermerVolet(): void {
    this.voletOuvert.set(false);
    this.dernierChargementProches++;
    this.titreDesProches = null;
    this.titresProches.set([]);
    this.erreurAlbum.set(null);
    this.erreurTitresProches.set(null);
    afterNextRender(() => this.champAlbum()?.nativeElement.focus(), { injector: this.injecteur });
  }

  private async chargerTitresProches(titre: string): Promise<void> {
    const numero = ++this.dernierChargementProches;
    this.titreDesProches = titre;
    if (titre.length < LONGUEUR_MIN_RECHERCHE) {
      this.titresProches.set([]);
      this.erreurTitresProches.set(null);
      return;
    }
    try {
      const proches = await this.api.invoke(listerTitresProches, { titre });
      if (numero === this.dernierChargementProches) {
        this.titresProches.set(proches);
        this.erreurTitresProches.set(null);
      }
    } catch (erreur) {
      if (numero === this.dernierChargementProches) {
        this.erreurTitresProches.set({
          message: messageErreur(erreur),
          reessayer: () =>
            this.titreNouvelAlbum.value.trim() === titre && this.voletOuvert()
              ? void this.chargerTitresProches(titre)
              : this.erreurTitresProches.set(null),
        });
      }
    }
  }

  /** Choisit un Album au titre proche à la place d'en créer un : le volet se replie. */
  protected choisirAlbumProche(album: AlbumDto): void {
    this.fermerVolet();
    this.rechercheAlbum.setValue(album, { emitEvent: false });
    this.choisirAlbum(album);
  }

  /** Crée l'Album et le choisit ; un doublon (409) affiche le message et recharge les titres proches. */
  async creerAlbum(): Promise<void> {
    if (!this.albumComplet() || this.creationAlbumEnCours()) {
      return;
    }
    const titre = this.titreNouvelAlbum.value.trim();
    const editeur = this.editeurNouvelAlbum.value.trim();
    this.creationAlbumEnCours.set(true);
    this.reference.disableClose = true;
    try {
      const album = await this.api.invoke(creerAlbum, {
        body: {
          titre,
          auteur: this.auteurNouvelAlbum.value.trim(),
          editeur: editeur === '' ? undefined : editeur,
        },
      });
      this.erreurAlbum.set(null);
      this.choisirAlbumProche(album);
    } catch (erreur) {
      const dejaExistant = codeErreur(erreur) === 'album.deja_existant';
      this.erreurAlbum.set({
        message: messageErreur(erreur),
        // Un doublon échouerait à l'identique : « Réessayer » efface seulement le message.
        reessayer: () => (dejaExistant ? this.erreurAlbum.set(null) : void this.creerAlbum()),
      });
      if (dejaExistant) {
        void this.chargerTitresProches(titre);
      }
    } finally {
      this.creationAlbumEnCours.set(false);
      this.reference.disableClose = false;
    }
  }

  /** Crée la Préparation et ferme le dialogue avec elle ; en échec, Bandeau d'erreur dont « Réessayer » recrée. */
  async creer(): Promise<void> {
    const album = this.album();
    const section = this.section();
    if (album === null || section === null || this.envoiEnCours() || this.voletOuvert()) {
      return;
    }
    this.envoiEnCours.set(true);
    // Pendant la création, ni Échap ni un clic hors du dialogue ne le ferment : la page de la Préparation doit s'ouvrir.
    this.reference.disableClose = true;
    try {
      const preparation = await this.api.invoke(creerPreparation, {
        body: {
          albumId: album.id,
          section,
          moduleId: this.module() ?? undefined,
          themeDefautId: this.theme() ?? undefined,
        },
      });
      this.reference.close(preparation);
    } catch (erreur) {
      this.erreurCreation.set({
        message: messageErreur(erreur),
        reessayer: () => void this.creer(),
      });
    } finally {
      this.envoiEnCours.set(false);
      this.reference.disableClose = false;
    }
  }
}

/**
 * Ouvre le dialogue et rend la Préparation créée, ou `undefined` s'il est fermé sans création. Le focus revient à
 * `declencheur` à la fermeture. Chargé à la demande par `NouvellePreparation` : les champs Material du dialogue
 * restent hors du paquet initial.
 */
export async function ouvrirDialogueNouvellePreparation(
  injecteur: Injector,
  declencheur?: HTMLElement,
): Promise<PreparationDto | undefined> {
  const reference = injecteur
    .get(MatDialog)
    .open<NouvellePreparationDialogue, void, PreparationDto>(NouvellePreparationDialogue, {
      restoreFocus: declencheur ?? true,
    });
  return firstValueFrom(reference.afterClosed());
}
