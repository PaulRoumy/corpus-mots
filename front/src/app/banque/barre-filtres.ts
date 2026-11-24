import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuItem, MatMenuModule } from '@angular/material/menu';
import { Api } from '../api/api';
import { lireAlbum } from '../api/fn/albums-resource/lire-album';
import { listerModulesDeLAlbum } from '../api/fn/albums-resource/lister-modules-de-l-album';
import { rechercherAlbums } from '../api/fn/albums-resource/rechercher-albums';
import { listerProprietairesBanque } from '../api/fn/images-resource/lister-proprietaires-banque';
import { listerThemes } from '../api/fn/themes-resource/lister-themes';
import { AlbumDto } from '../api/models/album-dto';
import { ModuleDto } from '../api/models/module-dto';
import { ThemeDto } from '../api/models/theme-dto';
import { Annuaire } from '../commun/annuaire';
import { CompteCourant } from '../commun/compte-courant';
import { messageErreur } from '../commun/erreurs/message-erreur';
import {
  CATEGORIES_GRAMMATICALES,
  LIBELLES_CATEGORIE,
  LIBELLES_TYPE_IMAGE,
  TYPES_IMAGE,
} from '../commun/libelles-images';
import {
  DELAI_RECHERCHE_ALBUMS_MS,
  LONGUEUR_MIN_RECHERCHE,
  MESSAGE_AUCUN_ALBUM,
} from '../preparations/recherche-albums';
import {
  ChangementFiltres,
  CleFiltre,
  FiltresBanque,
  filtresPoses,
  SECTIONS_FILTRE,
} from './filtres-banque';

/** Nom affiché de chaque filtre, sur sa puce et dans « Retirer le filtre … ». */
export const NOMS_FILTRES: Readonly<Record<CleFiltre, string>> = {
  mot: 'Mot',
  sensId: 'Sens',
  section: 'Section',
  albumId: 'Album',
  moduleId: 'Module',
  themeId: 'Thème',
  categorie: 'Catégorie',
  typeImage: "Type d'image",
  proprietaireId: 'Propriétaire',
};

/** Libellé de l'enseignant connecté dans le filtre propriétaire. */
export const PROPRIETAIRE_FILTRE_MOI = 'Moi';
/** Indication de la puce Module tant qu'aucun Album n'est choisi. */
export const INDICATION_MODULE_SANS_ALBUM = "Choisissez d'abord un album";
/** Recherche d'Album qui trouve plus de titres qu'elle n'en montre. */
export const MESSAGE_PRECISER_ALBUM = 'Précisez votre recherche pour voir les autres albums.';

/** Lecture d'une liste d'options : pas commencée, en cours, faite ou en échec. */
type Lecture<T> =
  | { readonly statut: 'inactif' | 'chargement' }
  | { readonly statut: 'charge'; readonly valeurs: T }
  | { readonly statut: 'erreur'; readonly message: string };

/** Option d'un menu de filtre. */
interface OptionFiltre {
  readonly valeur: string;
  readonly libelle: string;
}

/** Résultat de la recherche d'Album du menu : rien tapé (ou trop court), en cours, trouvé, en échec. */
type RechercheAlbum =
  | { readonly statut: 'court' | 'chargement' }
  | { readonly statut: 'charge'; readonly albums: AlbumDto[]; readonly total: number }
  | { readonly statut: 'erreur'; readonly message: string };

/** Libellé d'une puce : « Section : GS » avec valeur, « Section » sans. */
function libellePuce(cle: CleFiltre, valeur: string | null): string {
  return valeur === null ? NOMS_FILTRES[cle] : `${NOMS_FILTRES[cle]} : ${valeur}`;
}

/** Libellé d'une puce dont la valeur n'a pas pu être nommée : « Album (inconnu) ». */
function libelleInconnu(cle: CleFiltre): string {
  return `${NOMS_FILTRES[cle]} (inconnu)`;
}

/** Libellé d'une puce dont la valeur se nomme encore : « Album choisi ». */
function libelleChoisi(cle: CleFiltre): string {
  return `${NOMS_FILTRES[cle]} choisi`;
}

let prochainId = 0;

/**
 * Barre de Puces de filtre de la Banque (story 3.2, partie 2, FR-15) : une puce par filtre, en choix unique, combinées
 * en ET. Une puce sans valeur dit le nom du filtre (« Section ») ; avec valeur, « Section : GS » en
 * `secondary-container` avec coche, et un bouton « Retirer le filtre Section ». Chaque puce ouvre un menu piloté au
 * clavier, qui rend le focus à la puce en se fermant. Mot (Champ de recherche) et Sens (« Filtrer sur ce sens »)
 * n'ont pas de menu : leur puce ne paraît qu'une fois posée. « Effacer les filtres » paraît dès qu'un filtre est
 * posé.
 *
 * La barre ne fait qu'émettre les changements : la page les porte dans l'URL, seule source des filtres. Les options
 * viennent du client généré (Thèmes, recherche d'Albums, Modules de l'Album, propriétaires proposables, noms de
 * l'annuaire, AD-20) ; une puce posée par un lien partagé se nomme par `lireAlbum`, `listerModulesDeLAlbum` et
 * `listerThemes`, ou « Album (inconnu) » si la lecture échoue.
 */
@Component({
  selector: 'app-barre-filtres',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './barre-filtres.scss',
  template: `
    <div class="filtres" role="group" aria-label="Filtres">
      @if (filtres().mot) {
        <ng-container
          *ngTemplateOutlet="puceFixe; context: { cle: 'mot', libelle: libelle('mot') }"
        />
      }
      @if (filtres().sensId) {
        <ng-container
          *ngTemplateOutlet="puceFixe; context: { cle: 'sensId', libelle: libelle('sensId') }"
        />
      }
      <ng-container
        *ngTemplateOutlet="
          puce;
          context: { cle: 'section', libelle: libelle('section'), menu: menuSection }
        "
      />
      <ng-container
        *ngTemplateOutlet="
          puce;
          context: { cle: 'themeId', libelle: libelle('themeId'), menu: menuTheme }
        "
      />
      <ng-container
        *ngTemplateOutlet="
          puce;
          context: { cle: 'albumId', libelle: libelle('albumId'), menu: menuAlbum }
        "
      />
      <ng-container
        *ngTemplateOutlet="
          puce;
          context: {
            cle: 'moduleId',
            libelle: libelle('moduleId'),
            menu: menuModule,
            desactivee: filtres().albumId === undefined,
          }
        "
      />
      <ng-container
        *ngTemplateOutlet="
          puce;
          context: { cle: 'categorie', libelle: libelle('categorie'), menu: menuCategorie }
        "
      />
      <ng-container
        *ngTemplateOutlet="
          puce;
          context: { cle: 'typeImage', libelle: libelle('typeImage'), menu: menuType }
        "
      />
      <ng-container
        *ngTemplateOutlet="
          puce;
          context: {
            cle: 'proprietaireId',
            libelle: libelle('proprietaireId'),
            menu: menuProprietaire,
          }
        "
      />
      @if (poses()) {
        <button matButton class="filtres__effacer" type="button" (click)="effacer.emit()">
          Effacer les filtres
        </button>
      }
    </div>

    <!-- Puce à menu ; désactivée (Module sans Album), elle dit pourquoi. -->
    <ng-template
      #puce
      let-cle="cle"
      let-libelle="libelle"
      let-menu="menu"
      let-desactivee="desactivee"
    >
      <span class="puce" [class.puce--choisie]="valeur(cle) !== undefined">
        @if (desactivee) {
          <button
            class="puce__bouton"
            type="button"
            aria-disabled="true"
            [attr.data-filtre]="cle"
            [attr.aria-describedby]="idIndicationModule"
            [title]="indicationModule"
          >
            {{ libelle }}<span class="puce__deroulant" aria-hidden="true"></span>
          </button>
          <span class="cm-visuellement-masque" [id]="idIndicationModule">{{
            indicationModule
          }}</span>
        } @else {
          <button
            class="puce__bouton"
            type="button"
            [attr.data-filtre]="cle"
            [matMenuTriggerFor]="menu"
            (menuOpened)="menuOuvert(cle)"
          >
            @if (valeur(cle) !== undefined) {
              <mat-icon class="puce__coche" svgIcon="coche" aria-hidden="true" />
            }
            {{ libelle }}<span class="puce__deroulant" aria-hidden="true"></span>
          </button>
        }
        @if (valeur(cle) !== undefined) {
          <ng-container *ngTemplateOutlet="retirer; context: { cle }" />
        }
      </span>
    </ng-template>

    <!-- Puce sans menu (Mot, Sens) : elle se retire seulement. -->
    <ng-template #puceFixe let-cle="cle" let-libelle="libelle">
      <span class="puce puce--choisie">
        <span class="puce__libelle" [attr.data-filtre]="cle">
          <mat-icon class="puce__coche" svgIcon="coche" aria-hidden="true" />{{ libelle }}
        </span>
        <ng-container *ngTemplateOutlet="retirer; context: { cle }" />
      </span>
    </ng-template>

    <ng-template #retirer let-cle="cle">
      <button
        class="puce__retirer"
        type="button"
        [attr.aria-label]="'Retirer le filtre ' + nom(cle)"
        (click)="retirerFiltre(cle)"
      >
        <mat-icon svgIcon="fermer" aria-hidden="true" />
      </button>
    </ng-template>

    <mat-menu #menuSection="matMenu">
      @for (option of sections; track option.valeur) {
        <ng-container *ngTemplateOutlet="optionMenu; context: { cle: 'section', option }" />
      }
    </mat-menu>

    <mat-menu #menuCategorie="matMenu">
      @for (option of categories; track option.valeur) {
        <ng-container *ngTemplateOutlet="optionMenu; context: { cle: 'categorie', option }" />
      }
    </mat-menu>

    <mat-menu #menuType="matMenu">
      @for (option of types; track option.valeur) {
        <ng-container *ngTemplateOutlet="optionMenu; context: { cle: 'typeImage', option }" />
      }
    </mat-menu>

    <mat-menu #menuTheme="matMenu">
      <ng-container
        *ngTemplateOutlet="
          optionsLues;
          context: {
            cle: 'themeId',
            lecture: themes(),
            options: optionsThemes(),
            vide: 'Aucun thème',
            reessayer: chargerThemes,
          }
        "
      />
    </mat-menu>

    <mat-menu #menuModule="matMenu">
      <ng-container
        *ngTemplateOutlet="
          optionsLues;
          context: {
            cle: 'moduleId',
            lecture: modules().lecture,
            options: optionsModules(),
            vide: 'Aucun module',
            reessayer: rechargerModules,
          }
        "
      />
    </mat-menu>

    <mat-menu #menuProprietaire="matMenu">
      <ng-container
        *ngTemplateOutlet="
          optionsLues;
          context: {
            cle: 'proprietaireId',
            lecture: proprietaires(),
            options: optionsProprietaires(),
            vide: 'Aucun propriétaire',
            reessayer: chargerProprietaires,
          }
        "
      />
    </mat-menu>

    <mat-menu #menuAlbum="matMenu" (closed)="menuAlbumFerme()">
      <div class="filtres__recherche" (click)="$event.stopPropagation()">
        <label class="cm-visuellement-masque" [for]="idRechercheAlbum">Chercher un album</label>
        <input
          #champAlbum
          class="filtres__champ"
          type="search"
          autocomplete="off"
          placeholder="Chercher un album"
          [id]="idRechercheAlbum"
          [value]="texteAlbum()"
          (input)="taperAlbum(champAlbum.value)"
          (keydown)="clavierRechercheAlbum($event)"
        />
      </div>
      @switch (rechercheAlbum().statut) {
        @case ('court') {
          <p class="filtres__message">Tapez au moins {{ longueurMin }} caractères du titre.</p>
        }
        @case ('chargement') {
          <p class="filtres__message" role="status">Recherche…</p>
        }
        @case ('erreur') {
          <p class="filtres__message" role="alert">{{ messageRechercheAlbum() }}</p>
          <button mat-menu-item type="button" (click)="$event.stopPropagation(); relancerAlbums()">
            Réessayer
          </button>
        }
        @case ('charge') {
          @for (album of albumsTrouves(); track album.id) {
            <button
              mat-menu-item
              role="menuitemradio"
              type="button"
              [attr.aria-checked]="filtres().albumId === album.id"
              (click)="choisirAlbum(album)"
              (keydown)="clavierPremierAlbum($event, $first)"
            >
              {{ album.titre }}
            </button>
          } @empty {
            <p class="filtres__message" role="status">{{ messageAucunAlbum }}</p>
          }
          @if (albumsTronques()) {
            <p class="filtres__message">{{ messagePreciser }}</p>
          }
        }
      }
    </mat-menu>

    <ng-template #optionMenu let-cle="cle" let-option="option">
      <button
        mat-menu-item
        role="menuitemradio"
        type="button"
        [attr.aria-checked]="valeur(cle) === option.valeur"
        (click)="choisir(cle, option.valeur)"
      >
        @if (valeur(cle) === option.valeur) {
          <mat-icon svgIcon="coche" aria-hidden="true" />
        }
        <span>{{ option.libelle }}</span>
      </button>
    </ng-template>

    <ng-template
      #optionsLues
      let-cle="cle"
      let-lecture="lecture"
      let-options="options"
      let-vide="vide"
      let-reessayer="reessayer"
    >
      @switch (lecture.statut) {
        @case ('erreur') {
          <p class="filtres__message" role="alert">{{ lecture.message }}</p>
          <button mat-menu-item type="button" (click)="$event.stopPropagation(); reessayer()">
            Réessayer
          </button>
        }
        @case ('charge') {
          @for (option of options; track option.valeur) {
            <ng-container *ngTemplateOutlet="optionMenu; context: { cle, option }" />
          } @empty {
            <p class="filtres__message">{{ vide }}</p>
          }
        }
        @default {
          <p class="filtres__message" role="status">Chargement…</p>
        }
      }
    </ng-template>
  `,
})
export class BarreFiltres {
  private readonly api = inject(Api);
  private readonly annuaire = inject(Annuaire);
  private readonly compteCourant = inject(CompteCourant);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Filtres de l'URL. */
  readonly filtres = input.required<FiltresBanque>();
  /** Libellé « forme (Sens) » du Sens filtré, s'il est connu. */
  readonly libelleSens = input<string | null>(null);
  /** Sens filtré absent de la liste chargée : « Sens (inconnu) ». */
  readonly sensInconnu = input(false);
  /** Filtres posés, remplacés (valeur) ou retirés (`null`). */
  readonly changer = output<ChangementFiltres>();
  /** « Effacer les filtres ». */
  readonly effacer = output<void>();

  protected readonly longueurMin = LONGUEUR_MIN_RECHERCHE;
  protected readonly messageAucunAlbum = MESSAGE_AUCUN_ALBUM;
  protected readonly indicationModule = INDICATION_MODULE_SANS_ALBUM;
  private readonly id = prochainId++;
  protected readonly idIndicationModule = `barre-filtres-${this.id}-module`;
  protected readonly idRechercheAlbum = `barre-filtres-${this.id}-album`;

  protected readonly sections: readonly OptionFiltre[] = SECTIONS_FILTRE;
  protected readonly categories: readonly OptionFiltre[] = CATEGORIES_GRAMMATICALES.map(
    (categorie) => ({ valeur: categorie, libelle: LIBELLES_CATEGORIE[categorie] }),
  );
  protected readonly types: readonly OptionFiltre[] = TYPES_IMAGE.map((type) => ({
    valeur: type,
    libelle: LIBELLES_TYPE_IMAGE[type],
  }));

  protected readonly poses = computed(() => filtresPoses(this.filtres()));

  protected readonly themes = signal<Lecture<ThemeDto[]>>({ statut: 'inactif' });
  /** Modules de l'Album `albumId` ; un autre Album relit. */
  protected readonly modules = signal<{ albumId: string | null; lecture: Lecture<ModuleDto[]> }>({
    albumId: null,
    lecture: { statut: 'inactif' },
  });
  /** Titre de l'Album filtré : choisi dans la recherche, ou lu par `lireAlbum` après un rechargement. */
  private readonly album = signal<{ albumId: string | null; lecture: Lecture<string> }>({
    albumId: null,
    lecture: { statut: 'inactif' },
  });
  protected readonly proprietaires = signal<Lecture<string[]>>({ statut: 'inactif' });

  protected readonly texteAlbum = signal('');
  protected readonly rechercheAlbum = signal<RechercheAlbum>({ statut: 'court' });
  protected readonly albumsTrouves = computed(() => {
    const recherche = this.rechercheAlbum();
    return recherche.statut === 'charge' ? recherche.albums : [];
  });
  protected readonly messageRechercheAlbum = computed(() => {
    const recherche = this.rechercheAlbum();
    return recherche.statut === 'erreur' ? recherche.message : '';
  });
  /** Plus d'Albums trouvés que de résultats affichés. */
  protected readonly albumsTronques = computed(() => {
    const recherche = this.rechercheAlbum();
    return recherche.statut === 'charge' && recherche.total > recherche.albums.length;
  });
  protected readonly messagePreciser = MESSAGE_PRECISER_ALBUM;
  private readonly entreesMenus = viewChildren(MatMenuItem);
  private minuterieAlbum: ReturnType<typeof setTimeout> | undefined;
  private minuterieFocusAlbum: ReturnType<typeof setTimeout> | undefined;
  private derniereRechercheAlbum = 0;

  protected readonly optionsThemes = computed<OptionFiltre[]>(() => {
    const lecture = this.themes();
    return lecture.statut === 'charge'
      ? lecture.valeurs.map((theme) => ({ valeur: theme.id, libelle: theme.nom }))
      : [];
  });

  protected readonly optionsModules = computed<OptionFiltre[]>(() => {
    const { albumId, lecture } = this.modules();
    return lecture.statut === 'charge' && albumId === this.filtres().albumId
      ? lecture.valeurs.map((module) => ({ valeur: module.id, libelle: module.nom }))
      : [];
  });

  /** L'enseignant d'abord, sous « Moi », puis les collègues nommés par l'annuaire. */
  protected readonly optionsProprietaires = computed<OptionFiltre[]>(() => {
    const lecture = this.proprietaires();
    if (lecture.statut !== 'charge') {
      return [];
    }
    const moi = this.compteCourant.compte()?.id;
    const options = lecture.valeurs.map((id) => ({
      valeur: id,
      libelle: this.nomProprietaire(id) ?? 'ancien compte',
    }));
    return [
      ...options.filter((option) => option.valeur === moi),
      ...options.filter((option) => option.valeur !== moi),
    ];
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.minuterieAlbum);
      clearTimeout(this.minuterieFocusAlbum);
    });
    // Thème posé par l'URL : la liste des Thèmes le nomme.
    effect(() => {
      if (this.filtres().themeId !== undefined && untracked(this.themes).statut === 'inactif') {
        untracked(() => void this.chargerThemes());
      }
    });
    // Album posé : son titre (s'il n'est pas déjà connu) et ses Modules.
    effect(() => {
      const albumId = this.filtres().albumId;
      if (albumId === undefined) {
        return;
      }
      untracked(() => {
        if (this.album().albumId !== albumId || this.album().lecture.statut === 'erreur') {
          void this.lireTitreAlbum(albumId);
        }
        if (this.modules().albumId !== albumId) {
          void this.chargerModules(albumId);
        }
      });
    });
  }

  /** Valeur du filtre `cle`, ou `undefined` s'il n'est pas posé. */
  protected valeur(cle: CleFiltre): string | undefined {
    return this.filtres()[cle];
  }

  /** Nom du filtre `cle` (« Section »). */
  protected nom(cle: CleFiltre): string {
    return NOMS_FILTRES[cle];
  }

  /** Libellé de la puce `cle`. */
  protected libelle(cle: CleFiltre): string {
    const filtres = this.filtres();
    const valeur = filtres[cle];
    if (valeur === undefined) {
      return NOMS_FILTRES[cle];
    }
    switch (cle) {
      case 'mot':
        return libellePuce(cle, valeur);
      case 'sensId': {
        const sens = this.libelleSens();
        if (sens !== null) {
          return libellePuce(cle, sens);
        }
        return this.sensInconnu() ? libelleInconnu(cle) : libelleChoisi(cle);
      }
      case 'section':
        return libellePuce(
          cle,
          SECTIONS_FILTRE.find((section) => section.valeur === valeur)?.libelle ?? valeur,
        );
      case 'categorie':
        return libellePuce(
          cle,
          this.categories.find((o) => o.valeur === valeur)?.libelle ?? valeur,
        );
      case 'typeImage':
        return libellePuce(cle, this.types.find((o) => o.valeur === valeur)?.libelle ?? valeur);
      case 'themeId':
        return this.libelleLu(
          cle,
          this.themes(),
          (themes) => themes.find((theme) => theme.id === valeur)?.nom,
        );
      case 'albumId': {
        const { albumId, lecture } = this.album();
        return albumId === valeur
          ? this.libelleLu(cle, lecture, (titre) => titre)
          : libelleChoisi(cle);
      }
      case 'moduleId': {
        const { albumId, lecture } = this.modules();
        return albumId === filtres.albumId
          ? this.libelleLu(
              cle,
              lecture,
              (modules) => modules.find((module) => module.id === valeur)?.nom,
            )
          : libelleChoisi(cle);
      }
      case 'proprietaireId': {
        const nom = this.nomProprietaire(valeur);
        if (nom !== null) {
          return libellePuce(cle, nom);
        }
        return this.annuaire.etat().statut === 'charge'
          ? libellePuce(cle, 'ancien compte')
          : libelleChoisi(cle);
      }
    }
  }

  /** Libellé d'une valeur nommée par une lecture : « choisi » en cours, « (inconnu) » en échec ou introuvable. */
  private libelleLu<T>(
    cle: CleFiltre,
    lecture: Lecture<T>,
    nom: (valeurs: T) => string | undefined,
  ): string {
    if (lecture.statut === 'charge') {
      const trouve = nom(lecture.valeurs);
      return trouve === undefined ? libelleInconnu(cle) : libellePuce(cle, trouve);
    }
    return lecture.statut === 'erreur' ? libelleInconnu(cle) : libelleChoisi(cle);
  }

  /** « Moi », le nom de l'annuaire, ou `null` s'il n'y est pas (ou pas encore). */
  private nomProprietaire(id: string): string | null {
    if (this.compteCourant.compte()?.id === id) {
      return PROPRIETAIRE_FILTRE_MOI;
    }
    return this.annuaire.enseignant(id)?.nomAffiche || null;
  }

  /** Menu ouvert : ses options sont lues au besoin ; celui de l'Album donne le focus à sa recherche. */
  protected menuOuvert(cle: CleFiltre): void {
    if (cle === 'themeId' && this.themes().statut !== 'charge') {
      void this.chargerThemes();
    }
    if (cle === 'proprietaireId' && this.proprietaires().statut !== 'charge') {
      void this.chargerProprietaires();
    }
    if (cle === 'albumId') {
      // Après le focus que le menu donne lui-même à sa première entrée.
      clearTimeout(this.minuterieFocusAlbum);
      this.minuterieFocusAlbum = setTimeout(() => this.champAlbum()?.focus());
    }
  }

  private champAlbum(): HTMLInputElement | null {
    return this.hote.nativeElement.ownerDocument.getElementById(
      this.idRechercheAlbum,
    ) as HTMLInputElement | null;
  }

  /** Option choisie : le filtre est posé ou remplacé ; la même valeur ne change rien. */
  protected choisir(cle: CleFiltre, valeur: string): void {
    if (this.valeur(cle) === valeur) {
      return;
    }
    this.changer.emit({ [cle]: valeur });
  }

  /** Album choisi : son titre est gardé pour la puce ; un autre Album retire le Module. */
  protected choisirAlbum(album: AlbumDto): void {
    if (this.filtres().albumId === album.id) {
      // Le même Album, dont le titre n'avait pas pu être lu : la recherche le donne.
      if (this.album().lecture.statut !== 'charge') {
        this.album.set({ albumId: album.id, lecture: { statut: 'charge', valeurs: album.titre } });
      }
      return;
    }
    this.album.set({ albumId: album.id, lecture: { statut: 'charge', valeurs: album.titre } });
    this.changer.emit({ albumId: album.id, moduleId: null });
  }

  /** « Retirer le filtre … » : le focus va à la puce (elle reste), ou à la puce Section pour Mot et Sens. */
  protected retirerFiltre(cle: CleFiltre): void {
    const cible = cle === 'mot' || cle === 'sensId' ? 'section' : cle;
    this.hote.nativeElement.querySelector<HTMLElement>(`button[data-filtre="${cible}"]`)?.focus();
    this.changer.emit(cle === 'albumId' ? { albumId: null, moduleId: null } : { [cle]: null });
  }

  /** Recherche d'Album : Échap et Tab ferment le menu, Flèche bas passe aux résultats ; le reste écrit. */
  protected clavierRechercheAlbum(evenement: KeyboardEvent): void {
    if (evenement.key === 'Escape' || evenement.key === 'Tab') {
      return;
    }
    evenement.stopPropagation();
    if (evenement.key === 'ArrowDown') {
      const premier = (evenement.target as HTMLElement)
        .closest('.mat-mdc-menu-panel')
        ?.querySelector<HTMLElement>('[mat-menu-item]');
      if (premier) {
        evenement.preventDefault();
        // Par l'entrée Material : le gestionnaire de clavier du menu suit, Flèche haut et bas repartent d'elle.
        this.entreesMenus()
          .find((entree) => entree._getHostElement() === premier)
          ?.focus('keyboard');
      }
    }
  }

  /** Flèche haut sur le premier résultat : retour au champ de recherche. */
  protected clavierPremierAlbum(evenement: KeyboardEvent, premier: boolean): void {
    if (premier && evenement.key === 'ArrowUp') {
      evenement.preventDefault();
      evenement.stopPropagation();
      this.champAlbum()?.focus();
    }
  }

  protected taperAlbum(texte: string): void {
    this.texteAlbum.set(texte);
    clearTimeout(this.minuterieAlbum);
    this.minuterieAlbum = setTimeout(() => void this.chercherAlbums(), DELAI_RECHERCHE_ALBUMS_MS);
  }

  protected relancerAlbums(): void {
    void this.chercherAlbums();
    this.champAlbum()?.focus();
  }

  /** Menu de l'Album fermé : la recherche repart de zéro à la prochaine ouverture. */
  protected menuAlbumFerme(): void {
    clearTimeout(this.minuterieAlbum);
    clearTimeout(this.minuterieFocusAlbum);
    this.derniereRechercheAlbum++;
    this.texteAlbum.set('');
    this.rechercheAlbum.set({ statut: 'court' });
  }

  private async chercherAlbums(): Promise<void> {
    const texte = this.texteAlbum().trim();
    const recherche = ++this.derniereRechercheAlbum;
    if (texte.length < LONGUEUR_MIN_RECHERCHE) {
      this.rechercheAlbum.set({ statut: 'court' });
      return;
    }
    this.rechercheAlbum.set({ statut: 'chargement' });
    try {
      const page = await this.api.invoke(rechercherAlbums, { recherche: texte });
      if (recherche === this.derniereRechercheAlbum) {
        this.rechercheAlbum.set({ statut: 'charge', albums: page.elements, total: page.total });
      }
    } catch (erreur) {
      if (recherche === this.derniereRechercheAlbum) {
        this.rechercheAlbum.set({ statut: 'erreur', message: messageErreur(erreur) });
      }
    }
  }

  protected readonly chargerThemes = async (): Promise<void> => {
    if (this.themes().statut === 'chargement') {
      return;
    }
    this.themes.set({ statut: 'chargement' });
    try {
      this.themes.set({ statut: 'charge', valeurs: await this.api.invoke(listerThemes) });
    } catch (erreur) {
      this.themes.set({ statut: 'erreur', message: messageErreur(erreur) });
    }
  };

  protected readonly chargerProprietaires = async (): Promise<void> => {
    if (this.proprietaires().statut === 'chargement') {
      return;
    }
    this.proprietaires.set({ statut: 'chargement' });
    try {
      const ids = await this.api.invoke(listerProprietairesBanque);
      this.proprietaires.set({ statut: 'charge', valeurs: ids });
    } catch (erreur) {
      this.proprietaires.set({ statut: 'erreur', message: messageErreur(erreur) });
    }
  };

  protected readonly rechargerModules = (): void => {
    const albumId = this.filtres().albumId;
    if (albumId !== undefined) {
      void this.chargerModules(albumId);
    }
  };

  private async chargerModules(albumId: string): Promise<void> {
    this.modules.set({ albumId, lecture: { statut: 'chargement' } });
    try {
      const modules = await this.api.invoke(listerModulesDeLAlbum, { id: albumId });
      if (this.modules().albumId === albumId) {
        this.modules.set({ albumId, lecture: { statut: 'charge', valeurs: modules } });
      }
    } catch (erreur) {
      if (this.modules().albumId === albumId) {
        this.modules.set({
          albumId,
          lecture: { statut: 'erreur', message: messageErreur(erreur) },
        });
      }
    }
  }

  private async lireTitreAlbum(albumId: string): Promise<void> {
    this.album.set({ albumId, lecture: { statut: 'chargement' } });
    try {
      const album = await this.api.invoke(lireAlbum, { id: albumId });
      if (this.album().albumId === albumId) {
        this.album.set({ albumId, lecture: { statut: 'charge', valeurs: album.titre } });
      }
    } catch (erreur) {
      if (this.album().albumId === albumId) {
        this.album.set({ albumId, lecture: { statut: 'erreur', message: messageErreur(erreur) } });
      }
    }
  }
}
