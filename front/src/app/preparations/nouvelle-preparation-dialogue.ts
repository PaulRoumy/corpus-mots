import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
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
import { listerModulesDeLAlbum } from '../api/fn/albums-resource/lister-modules-de-l-album';
import { rechercherAlbums } from '../api/fn/albums-resource/rechercher-albums';
import { creerPreparation } from '../api/fn/preparations-resource/creer-preparation';
import { lireDerniereSection } from '../api/fn/preparations-resource/lire-derniere-section';
import { listerThemes } from '../api/fn/themes-resource/lister-themes';
import { AlbumDto } from '../api/models/album-dto';
import { ModuleDto } from '../api/models/module-dto';
import { PreparationDto } from '../api/models/preparation-dto';
import { ThemeDto } from '../api/models/theme-dto';
import { BandeauErreur } from '../commun/bandeau-erreur/bandeau-erreur';
import { messageErreur } from '../commun/erreurs/message-erreur';
import { LIBELLES_SECTION, Section, SECTIONS } from '../commun/repere-section/repere-section';

/** Délai de frappe avant de chercher les Albums. */
export const DELAI_RECHERCHE_ALBUMS_MS = 250;

/** Longueur minimale du texte cherché (le back applique la même, après normalisation). */
export const LONGUEUR_MIN_RECHERCHE = 2;

/** Nombre de suggestions d'Albums demandées. */
const NOMBRE_SUGGESTIONS = 20;

export const MESSAGE_AUCUN_ALBUM = 'Aucun album trouvé';

/** « 0 modules », « 1 module », « 3 modules ». */
export function libelleModules(nombre: number): string {
  return `${nombre} module${nombre === 1 ? '' : 's'}`;
}

interface ErreurAffichee {
  message: string;
  reessayer: () => void;
}

/**
 * Dialogue « Nouvelle préparation » (UJ-1, key-accueil.html › 4) : Album cherché pendant la frappe (à partir de
 * 2 caractères, « n modules » à droite de chaque suggestion), Section (PS, MS, GS, préremplie avec celle de la dernière
 * Préparation), Module (seulement si l'Album en a) et Thème par défaut (seulement s'il existe des Thèmes), tous deux
 * facultatifs. « Créer » reste désactivé tant qu'Album et Section manquent ; il crée la Préparation et ferme le
 * dialogue avec elle. Un échec s'affiche dans le dialogue, avec « Réessayer ». « Créer l'album » et les titres proches
 * arrivent avec la story 2.1, partie 2.
 */
@Component({
  selector: 'app-nouvelle-preparation',
  imports: [
    BandeauErreur,
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
      @if (erreur(); as affichee) {
        <app-bandeau-erreur
          [message]="affichee.message"
          (reessayer)="affichee.reessayer()"
          (fermer)="erreur.set(null)"
        />
      }

      <mat-form-field class="nouvelle-preparation__champ">
        <mat-label>Album</mat-label>
        <mat-icon matPrefix svgIcon="recherche" aria-hidden="true" />
        <input
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
          (optionSelected)="choisirAlbum($event.option.value)"
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
        </mat-autocomplete>
      </mat-form-field>

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

      @if (modules().length > 0) {
        <mat-form-field class="nouvelle-preparation__champ">
          <mat-label>Module (facultatif)</mat-label>
          <mat-select [value]="module()" (selectionChange)="module.set($event.value)">
            <mat-option [value]="null">Aucun module</mat-option>
            @for (choix of modules(); track choix.id) {
              <mat-option [value]="choix.id">{{ choix.nom }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }

      @if (themes().length > 0) {
        <mat-form-field class="nouvelle-preparation__champ">
          <mat-label>Thème par défaut (facultatif)</mat-label>
          <mat-select [value]="theme()" (selectionChange)="theme.set($event.value)">
            <mat-option [value]="null">Aucun thème</mat-option>
            @for (choix of themes(); track choix.id) {
              <mat-option [value]="choix.id">{{ choix.nom }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions>
      <button matButton type="button" mat-dialog-close [disabled]="envoiEnCours()">Annuler</button>
      <button
        matButton="filled"
        type="button"
        [disabled]="!complet() || envoiEnCours()"
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

  protected readonly sections = SECTIONS;
  protected readonly libellesSection = LIBELLES_SECTION;
  protected readonly messageAucunAlbum = MESSAGE_AUCUN_ALBUM;
  protected readonly libelleModules = libelleModules;

  /** Texte saisi, ou l'Album choisi dans les suggestions. */
  protected readonly rechercheAlbum = new FormControl<string | AlbumDto>('', { nonNullable: true });
  protected readonly suggestions = signal<AlbumDto[]>([]);
  /** Vrai quand la dernière recherche lancée (2 caractères au moins) n'a rien trouvé. */
  protected readonly aucunAlbum = signal(false);

  readonly album = signal<AlbumDto | null>(null);
  readonly section = signal<Section | null>(null);
  readonly module = signal<string | null>(null);
  readonly theme = signal<string | null>(null);
  protected readonly modules = signal<ModuleDto[]>([]);
  protected readonly themes = signal<ThemeDto[]>([]);

  protected readonly erreur = signal<ErreurAffichee | null>(null);
  protected readonly envoiEnCours = signal(false);
  protected readonly complet = computed(() => this.album() !== null && this.section() !== null);

  /** Numéro du dernier chargement de Modules : une réponse pour un Album quitté depuis n'écrit rien. */
  private dernierChargementModules = 0;

  protected readonly titreAlbum = (valeur: string | AlbumDto | null): string =>
    typeof valeur === 'string' ? valeur : (valeur?.titre ?? '');

  ngOnInit(): void {
    this.rechercheAlbum.valueChanges
      .pipe(
        map((valeur) => (typeof valeur === 'string' ? valeur.trim() : null)),
        filter((texte) => texte !== null),
        // Toute frappe défait l'Album choisi : « Créer » attend un nouveau choix.
        tap(() => this.quitterAlbum()),
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
    void this.prerempliSection();
    void this.chargerThemes();
  }

  /** Albums trouvés pour `texte`, ou `null` en échec (Bandeau d'erreur, « Réessayer » relance la recherche). */
  private async chercher(texte: string): Promise<AlbumDto[] | null> {
    try {
      const page = await this.api.invoke(rechercherAlbums, {
        recherche: texte,
        taille: NOMBRE_SUGGESTIONS,
      });
      this.erreur.set(null);
      return page.elements;
    } catch (erreur) {
      this.montrerErreur(erreur, () => void this.relancerRecherche(texte));
      return null;
    }
  }

  private async relancerRecherche(texte: string): Promise<void> {
    const albums = await this.chercher(texte);
    if (albums !== null) {
      this.suggestions.set(albums);
      this.aucunAlbum.set(albums.length === 0);
    }
  }

  protected choisirAlbum(album: AlbumDto): void {
    this.album.set(album);
    void this.chargerModules(album);
  }

  private quitterAlbum(): void {
    if (this.album() !== null) {
      this.album.set(null);
      this.dernierChargementModules++;
      this.modules.set([]);
      this.module.set(null);
    }
  }

  private async chargerModules(album: AlbumDto): Promise<void> {
    const numero = ++this.dernierChargementModules;
    this.modules.set([]);
    this.module.set(null);
    try {
      const modules = await this.api.invoke(listerModulesDeLAlbum, { id: album.id });
      if (numero === this.dernierChargementModules) {
        this.modules.set(modules);
      }
    } catch (erreur) {
      if (numero === this.dernierChargementModules) {
        this.montrerErreur(erreur, () => {
          this.erreur.set(null);
          void this.chargerModules(album);
        });
      }
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
    } catch (erreur) {
      this.montrerErreur(erreur, () => {
        this.erreur.set(null);
        void this.chargerThemes();
      });
    }
  }

  /** Crée la Préparation et ferme le dialogue avec elle ; en échec, Bandeau d'erreur dont « Réessayer » recrée. */
  async creer(): Promise<void> {
    const album = this.album();
    const section = this.section();
    if (album === null || section === null || this.envoiEnCours()) {
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
      this.montrerErreur(erreur, () => void this.creer());
    } finally {
      this.envoiEnCours.set(false);
      this.reference.disableClose = false;
    }
  }

  private montrerErreur(erreur: unknown, reessayer: () => void): void {
    this.erreur.set({ message: messageErreur(erreur), reessayer });
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
