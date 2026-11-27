import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Api } from '../api/api';
import { fichierImage } from '../api/fn/images-resource/fichier-image';
import { choisirImageMotPreparation } from '../api/fn/preparations-resource/choisir-image-mot-preparation';
import { proposerImagesMotPreparation } from '../api/fn/preparations-resource/proposer-images-mot-preparation';
import { DetectionImageDto } from '../api/models/detection-image-dto';
import { MotPreparationDto } from '../api/models/mot-preparation-dto';
import { Annuaire } from '../commun/annuaire';
import { BadgeTypeImage } from '../commun/badge-type-image/badge-type-image';
import { CompteCourant } from '../commun/compte-courant';
import { CODES_IMAGE_INDISPONIBLE } from '../commun/erreurs/codes-image-indisponible';
import { codeErreur, messageErreur } from '../commun/erreurs/message-erreur';
import { ChargementImage, ImageSecurisee } from '../commun/image-securisee/image-securisee';
import { BasculeSelection, CaseSelection } from '../commun/selection/case-selection';
import { LIBELLE_IMAGE_RETIREE } from '../commun/versement/raisons-versement';
import { CODES_A_RECHARGER, SuggestionsArasaac } from './suggestions-arasaac';
import { libelleProprietaire, nomProposition, VignetteProposition } from './vignette-proposition';

/** Nombre maximal d'Images existantes montrées sur une Carte « à illustrer ». */
export const NOMBRE_MAX_IMAGES_EXISTANTES = 3;

/** Message de la Carte quand l'Image existante choisie n'est plus proposable : les Images sont relues. */
export const MESSAGE_IMAGE_EXISTANTE_INDISPONIBLE = "Cette image n'est plus disponible.";

/**
 * Carte de Mot de la Grille d'une Préparation (story 2.3). Tant que le Mot n'a pas d'Image, c'est une Carte « à
 * illustrer » (key-preparation.html › `.todo`) : fond et bordure tirets « à illustrer » ; à gauche, vignette vide avec
 * « + », bouton « Choisir une image pour « forme » » qui émet `choisirImage` (la page ouvre le Panneau de choix
 * d'Image), Mot en cursive, badge crayon « à illustrer » ; à droite, les suggestions ARASAAC (story 2.4), dont un clic
 * illustre le Mot et émet `illustre` (ou `aRecharger` si le Mot a été illustré ou retiré entre-temps, partie 2). La page
 * lui fait occuper trois colonnes de la Grille. Sous les suggestions, le bouton texte « Téléverser » émet `televerser` : la
 * page ouvre le Dialogue « Téléverser une image » (story 2.5, partie 1).
 *
 * Images existantes (story 2.11, partie 3) : avant les suggestions ARASAAC, la Carte « à illustrer » montre au plus
 * trois Images proposables du Mot, de tous ses Sens, dans l'ordre du back (`GET …/propositions`, classement de la
 * détection, FR-9), avec le rendu du Panneau de choix (`VignetteProposition`, Marque « déjà utilisée » comprise). Chaque
 * vignette est un bouton « Illustrer « forme » avec l'image : … » ; un clic lie l'Image au Mot (`PUT …/image`, origine
 * `reutilisee`) et le Mot renvoyé sort par `illustre`. Image devenue indisponible : les Images sont relues, puis
 * « Cette image n'est plus disponible. » ; Mot illustré ou retiré entre-temps : `aRecharger` ; autre échec : message
 * sous les Images. Les pictogrammes ARASAAC dont l'enseignant possède déjà l'Image pour le Sens retenu (une Image
 * proposable à lui, de ce Sens, portant cet `idArasaac`) sont marqués « déjà utilisée » par les suggestions ; c'est le
 * back qui décide de réutiliser l'Image au choix du pictogramme.
 *
 * Une fois illustrée, la Carte occupe une colonne (key-preparation.html › `.wc`) : vignette de la miniature de l'Image,
 * chargée en `blob` par le client généré (`?taille=miniature`, AD-23), d'alternative « Mot, Sens » ; Badge de type
 * d'image, suivi du Badge d'état « versée » pour une Image versée dont l'enseignant connecté est le propriétaire
 * (story 3.3 ; FR-18) ; Mot en cursive. Une Image liée que son propriétaire ne verse plus (`aRemplacer = retiree`,
 * story 3.5) est grisée et porte le badge « image retirée de la banque » (triangle d'alerte) ; sa vignette ouvre le
 * Panneau de choix comme toute autre, pour en choisir une autre. Une miniature qui ne se charge pas laisse voir l'icône
 * d'image. La vignette est un bouton « Changer l'image de « forme » », qui émet `choisirImage` : la page ouvre le
 * Panneau de choix d'Image (story 2.7, partie 3), d'où l'on ouvre la Carte d'identité (story 2.6).
 *
 * Le bouton icône « Retirer « forme » de la préparation » (croix), toujours visible, émet `retirer` : le retrait se
 * fait sans confirmation et s'annule par le Bandeau « Annuler » (story 2.3, partie 2).
 *
 * Le Thème du Mot (story 2.3, partie 3) s'affiche en bouton texte (« cuisine », ou « Sans thème »), tronqué par une
 * ellipse ; son nom accessible porte le nom complet (« Thème de « citrouille » : cuisine »). Il émet `changerTheme` :
 * la page ouvre le Dialogue du Thème. Tant que les Thèmes de l'école ne sont pas chargés (`theme` indéfini), il n'est
 * pas affiché.
 *
 * Case de sélection (story 3.3, partie 3b) : la première de la Carte dans l'ordre de tabulation, en haut à gauche,
 * nommée « Sélectionner « forme » ». Elle paraît au survol et au focus de la Carte, et sur toutes les Cartes dès qu'une
 * sélection existe (`selectionActive`) ; toujours sur un écran sans survol. Son geste (`basculerSelection`, Maj+clic :
 * plage) n'ouvre rien. La Carte sélectionnée prend le fond `primary-container` et l'anneau `primary` de 2 px
 * (DESIGN.md › case-selection), avec la case cochée : jamais la couleur seule.
 */
@Component({
  selector: 'app-carte-mot',
  imports: [
    BadgeTypeImage,
    CaseSelection,
    ImageSecurisee,
    MatButtonModule,
    MatIconModule,
    SuggestionsArasaac,
    VignetteProposition,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './carte-mot.scss',
  host: {
    '[class.carte-mot--a-illustrer]': '!mot().illustre',
    '[class.carte-mot--selectionnee]': 'selectionnee()',
    '[class.carte-mot--selection-active]': 'selectionActive()',
    '[class.carte-mot--retiree]': 'retiree()',
  },
  template: `
    <app-case-selection
      class="carte-mot__case"
      [nom]="nomSelection()"
      [cochee]="selectionnee()"
      [figee]="selectionFigee()"
      (basculer)="basculerSelection.emit($event)"
    />
    <button
      #boutonRetirer
      matIconButton
      class="carte-mot__retirer"
      type="button"
      [attr.aria-label]="'Retirer « ' + mot().forme + ' » de la préparation'"
      disabledInteractive
      [disabled]="retraitIndisponible()"
      (click)="retraitIndisponible() || retirer.emit()"
    >
      <mat-icon svgIcon="fermer" aria-hidden="true" />
    </button>
    <div class="carte-mot__gauche">
      @if (chargerVignette(); as charger) {
        <button
          #boutonVignette
          class="carte-mot__image"
          type="button"
          [attr.aria-label]="nomAccessibleVignette()"
          [attr.aria-describedby]="idAlternative()"
          (click)="choisirImage.emit()"
        >
          @if (echecVignette()) {
            <mat-icon class="carte-mot__repli" svgIcon="image" aria-hidden="true" />
          } @else {
            <img
              class="carte-mot__miniature"
              [appImageSecurisee]="charger"
              [alt]="alternative()"
              (echec)="echecVignette.set(true)"
            />
          }
        </button>
        <span class="cm-visuellement-masque" [id]="idAlternative()">{{ alternative() }}</span>
      } @else {
        <button
          #boutonVignette
          class="carte-mot__vignette"
          type="button"
          [attr.aria-label]="'Choisir une image pour « ' + mot().forme + ' »'"
          (click)="choisirImage.emit()"
        >
          <mat-icon svgIcon="plus" aria-hidden="true" />
        </button>
      }
      <span class="carte-mot__mot">{{ mot().forme }}</span>
      @if (mot().image; as image) {
        <app-badge-type-image class="carte-mot__type" [type]="image.typeImage" />
        @if (versee()) {
          <span class="carte-mot__versee">
            <mat-icon svgIcon="coche" aria-hidden="true" />
            versée
          </span>
        }
        @if (retiree()) {
          <span class="carte-mot__retiree">
            <mat-icon svgIcon="alerte" aria-hidden="true" />
            {{ libelleRetiree }}
          </span>
        }
      }
      @if (!mot().illustre) {
        <span class="carte-mot__etat">
          <mat-icon svgIcon="crayon" aria-hidden="true" />
          à illustrer
        </span>
      }
      @if (theme() !== undefined) {
        <button
          #boutonTheme
          class="carte-mot__theme"
          type="button"
          [class.carte-mot__theme--vide]="theme() === null"
          [attr.aria-label]="nomAccessibleTheme()"
          (click)="changerTheme.emit()"
        >
          {{ theme() ?? 'Sans thème' }}
        </button>
      }
    </div>
    @if (!mot().illustre) {
      <div class="carte-mot__droite">
        @if (imagesExistantes().length > 0) {
          <ul
            class="carte-mot__images"
            [attr.aria-label]="'Images existantes pour « ' + mot().forme + ' »'"
            [attr.aria-busy]="choixImageEnCours() !== null ? 'true' : null"
          >
            @for (image of imagesExistantes(); track image.id) {
              <li>
                <button
                  appVignetteProposition
                  class="carte-mot__image-existante"
                  type="button"
                  [image]="image"
                  [forme]="mot().forme"
                  [afficherSens]="plusieursSens()"
                  [choisie]="choixImageEnCours() === image.id"
                  [attr.aria-label]="nomImageExistante(image)"
                  [attr.aria-disabled]="choixImageEnCours() !== null ? 'true' : null"
                  (click)="choisirImageExistante(image)"
                ></button>
              </li>
            }
          </ul>
        }
        @if (messageImages(); as message) {
          <p class="carte-mot__message" role="alert">{{ message }}</p>
        }
        <app-suggestions-arasaac
          [mot]="mot().forme"
          [preparationId]="preparationId()"
          [motPreparationId]="mot().id"
          [idsDejaPossedes]="idsDejaPossedes()"
          (illustre)="illustre.emit($event)"
          (aRecharger)="aRecharger.emit($event)"
        />
        <button
          #boutonTeleverser
          matButton
          class="carte-mot__televerser"
          type="button"
          [attr.aria-label]="'Téléverser une image pour « ' + mot().forme + ' »'"
          (click)="televerser.emit()"
        >
          Téléverser
        </button>
      </div>
    }
  `,
})
export class CarteMot {
  readonly mot = input.required<MotPreparationDto>();
  /** Préparation du Mot, pour le choix d'un pictogramme ARASAAC. */
  readonly preparationId = input.required<string>();
  /** Nom du Thème du Mot, `null` sans thème, indéfini tant que les Thèmes ne sont pas chargés. */
  readonly theme = input<string | null | undefined>(undefined);
  readonly retirer = output<void>();
  readonly changerTheme = output<void>();
  readonly televerser = output<void>();
  /** Clic ou Entrée sur la vignette, illustrée ou « + » : la page ouvre le Panneau de choix d'Image. */
  readonly choisirImage = output<void>();
  /** Mot illustré par un pictogramme ARASAAC choisi dans les suggestions : la page remplace la Carte. */
  readonly illustre = output<MotPreparationDto>();
  /** Mot illustré ou retiré entre-temps (autre onglet), avec le message traduit : la page recharge la Préparation. */
  readonly aRecharger = output<string>();
  /** Vrai si le Mot est dans la sélection (story 3.3). */
  readonly selectionnee = input(false);
  /** Vrai dès qu'une sélection existe dans la page : la Case de sélection reste visible. */
  readonly selectionActive = input(false);
  /** Vrai pendant une action en lot : la Case de sélection ne bascule plus. */
  readonly selectionFigee = input(false);
  /** Vrai pendant un retrait en lot : « Retirer » reste focusable mais attend (un seul Bandeau « Annuler » à la fois). */
  readonly retraitIndisponible = input(false);
  /** Clic ou Espace sur la Case de sélection (Maj+clic : plage). */
  readonly basculerSelection = output<BasculeSelection>();

  /** Nom de la Case de sélection : « Sélectionner « citrouille » ». */
  protected readonly nomSelection = computed(() => `Sélectionner « ${this.mot().forme} »`);

  private readonly api = inject(Api);
  private readonly annuaire = inject(Annuaire);
  private readonly compteCourant = inject(CompteCourant);

  /** Images proposables du Mot, de tous ses Sens, dans l'ordre du back ; vide tant qu'elles ne sont pas lues. */
  private readonly propositions = signal<readonly DetectionImageDto[]>([]);
  /** Vrai si le Mot a plusieurs Sens visibles : chaque vignette montre le Sens de son Image. */
  protected readonly plusieursSens = signal(false);
  /** Images existantes montrées par la Carte « à illustrer », au plus trois. */
  protected readonly imagesExistantes = computed(() =>
    this.mot().illustre ? [] : this.propositions().slice(0, NOMBRE_MAX_IMAGES_EXISTANTES),
  );
  /**
   * Identifiants ARASAAC des Images proposables de l'enseignant connecté pour le Sens retenu : leurs suggestions sont
   * marquées « déjà utilisée ». Les Images de collègues et celles d'un autre Sens ne comptent pas.
   */
  protected readonly idsDejaPossedes = computed<ReadonlySet<number>>(() => {
    const moi = this.compteCourant.compte()?.id;
    const sensId = this.mot().sens.id;
    const ids = new Set<number>();
    for (const image of this.propositions()) {
      if (image.proprietaireId === moi && image.sens.id === sensId && image.idArasaac != null) {
        ids.add(image.idArasaac);
      }
    }
    return ids;
  });
  /** Image existante en cours de liaison au Mot, `null` sinon : toutes les vignettes attendent. */
  protected readonly choixImageEnCours = signal<string | null>(null);
  /** Échec du choix d'une Image existante, `null` sans échec. */
  protected readonly messageImages = signal<string | null>(null);
  /** Numéro de la dernière lecture des Images : une réponse plus ancienne est ignorée. */
  private derniereLecture = 0;

  constructor() {
    // Lecture des Images existantes à chaque Carte « à illustrer » (nouveau Mot, ou Mot redevenu « à illustrer »).
    // Seuls l'identifiant du Mot et son état « illustré » comptent : un nouvel objet Mot égal (Thème changé,
    // relecture de la page) ne relit rien.
    const motPreparationIdCourant = computed(() => this.mot().id);
    const aIllustrerCourant = computed(() => !this.mot().illustre);
    effect(() => {
      const preparationId = this.preparationId();
      const motPreparationId = motPreparationIdCourant();
      const aIllustrer = aIllustrerCourant();
      untracked(() => {
        this.messageImages.set(null);
        if (aIllustrer) {
          void this.lireImages(preparationId, motPreparationId);
        } else {
          this.derniereLecture++;
          this.propositions.set([]);
        }
      });
    });
  }

  /** Badge « versée » : Image versée de l'enseignant connecté, jamais celle d'un collègue réutilisée. */
  protected readonly versee = computed(() => {
    const image = this.mot().image;
    return image?.etat === 'versee' && image.proprietaireId === this.compteCourant.compte()?.id;
  });

  /** Image liée que son propriétaire ne verse plus : vignette grisée et badge « image retirée de la banque ». */
  protected readonly retiree = computed(() => this.mot().image?.aRemplacer === 'retiree');
  protected readonly libelleRetiree = LIBELLE_IMAGE_RETIREE;

  /** Image liée, par son seul identifiant : la vignette ne se recharge que si l'Image change. */
  private readonly imageId = computed(() => this.mot().image?.id ?? null);
  /** Chargement de la miniature, d'identité stable tant que l'Image ne change pas ; `null` sans Image. */
  protected readonly chargerVignette = computed<ChargementImage | null>(() => {
    const id = this.imageId();
    return id === null ? null : () => this.api.invoke(fichierImage, { id, taille: 'miniature' });
  });
  /** Vrai si la miniature n'a pas pu être chargée ; revient à faux quand l'Image change. */
  protected readonly echecVignette = linkedSignal({
    source: this.imageId,
    computation: () => false,
  });
  /** Alternative de la vignette : « citrouille, légume ». */
  protected readonly alternative = computed(
    () => `${this.mot().forme}, ${this.mot().sens.libelle}`,
  );

  /** Identifiant de l'alternative « Mot, Sens », description du bouton de la vignette. */
  protected readonly idAlternative = computed(() => `carte-mot-alternative-${this.mot().id}`);

  /** Nom du bouton de la vignette d'une Carte illustrée : « Changer l'image de « citrouille » ». */
  protected readonly nomAccessibleVignette = computed(
    () => `Changer l'image de « ${this.mot().forme} »`,
  );

  protected readonly nomAccessibleTheme = computed(
    () => `Thème de « ${this.mot().forme} » : ${this.theme() ?? 'sans thème'}`,
  );

  private readonly boutonRetirer = viewChild.required('boutonRetirer', {
    read: ElementRef<HTMLButtonElement>,
  });
  private readonly boutonTheme = viewChild('boutonTheme', { read: ElementRef<HTMLButtonElement> });
  private readonly boutonVignette = viewChild('boutonVignette', {
    read: ElementRef<HTMLButtonElement>,
  });
  private readonly boutonTeleverser = viewChild('boutonTeleverser', {
    read: ElementRef<HTMLButtonElement>,
  });

  /** « Illustrer « citrouille » avec l'image : citrouille, légume, vous, déjà utilisée, … ». */
  protected nomImageExistante(image: DetectionImageDto): string {
    const forme = this.mot().forme;
    const proprietaire = libelleProprietaire(
      image.proprietaireId,
      this.compteCourant,
      this.annuaire,
    );
    return `Illustrer « ${forme} » avec l'image : ${nomProposition(forme, image, proprietaire)}`;
  }

  /** Lie l'Image existante au Mot (origine `reutilisee`) ; sans effet pendant un autre envoi. */
  protected async choisirImageExistante(image: DetectionImageDto): Promise<void> {
    if (this.choixImageEnCours() !== null) {
      return;
    }
    const preparationId = this.preparationId();
    const motPreparationId = this.mot().id;
    this.choixImageEnCours.set(image.id);
    this.messageImages.set(null);
    let illustre: MotPreparationDto;
    try {
      illustre = await this.api.invoke(choisirImageMotPreparation, {
        id: preparationId,
        motPreparationId,
        body: { imageId: image.id },
      });
    } catch (erreur) {
      this.choixImageEnCours.set(null);
      const code = codeErreur(erreur) ?? '';
      if (CODES_A_RECHARGER.has(code)) {
        this.aRecharger.emit(messageErreur(erreur));
      } else if (CODES_IMAGE_INDISPONIBLE.has(code)) {
        await this.lireImages(preparationId, motPreparationId);
        this.messageImages.set(MESSAGE_IMAGE_EXISTANTE_INDISPONIBLE);
      } else {
        this.messageImages.set(messageErreur(erreur));
      }
      return;
    }
    this.choixImageEnCours.set(null);
    // Hors du try : une erreur de la page n'est pas prise pour un échec de la requête.
    this.illustre.emit(illustre);
  }

  /** Lit les Images proposables du Mot, de tous ses Sens ; en échec, la Carte n'en montre aucune. */
  private async lireImages(preparationId: string, motPreparationId: string): Promise<void> {
    const numero = ++this.derniereLecture;
    try {
      const propositions = await this.api.invoke(proposerImagesMotPreparation, {
        id: preparationId,
        motPreparationId,
      });
      if (numero !== this.derniereLecture) {
        return;
      }
      this.propositions.set(propositions.images);
      this.plusieursSens.set(propositions.sens.length > 1);
      const moi = this.compteCourant.compte()?.id;
      if (propositions.images.some((image) => image.proprietaireId !== moi)) {
        // L'Annuaire n'est lu qu'à la première Image d'un collègue.
        void this.annuaire.charger();
      }
    } catch {
      if (numero === this.derniereLecture) {
        this.propositions.set([]);
      }
    }
  }

  /** Donne le focus au bouton « Retirer » : après le retrait d'une Carte voisine, ou le rétablissement de celle-ci. */
  focusRetirer(): void {
    this.boutonRetirer().nativeElement.focus();
  }

  /** Bouton du Thème, auquel le focus revient à la fermeture du Dialogue du Thème. */
  elementTheme(): HTMLButtonElement | undefined {
    return this.boutonTheme()?.nativeElement;
  }

  /**
   * Vignette de la Carte (miniature, ou « + » d'une Carte « à illustrer »), à laquelle le focus revient à la fermeture
   * du Panneau de choix d'Image ou du Panneau Carte d'identité.
   */
  elementVignette(): HTMLButtonElement | undefined {
    return this.boutonVignette()?.nativeElement;
  }

  /** Bouton « Téléverser », auquel le focus revient à la fermeture du Dialogue sans enregistrement. */
  elementTeleverser(): HTMLButtonElement | undefined {
    return this.boutonTeleverser()?.nativeElement;
  }
}
