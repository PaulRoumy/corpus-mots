import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime, filter, firstValueFrom, from, map, of, switchMap, tap } from 'rxjs';
import { Api } from '../api/api';
import { rechercherAlbums } from '../api/fn/albums-resource/rechercher-albums';
import { ajouterImage } from '../api/fn/images-resource/ajouter-image';
import { televerserImageMotPreparation } from '../api/fn/preparations-resource/televerser-image-mot-preparation';
import { AlbumDto } from '../api/models/album-dto';
import { MesMotsImageDto } from '../api/models/mes-mots-image-dto';
import { MotPreparationDto } from '../api/models/mot-preparation-dto';
import { BandeauErreur } from '../commun/bandeau-erreur/bandeau-erreur';
import { codeErreur, MESSAGES_PAR_CODE, messageErreur } from '../commun/erreurs/message-erreur';
import {
  LIBELLES_TYPE_IMAGE,
  LICENCES_CHOISIES,
  LICENCES_IMPOSEES,
  LicenceChoisie,
  TYPES_IMAGE,
  TypeImage,
} from '../commun/libelles-images';
import { LONGUEUR_MAX_SAISIE } from './longueurs-mot';
import {
  DELAI_RECHERCHE_ALBUMS_MS,
  LONGUEUR_MIN_RECHERCHE,
  MESSAGE_AUCUN_ALBUM,
} from './recherche-albums';

/** Taille maximale d'un fichier téléversé : 20 Mo, comme `corpusmots.limites.taille-fichier` du back. */
export const TAILLE_MAX_FICHIER = 20 * 1024 * 1024;

export const MESSAGE_FICHIER_TROP_LOURD =
  'Ce fichier dépasse 20 Mo. Choisissez un fichier plus léger.';
export const MESSAGE_FICHIER_NON_IMAGE = 'Choisissez un fichier JPEG, PNG ou GIF.';

const TYPES_MIME_ACCEPTES = ['image/jpeg', 'image/png', 'image/gif'];

export const MESSAGE_MOT_REQUIS = "Saisissez le mot illustré par l'image.";

/** Nombre de suggestions d'Albums demandées. */
const NOMBRE_SUGGESTIONS = 20;

/** Refus que « Réessayer » ne changerait pas : le Bandeau n'affiche alors que le message. */
const CODES_REFUS = new Set([
  'requete.invalide',
  'requete.trop_volumineuse',
  'format.non_supporte',
  'image.album_requis',
  'image.album_introuvable',
  'image.mot_invalide',
  'preparation.mot_deja_illustre',
  'ressource.introuvable',
]);

/** Données du Dialogue « Téléverser une image » ouvert depuis la Carte d'un Mot « à illustrer ». */
export interface DonneesTeleverserImage {
  readonly preparationId: string;
  readonly mot: MotPreparationDto;
  /** Titre de l'Album de la Préparation, Album d'origine de l'Image. */
  readonly titreAlbum: string;
}

/** Données du Dialogue « Téléverser une image » ouvert par « + › Ajouter une image » : sans Préparation. */
interface DonneesAjouterImage {
  readonly mode: 'mes-mots';
}

type DonneesDialogue = DonneesTeleverserImage | DonneesAjouterImage;

/** Mot saisi, une fois rogné, non vide. */
function motRenseigne(controle: AbstractControl<string>): ValidationErrors | null {
  return controle.value.trim() === '' ? { motRequis: true } : null;
}

/** Album choisi dans les suggestions (un texte tapé sans choix ne suffit pas). */
function albumChoisi(controle: AbstractControl<string | AlbumDto>): ValidationErrors | null {
  return typeof controle.value === 'object' && controle.value !== null
    ? null
    : { albumRequis: true };
}

interface ErreurAffichee {
  readonly message: string;
  readonly reessayable: boolean;
}

/**
 * Dialogue « Téléverser une image » (story 2.5, partie 1), ouvert par « Téléverser » d'une Carte « à illustrer », sur
 * le patron du Dialogue du Thème du Mot : le Mot en cursive ; le choix du fichier par le bouton « Choisir un fichier »
 * ou, en plus, par glisser-déposer sur la zone, avec un aperçu ; le type d'image, la source, la licence, l'Album
 * d'origine (celui de la Préparation, en lecture seule) et l'auteur ; le Repère de qualité « simple, claire, peu de
 * détails ».
 *
 * La licence suit le type : imposée et affichée en lecture seule pour une photo personnelle (droits d'auteur de
 * l'enseignant) et une image d'album (usage pédagogique de l'album) ; choisie dans le Sélecteur de licence, facultatif,
 * pour une image libre ou de type inconnu, où Pixabay et « autre / inconnue » portent « non partageable ».
 *
 * Un fichier de plus de 20 Mo, ou qui n'est ni JPEG, ni PNG, ni GIF, est refusé sans requête. « Enregistrer » envoie le
 * formulaire et ferme le dialogue avec le Mot renvoyé, illustré ; « Annuler », Échap ou un clic hors du dialogue le
 * ferment sans rien envoyer. Pendant l'envoi, le dialogue ne se ferme pas ; en échec, il reste ouvert et le message
 * s'affiche dans un Bandeau d'erreur.
 *
 * Mode « Mes mots » (story 2.5, partie 2), ouvert par « + › Ajouter une image », sans Préparation : le champ Mot,
 * obligatoire, vient en tête à la place du Mot en cursive ; l'Album d'origine n'apparaît que pour une image d'album, où
 * il se cherche parmi les Albums existants (autocomplete à partir de 2 caractères, sans « Créer l'album »). Un Mot vide
 * ou une image d'album sans Album choisi affichent leur erreur sous le champ, sans requête. « Enregistrer » ferme le
 * dialogue avec l'Image ajoutée dans Mes mots.
 */
@Component({
  selector: 'app-televerser-image',
  imports: [
    BandeauErreur,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './televerser-image-dialogue.scss',
  // Un fichier lâché hors de la zone de dépôt ne doit pas être ouvert par le navigateur (la saisie serait perdue).
  host: {
    '(dragover)': '$event.preventDefault()',
    '(drop)': '$event.preventDefault()',
  },
  template: `
    <h2 mat-dialog-title>Téléverser une image</h2>
    <mat-dialog-content class="televerser">
      @if (carte; as carte) {
        <p class="televerser__mot">
          <span class="cm-visuellement-masque">Mot : </span>{{ carte.mot.forme }}
        </p>
      } @else {
        <mat-form-field class="televerser__champ" subscriptSizing="dynamic">
          <mat-label>Mot</mat-label>
          <input
            #champMot
            matInput
            class="televerser__saisie-mot"
            autocomplete="off"
            required
            [maxlength]="longueurMaxMot"
            [formControl]="mot"
          />
          @if (mot.hasError('motRequis')) {
            <mat-error>{{ messageMotRequis }}</mat-error>
          }
        </mat-form-field>
      }
      @if (erreur(); as affichee) {
        <app-bandeau-erreur
          [message]="affichee.message"
          [reessayable]="affichee.reessayable"
          (reessayer)="enregistrer()"
          (fermer)="erreur.set(null)"
        />
      }
      <div
        class="televerser__depot"
        [class.televerser__depot--survol]="survol()"
        (dragover)="survoler($event)"
        (dragleave)="quitter($event)"
        (drop)="deposer($event)"
      >
        @if (apercu(); as url) {
          <img class="televerser__apercu" [src]="url" alt="Aperçu de l'image choisie" />
        } @else {
          <mat-icon class="televerser__icone" svgIcon="image" aria-hidden="true" />
        }
        <p class="televerser__fichier">
          {{ fichier()?.name ?? 'Déposez une image ici, ou choisissez un fichier.' }}
        </p>
        <button
          matButton="outlined"
          class="televerser__choisir"
          type="button"
          [disabled]="envoiEnCours()"
          (click)="selecteur.click()"
        >
          Choisir un fichier
        </button>
        <input
          #selecteur
          class="cm-visuellement-masque"
          type="file"
          accept="image/jpeg,image/png,image/gif"
          tabindex="-1"
          aria-hidden="true"
          (change)="choisirDepuis(selecteur)"
        />
        <p class="televerser__aide">JPEG, PNG ou GIF, 20 Mo au plus.</p>
      </div>
      <p class="televerser__envoi" aria-live="polite">
        @if (envoiEnCours()) {
          Enregistrement de l'image…
        }
      </p>
      <p class="televerser__repere">simple, claire, peu de détails</p>
      <mat-form-field class="televerser__champ" subscriptSizing="dynamic">
        <mat-label>Type d'image</mat-label>
        <mat-select
          class="televerser__type"
          required
          [value]="type()"
          [disabled]="envoiEnCours()"
          (valueChange)="type.set($event)"
        >
          @for (valeur of types; track valeur) {
            <mat-option [value]="valeur">{{ libellesTypes[valeur] }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field class="televerser__champ" subscriptSizing="dynamic">
        <mat-label>Source</mat-label>
        <input
          matInput
          class="televerser__source"
          autocomplete="off"
          maxlength="500"
          [formControl]="source"
        />
      </mat-form-field>
      @if (licenceImposee(); as imposee) {
        <mat-form-field class="televerser__champ" subscriptSizing="dynamic">
          <mat-label>Licence</mat-label>
          <input matInput class="televerser__licence-imposee" readonly [value]="imposee" />
        </mat-form-field>
      } @else if (type() !== null) {
        <mat-form-field class="televerser__champ" subscriptSizing="dynamic">
          <mat-label>Licence</mat-label>
          <mat-select
            class="televerser__licence"
            [value]="licence()"
            [disabled]="envoiEnCours()"
            (valueChange)="licence.set($event)"
          >
            <mat-option [value]="null">Non renseignée</mat-option>
            @for (choix of licences; track choix.valeur) {
              <mat-option [value]="choix.valeur">
                {{ choix.libelle }}
                @if (!choix.partageable) {
                  <span class="televerser__non-partageable">· non partageable</span>
                }
              </mat-option>
            }
          </mat-select>
        </mat-form-field>
      }
      @if (carte; as carte) {
        <mat-form-field class="televerser__champ" subscriptSizing="dynamic">
          <mat-label>Album d'origine</mat-label>
          <input matInput class="televerser__album" readonly [value]="carte.titreAlbum" />
        </mat-form-field>
      } @else if (type() === 'image_album') {
        <mat-form-field class="televerser__champ" subscriptSizing="dynamic">
          <mat-label>Album d'origine</mat-label>
          <mat-icon matPrefix svgIcon="recherche" aria-hidden="true" />
          <input
            #champAlbum
            matInput
            class="televerser__recherche-album"
            type="text"
            autocomplete="off"
            required
            [formControl]="rechercheAlbum"
            [matAutocomplete]="suggestionsAlbums"
          />
          @if (rechercheAlbum.hasError('albumRequis') && rechercheAlbum.touched) {
            <mat-error>{{ messageAlbumRequis }}</mat-error>
          } @else {
            <mat-hint>Tapez au moins 2 lettres du titre</mat-hint>
          }
          <mat-autocomplete #suggestionsAlbums="matAutocomplete" [displayWith]="titreAlbum">
            @for (suggestion of suggestions(); track suggestion.id) {
              <mat-option [value]="suggestion">
                <span class="televerser__suggestion">
                  <mat-icon svgIcon="livre" aria-hidden="true" />
                  <span>{{ suggestion.titre }}</span>
                </span>
              </mat-option>
            }
            @if (aucunAlbum()) {
              <mat-option disabled>{{ messageAucunAlbum }}</mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>
      }
      <mat-form-field class="televerser__champ" subscriptSizing="dynamic">
        <mat-label>Auteur</mat-label>
        <input
          matInput
          class="televerser__auteur"
          autocomplete="off"
          maxlength="500"
          [formControl]="auteur"
        />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button matButton type="button" [mat-dialog-close]="undefined" [disabled]="envoiEnCours()">
        Annuler
      </button>
      <button
        matButton="filled"
        class="televerser__enregistrer"
        type="button"
        [disabled]="!pret()"
        (click)="enregistrer()"
      >
        Enregistrer
      </button>
    </mat-dialog-actions>
  `,
})
export class TeleverserImageDialogue {
  private readonly api = inject(Api);
  private readonly reference =
    inject<MatDialogRef<TeleverserImageDialogue, MotPreparationDto | MesMotsImageDto>>(
      MatDialogRef,
    );
  private readonly donnees = inject<DonneesDialogue>(MAT_DIALOG_DATA);
  /** Mot de la Carte et Album de sa Préparation, ou `null` en mode « Mes mots ». */
  protected readonly carte: DonneesTeleverserImage | null =
    'mode' in this.donnees ? null : this.donnees;

  protected readonly types = TYPES_IMAGE;
  protected readonly libellesTypes = LIBELLES_TYPE_IMAGE;
  protected readonly licences = LICENCES_CHOISIES;
  /** Comme la saisie rapide : 100 caractères une fois l'article retiré (le back applique la limite exacte). */
  protected readonly longueurMaxMot = LONGUEUR_MAX_SAISIE;
  protected readonly messageMotRequis = MESSAGE_MOT_REQUIS;
  protected readonly messageAlbumRequis = MESSAGES_PAR_CODE['image.album_requis'];
  protected readonly messageAucunAlbum = MESSAGE_AUCUN_ALBUM;

  private readonly champMot = viewChild<ElementRef<HTMLInputElement>>('champMot');
  private readonly champAlbum = viewChild<ElementRef<HTMLInputElement>>('champAlbum');

  protected readonly fichier = signal<File | null>(null);
  /** URL `blob:` locale de l'aperçu du fichier choisi (aucune requête). */
  protected readonly apercu = signal<string | null>(null);
  protected readonly survol = signal(false);
  protected readonly type = signal<TypeImage | null>(null);
  /** Licence choisie dans le Sélecteur ; envoyée seulement pour une image libre ou de type inconnu. */
  protected readonly licence = signal<LicenceChoisie | null>(null);
  protected readonly source = new FormControl('', { nonNullable: true });
  protected readonly auteur = new FormControl('', { nonNullable: true });
  /** Mode « Mes mots » : Mot illustré. */
  protected readonly mot = new FormControl('', { nonNullable: true, validators: motRenseigne });
  /** Mode « Mes mots », image d'album : texte tapé, ou l'Album choisi dans les suggestions. */
  protected readonly rechercheAlbum = new FormControl<string | AlbumDto>('', {
    nonNullable: true,
    validators: albumChoisi,
  });
  protected readonly suggestions = signal<AlbumDto[]>([]);
  /** Vrai quand la dernière recherche lancée (2 caractères au moins) n'a rien trouvé. */
  protected readonly aucunAlbum = signal(false);
  protected readonly envoiEnCours = signal(false);
  protected readonly erreur = signal<ErreurAffichee | null>(null);

  protected readonly licenceImposee = computed(() => {
    const type = this.type();
    return type === null ? null : (LICENCES_IMPOSEES[type] ?? null);
  });
  protected readonly pret = computed(
    () => this.fichier() !== null && this.type() !== null && !this.envoiEnCours(),
  );

  /** Dernier texte d'Album cherché, `null` après un échec de sa recherche. */
  private texteCherche: string | null = null;
  /** Bandeau du dernier échec de recherche d'Album, effacé par la recherche réussie suivante. */
  private erreurRecherche: ErreurAffichee | null = null;

  protected readonly titreAlbum = (valeur: string | AlbumDto | null): string =>
    typeof valeur === 'string' ? valeur : (valeur?.titre ?? '');

  constructor() {
    const destruction = inject(DestroyRef);
    destruction.onDestroy(() => this.poserApercu(null));
    if (this.carte === null) {
      this.rechercheAlbum.valueChanges
        .pipe(
          map((valeur) => (typeof valeur === 'string' ? valeur.trim() : null)),
          filter((texte) => texte !== null),
          debounceTime(DELAI_RECHERCHE_ALBUMS_MS),
          // Comme distinctUntilChanged, sauf après un échec : le même texte retapé relance la recherche.
          filter((texte) => texte !== this.texteCherche),
          tap((texte) => (this.texteCherche = texte)),
          switchMap((texte) =>
            texte.length < LONGUEUR_MIN_RECHERCHE ? of(null) : from(this.chercherAlbums(texte)),
          ),
          takeUntilDestroyed(destruction),
        )
        .subscribe((albums) => {
          this.suggestions.set(albums ?? []);
          this.aucunAlbum.set(albums !== null && albums.length === 0);
        });
    }
  }

  /**
   * Albums trouvés pour `texte`, ou `null` en échec : Bandeau d'erreur, et le même texte retapé relance la recherche.
   * Une recherche réussie efface le Bandeau d'un échec de recherche.
   */
  private async chercherAlbums(texte: string): Promise<AlbumDto[] | null> {
    try {
      const page = await this.api.invoke(rechercherAlbums, {
        recherche: texte,
        taille: NOMBRE_SUGGESTIONS,
      });
      if (this.erreur() === this.erreurRecherche) {
        this.erreur.set(null);
      }
      this.erreurRecherche = null;
      return page.elements;
    } catch (erreur) {
      if (this.texteCherche === texte) {
        this.texteCherche = null;
      }
      this.erreurRecherche = { message: messageErreur(erreur), reessayable: false };
      this.erreur.set(this.erreurRecherche);
      return null;
    }
  }

  protected choisirDepuis(selecteur: HTMLInputElement): void {
    const choisi = selecteur.files?.[0];
    // Le même fichier, choisi de nouveau après un refus, redéclenche `change`.
    selecteur.value = '';
    if (choisi !== undefined) {
      this.choisir(choisi);
    }
  }

  protected survoler(evenement: DragEvent): void {
    evenement.preventDefault();
    this.survol.set(true);
  }

  /** Sortie de la zone : ignorée quand le pointeur passe sur un de ses éléments (sinon la surbrillance clignote). */
  protected quitter(evenement: DragEvent): void {
    const zone = evenement.currentTarget as HTMLElement;
    const vers = evenement.relatedTarget;
    if (vers instanceof Node && zone.contains(vers)) {
      return;
    }
    this.survol.set(false);
  }

  protected deposer(evenement: DragEvent): void {
    evenement.preventDefault();
    this.survol.set(false);
    const depose = evenement.dataTransfer?.files?.[0];
    if (depose !== undefined) {
      this.choisir(depose);
    }
  }

  /**
   * Fichier choisi ou déposé : refusé sans requête s'il dépasse 20 Mo ou n'est ni JPEG, ni PNG, ni GIF (un type
   * inconnu du navigateur est laissé au back) ; sinon il remplace le précédent, avec son aperçu.
   */
  choisir(choisi: File): void {
    if (this.envoiEnCours()) {
      return;
    }
    if (choisi.size > TAILLE_MAX_FICHIER) {
      this.erreur.set({ message: MESSAGE_FICHIER_TROP_LOURD, reessayable: false });
      return;
    }
    if (choisi.type !== '' && !TYPES_MIME_ACCEPTES.includes(choisi.type)) {
      this.erreur.set({ message: MESSAGE_FICHIER_NON_IMAGE, reessayable: false });
      return;
    }
    this.erreur.set(null);
    this.fichier.set(choisi);
    this.poserApercu(URL.createObjectURL(choisi));
  }

  /**
   * Envoie le fichier et sa Carte d'identité ; ferme avec le Mot renvoyé, illustré, ou en mode « Mes mots » avec
   * l'Image ajoutée. En mode « Mes mots », un Mot vide ou une image d'album sans Album choisi affichent leur erreur et
   * prennent le focus, sans requête.
   */
  async enregistrer(): Promise<void> {
    const fichier = this.fichier();
    const type = this.type();
    if (fichier === null || type === null || this.envoiEnCours()) {
      return;
    }
    const album = this.carte === null ? this.albumVerifie(type) : null;
    if (album === undefined) {
      return;
    }
    this.envoiEnCours.set(true);
    this.reference.disableClose = true;
    this.erreur.set(null);
    const licence = this.licenceImposee() === null ? this.licence() : null;
    const carteIdentite = {
      fichier,
      typeImage: type,
      source: texte(this.source.value),
      licence: licence ?? undefined,
      auteur: texte(this.auteur.value),
    };
    try {
      const resultat =
        this.carte !== null
          ? await this.api.invoke(televerserImageMotPreparation, {
              id: this.carte.preparationId,
              motPreparationId: this.carte.mot.id,
              body: carteIdentite,
            })
          : await this.api.invoke(ajouterImage, {
              body: { ...carteIdentite, mot: this.mot.value.trim(), albumId: album?.id },
            });
      this.reference.close(resultat);
    } catch (erreur) {
      const code = codeErreur(erreur);
      this.erreur.set({
        message: messageErreur(erreur),
        reessayable: code === null || !CODES_REFUS.has(code),
      });
    } finally {
      this.envoiEnCours.set(false);
      this.reference.disableClose = false;
    }
  }

  /**
   * Mode « Mes mots » : l'Album d'origine à envoyer (`null` hors image d'album), ou `undefined` si le Mot ou l'Album
   * manquent ; l'erreur s'affiche alors sous chaque champ fautif, et le premier prend le focus.
   */
  private albumVerifie(type: TypeImage): AlbumDto | null | undefined {
    const albumRequis = type === 'image_album';
    this.mot.markAsTouched();
    if (albumRequis) {
      this.rechercheAlbum.markAsTouched();
    }
    const album = albumRequis ? this.rechercheAlbum.value : null;
    // Seul le Mot vide bloque ici ; la longueur, plafonnée par le champ, est vérifiée par le back.
    if (this.mot.hasError('motRequis')) {
      this.champMot()?.nativeElement.focus();
      return undefined;
    }
    if (typeof album === 'string') {
      this.champAlbum()?.nativeElement.focus();
      return undefined;
    }
    return album;
  }

  private poserApercu(url: string | null): void {
    const precedente = this.apercu();
    if (precedente !== null) {
      URL.revokeObjectURL(precedente);
    }
    this.apercu.set(url);
  }
}

/** Texte rogné, `undefined` s'il est vide (champ non envoyé). */
function texte(saisie: string): string | undefined {
  const rogne = saisie.trim();
  return rogne === '' ? undefined : rogne;
}

/**
 * Ouvre le Dialogue « Téléverser une image » et rend le Mot illustré, ou `undefined` s'il est fermé sans rien
 * enregistrer. Le focus revient à `declencheur` (le bouton « Téléverser » de la Carte) à la fermeture sans
 * enregistrement.
 */
export async function ouvrirDialogueTeleverserImage(
  injecteur: Injector,
  donnees: DonneesTeleverserImage,
  declencheur?: HTMLElement,
): Promise<MotPreparationDto | undefined> {
  return (await ouvrir(injecteur, donnees, '.televerser__choisir', declencheur)) as
    MotPreparationDto | undefined;
}

/**
 * Ouvre le Dialogue « Téléverser une image » en mode « Mes mots » (« + › Ajouter une image ») et rend l'Image ajoutée,
 * ou `undefined` s'il est fermé sans rien enregistrer. Le champ Mot prend le focus, qui revient à `declencheur` à la
 * fermeture.
 */
export async function ouvrirDialogueAjouterImage(
  injecteur: Injector,
  declencheur?: HTMLElement,
): Promise<MesMotsImageDto | undefined> {
  return (await ouvrir(injecteur, { mode: 'mes-mots' }, '.televerser__saisie-mot', declencheur)) as
    MesMotsImageDto | undefined;
}

function ouvrir(
  injecteur: Injector,
  donnees: DonneesDialogue,
  autoFocus: string,
  declencheur?: HTMLElement,
): Promise<MotPreparationDto | MesMotsImageDto | undefined> {
  const reference = injecteur
    .get(MatDialog)
    .open<TeleverserImageDialogue, DonneesDialogue, MotPreparationDto | MesMotsImageDto>(
      TeleverserImageDialogue,
      { data: donnees, autoFocus, restoreFocus: declencheur ?? true },
    );
  return firstValueFrom(reference.afterClosed());
}
