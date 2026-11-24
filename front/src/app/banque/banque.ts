import { LiveAnnouncer } from '@angular/cdk/a11y';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatChipListboxChange, MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { map } from 'rxjs';
import { Api } from '../api/api';
import { listerImagesBanque } from '../api/fn/images-resource/lister-images-banque';
import { CarteIdentiteImageDto } from '../api/models/carte-identite-image-dto';
import { ImageBanqueDto } from '../api/models/image-banque-dto';
import { Annuaire } from '../commun/annuaire';
import { BandeauErreur } from '../commun/bandeau-erreur/bandeau-erreur';
import { BarreActionsLot } from '../commun/barre-actions-lot/barre-actions-lot';
import { CarteIdentite } from '../commun/carte-identite/carte-identite';
import { CompteCourant } from '../commun/compte-courant';
import { messageErreur } from '../commun/erreurs/message-erreur';
import { EtatVide } from '../commun/etat-vide/etat-vide';
import { categorieGrammaticale, LIBELLES_CATEGORIE } from '../commun/libelles-images';
import { BasculeSelection } from '../commun/selection/case-selection';
import { echapDeSaisieOuMenu } from '../commun/selection/echap';
import { Selection } from '../commun/selection/selection';
import { Squelette } from '../commun/squelette/squelette';
import { LIBELLE_VERSEMENT_EN_COURS } from '../commun/versement/raisons-versement';
import { RecapitulatifVersementLot } from '../commun/versement/recapitulatif-versement-lot';
import { VersementLot } from '../commun/versement/versement-lot';
import { AjouterImage } from '../preparations/ajouter-image';
import { BarreFiltres } from './barre-filtres';
import {
  ChangementFiltres,
  CLES_FILTRES,
  FiltresBanque,
  filtresDeLUrl,
  filtresPoses,
  memesFiltres,
} from './filtres-banque';
import { nomImage } from '../commun/nom-image';
import { ID_PANNEAU_CARTE_IDENTITE, VignetteBanque } from './vignette-banque';

/** Provenance des Images de la Banque, même valeur dans l'URL et dans l'API. */
export type Provenance = 'mes-mots' | 'banque' | 'tout';

/** Puces de provenance, dans l'ordre affiché. */
export const PROVENANCES: readonly { readonly valeur: Provenance; readonly libelle: string }[] = [
  { valeur: 'mes-mots', libelle: 'Mes mots' },
  { valeur: 'banque', libelle: "Banque de l'école" },
  { valeur: 'tout', libelle: 'Tout' },
];

/** Images lues par page : la taille de page maximale du back. */
export const TAILLE_PAGE_BANQUE = 100;

/** Propriétaire affiché pour l'enseignant connecté. */
export const PROPRIETAIRE_MOI = 'vous';
/** Propriétaire absent de l'annuaire chargé (compte supprimé). */
export const PROPRIETAIRE_ANCIEN = 'ancien compte';

/** Provenance lue dans l'URL : absente ou inconnue, Mes mots. */
export function provenanceDeLUrl(valeur: string | null): Provenance {
  return PROVENANCES.find((provenance) => provenance.valeur === valeur)?.valeur ?? 'mes-mots';
}

/** « 1 image », « 84 images ». */
export function libelleImages(nombre: number): string {
  return `${nombre} image${nombre > 1 ? 's' : ''}`;
}

/** Images d'un même Sens d'un même Mot, dans l'ordre reçu. */
interface GroupeBanque {
  readonly sensId: string;
  readonly forme: string;
  readonly sensLibelle: string;
  readonly categorie: string | null;
  readonly images: ImageBanqueDto[];
}

/** Échec d'une lecture, affiché dans un Bandeau d'erreur avec « Réessayer ». */
interface EchecBanque {
  readonly message: string;
  readonly reessayer: () => void;
}

/** L'Image telle qu'après son versement : `versee`, badge « versée », plus rien à verser. */
function imageVersee(image: ImageBanqueDto): ImageBanqueDto {
  return image.etat === 'versee' && image.versee && image.versabilite == null
    ? image
    : { ...image, etat: 'versee', versee: true, versabilite: null };
}

/**
 * Rubrique Banque (story 3.1, partie 1, FR-18) : une seule Banque, ouverte sur Mes mots. La Puce de provenance (Mes
 * mots, Banque de l'école, Tout), en choix unique, est reflétée dans l'URL (`?provenance=`). La grille regroupe les
 * Images par Mot et par Sens, dans l'ordre du back ; chaque groupe dit « forme (Sens) catégorie · n images », n comptant
 * les Images chargées. Les 100 premières Images d'abord, puis « Afficher plus » tant qu'il en reste. Squelettes pendant
 * le chargement, Bandeau d'erreur avec « Réessayer » en échec (les Images déjà chargées restent). Une réponse arrivée
 * pour une provenance quittée depuis n'écrit rien. Mes mots vide propose « Ajouter une image » ; la Banque se recharge
 * dès qu'une Image est enregistrée (sauf sur la Banque de l'école, où elle ne paraît pas).
 *
 * Carte d'identité (story 3.1, partie 2) : une vignette (bouton) ouvre à droite, sur 400 px, le Panneau Carte d'identité
 * de son Image (`commun/carte-identite`), sans masquer la grille ; il est modifiable par le propriétaire, en lecture
 * seule sinon. Une autre vignette le remplace ; la même lui rend seulement le focus. « Fermer » ou Échap le ferment et
 * rendent le focus à la vignette, ou au titre « Banque » si elle n'est plus affichée. Sous 600 px, le panneau couvre
 * l'écran et la page dessous est inerte. Chaque Carte enregistrée met la vignette à jour (Sections, type, Mot et Sens),
 * même après la fermeture du panneau ; changée de Sens, l'Image rejoint le groupe de ce Sens s'il est chargé, sinon
 * forme un groupe à sa place. Un changement de provenance ferme le panneau ; « Afficher plus » le laisse ouvert.
 *
 * Filtres (story 3.2, partie 2, FR-15) : la barre de Puces de filtre (`BarreFiltres`) sous la Puce de provenance pose
 * des paramètres nommés comme ceux de `GET /api/images` (`mot`, `sensId`, `section`, `albumId`, `moduleId`, `themeId`,
 * `categorie`, `typeImage`, `proprietaireId`). L'URL est leur seule source ; une valeur invalide y est ignorée et
 * n'est pas envoyée. Un changement de filtres recharge depuis la première page, ferme le panneau et annonce le nombre
 * d'Images, comme un changement de provenance (et l'arrivée sur une URL filtrée). Chaque en-tête de groupe porte
 * « Filtrer sur ce sens », sauf celui du Sens déjà filtré ; la puce Sens dit « forme (Sens) », gardé d'une lecture à
 * l'autre, ou « Sens (inconnu) » si la liste chargée ne le montre pas. Filtres posés sans résultat : « Aucune image. »
 * et « Effacer les filtres », qui ne garde que la provenance déjà dans l'URL et rend le focus au titre.
 *
 * Sélection et Verser en lot (story 3.3, partie 3a, UX-DR-12) : chaque vignette porte une Case de sélection
 * (`commun/selection`) ; la Barre d'actions en lot (`commun/barre-actions-lot`), en haut de la grille, montre le nombre
 * sélectionné, « Tout sélectionner » (les Images affichées, pages déjà chargées), « Désélectionner » et « Verser »,
 * indisponibles pendant un rechargement. Maj+clic sélectionne une plage dans l'ordre de la grille. Échap ferme d'abord
 * le panneau ; sinon il vide la sélection (pas pendant un versement, ni depuis un champ de saisie ou un menu) et le
 * focus va au titre si l'élément focalisé disparaît. La sélection survit à « Afficher plus » et au panneau, se vide à
 * chaque changement de provenance ou de filtres et se réduit aux Images encore affichées après un rechargement.
 * « Verser » envoie `POST /images/versements` par paquets de 500, sélection figée ; les vignettes versées (ou déjà
 * versées) prennent « versée » sans relire la liste, sortent de la sélection (les refusées y restent) et la Carte
 * ouverte sur l'une d'elles est relue ; une page demandée avant le versement et reçue après le reprend. Un changement
 * de provenance ou de filtres, ou la page quittée, arrêtent l'envoi sans rien écrire. Le récapitulatif (message de
 * partage, bilan seul en `role="status"`, refusées et leur raison) reste dans la barre jusqu'à sa fermeture ou au geste
 * de sélection suivant. Échec : Bandeau propre au versement, avec le récapitulatif des paquets appliqués ;
 * « Réessayer », pour une erreur passagère seulement, envoie les Images non envoyées encore sélectionnées et complète
 * le même récapitulatif.
 *
 * Aucun filtrage d'Images ici (AD-2) : le back renvoie ce que l'enseignant peut voir. Le propriétaire est résolu par
 * l'annuaire (AD-20).
 */
@Component({
  selector: 'app-banque',
  imports: [
    BandeauErreur,
    BarreActionsLot,
    BarreFiltres,
    CarteIdentite,
    EtatVide,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    RecapitulatifVersementLot,
    Squelette,
    VignetteBanque,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'echap($event)' },
  styleUrls: [
    '../commun/page-rubrique.scss',
    '../commun/disposition-panneau.scss',
    './banque.scss',
  ],
  template: `
    <div
      class="disposition"
      [class.disposition--panneau]="carteOuverte() !== null"
      [class.disposition--plein-ecran]="pleinEcran()"
    >
      <div class="page" [attr.inert]="pageInerte() ? '' : null">
        <div class="banque__entete">
          <h1 #titre class="page__titre" tabindex="-1">Banque</h1>
          @if (total() !== null) {
            <span class="banque__total">{{ libelleImages(totalAffiche()!) }}</span>
          }
        </div>

        <mat-chip-listbox
          class="banque__provenance"
          aria-label="Provenance"
          [value]="provenance()"
          (change)="choisirProvenance($event)"
        >
          @for (choix of provenances; track choix.valeur) {
            <mat-chip-option [value]="choix.valeur">{{ choix.libelle }}</mat-chip-option>
          }
        </mat-chip-listbox>

        <app-barre-filtres
          class="banque__filtres"
          [filtres]="filtres()"
          [libelleSens]="libelleSensFiltre()"
          [sensInconnu]="sensInconnu()"
          (changer)="changerFiltres($event)"
          (effacer)="effacerFiltres()"
        />

        @if (erreur(); as echec) {
          <app-bandeau-erreur
            [message]="echec.message"
            (reessayer)="echec.reessayer()"
            (fermer)="erreur.set(null)"
          />
        }

        <app-barre-actions-lot
          class="banque__barre-lot"
          [nombre]="selection.nombre()"
          [ouverte]="versement.recapitulatif() !== null || versement.erreur() !== null"
          [figee]="selection.figee() || images() === null"
          [annoncer]="!versement.enCours() && versement.recapitulatif() === null"
          (toutSelectionner)="toutSelectionner()"
          (deselectionner)="deselectionner()"
        >
          @if (selection.nombre() > 0) {
            <button
              matButton="tonal"
              class="banque__verser"
              type="button"
              disabledInteractive
              [disabled]="versement.enCours() || images() === null"
              [attr.aria-busy]="versement.enCours()"
              (click)="verserSelection()"
            >
              {{ versement.enCours() ? libelleVersementEnCours : 'Verser' }}
            </button>
          }
          <app-recapitulatif-versement-lot
            barreActionsLotSuite
            libelleRefusees="Images non versées"
            [recapitulatif]="versement.recapitulatif()"
            [erreur]="versement.erreur()"
            (reessayer)="reessayerVersement()"
            (fermerErreur)="fermerErreurVersement()"
            (fermerRecapitulatif)="fermerRecapitulatif()"
          />
        </app-barre-actions-lot>

        @if (images(); as chargees) {
          @if (chargees.length === 0) {
            @if (filtresPoses()) {
              <app-etat-vide icone="banque" phrase="Aucune image.">
                <button
                  matButton="tonal"
                  class="banque__effacer"
                  type="button"
                  (click)="effacerFiltres()"
                >
                  Effacer les filtres
                </button>
              </app-etat-vide>
            } @else if (provenance() === 'mes-mots') {
              <app-etat-vide icone="banque" phrase="Aucune image dans Mes mots.">
                <button
                  matButton="filled"
                  class="banque__ajouter"
                  type="button"
                  (click)="ajouter($event)"
                >
                  Ajouter une image
                </button>
              </app-etat-vide>
            } @else {
              <app-etat-vide icone="banque" phrase="Aucune image." />
            }
          } @else {
            @for (groupe of groupes(); track groupe.sensId) {
              <section class="groupe">
                <div class="groupe__tete">
                  <h2 class="groupe__entete" [id]="idEntete(groupe.sensId)">
                    <span class="groupe__forme">{{ groupe.forme }}</span
                    >&ngsp; <span class="groupe__sens">({{ groupe.sensLibelle }})</span>&ngsp;
                    <span class="groupe__compte"
                      >{{ groupe.categorie ? groupe.categorie + ' · ' : ''
                      }}{{ libelleImages(groupe.images.length) }}</span
                    >
                  </h2>
                  @if (filtres().sensId !== groupe.sensId) {
                    <button
                      matButton
                      class="groupe__filtrer"
                      type="button"
                      [attr.aria-describedby]="idEntete(groupe.sensId)"
                      (click)="filtrerSurSens(groupe.sensId)"
                    >
                      Filtrer sur ce sens
                    </button>
                  }
                </div>
                <ul class="groupe__vignettes">
                  @for (image of groupe.images; track image.id) {
                    <li>
                      <app-vignette-banque
                        [image]="image"
                        [proprietaire]="proprietaire(image.proprietaireId)"
                        [ouverte]="carteOuverte() === image.id"
                        [selectionnee]="selection.estSelectionne(image.id)"
                        [selectionActive]="selection.active()"
                        [selectionFigee]="selection.figee()"
                        (ouvrir)="ouvrirCarteIdentite(image.id)"
                        (basculerSelection)="basculerSelection(image.id, $event)"
                      />
                    </li>
                  }
                </ul>
              </section>
            }
            @if (resteACharger()) {
              <button
                matButton="tonal"
                class="banque__plus"
                type="button"
                disabledInteractive
                [disabled]="chargement() === 'suite'"
                [attr.aria-busy]="chargement() === 'suite'"
                (click)="afficherPlus()"
              >
                Afficher plus
              </button>
            }
            @if (chargement() === 'suite') {
              <app-squelette class="banque__squelette-suite" forme="vignette" [nombre]="6" />
            }
          }
        } @else if (chargement() === 'premiere') {
          <app-squelette forme="vignette" [nombre]="6" />
        } @else if (erreur() === null) {
          <!-- Bandeau d'erreur fermé sans rien de chargé : « Réessayer » reste à portée. -->
          <button
            matButton="tonal"
            class="banque__reessayer"
            type="button"
            (click)="chargerPremierePage(annonceEnAttente)"
          >
            Réessayer
          </button>
        }
      </div>
      @if (carteOuverte(); as imageId) {
        <app-carte-identite
          class="disposition__panneau"
          [id]="idPanneau"
          [imageId]="imageId"
          (fermer)="fermerCarteIdentite()"
          [appliquer]="appliquerCarteIdentite"
        />
      }
    </div>
  `,
})
export class Banque {
  private readonly api = inject(Api);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly annuaire = inject(Annuaire);
  private readonly compteCourant = inject(CompteCourant);
  private readonly ajouterImage = inject(AjouterImage);
  private readonly annonceur = inject(LiveAnnouncer);
  private readonly injecteur = inject(Injector);
  private readonly dialogues = inject(MatDialog);

  protected readonly provenances = PROVENANCES;
  protected readonly libelleImages = libelleImages;
  protected readonly idPanneau = ID_PANNEAU_CARTE_IDENTITE;

  private readonly parametres = toSignal<ParamMap, ParamMap>(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  /** Provenance de l'URL ; absente ou inconnue, Mes mots. */
  protected readonly provenance = computed(() =>
    provenanceDeLUrl(this.parametres().get('provenance')),
  );
  /** Filtres de l'URL, valeurs invalides écartées ; les mêmes filtres ne relisent rien. */
  protected readonly filtres = computed(() => filtresDeLUrl(this.parametres()), {
    equal: memesFiltres,
  });
  protected readonly filtresPoses = computed(() => filtresPoses(this.filtres()));

  /** Images chargées, dans l'ordre du back ; `null` tant que la première page n'est pas reçue. */
  protected readonly images = signal<ImageBanqueDto[] | null>(null);
  /** Nombre total d'Images de la provenance ; `null` tant que la première page n'est pas reçue. */
  protected readonly total = signal<number | null>(null);
  protected readonly chargement = signal<'premiere' | 'suite' | null>(null);
  protected readonly erreur = signal<EchecBanque | null>(null);

  /** Total affiché : jamais moins que les Images à l'écran (total et page viennent de deux requêtes). */
  protected readonly totalAffiche = computed(() => {
    const total = this.total();
    return total === null ? null : Math.max(total, this.images()?.length ?? 0);
  });

  protected readonly resteACharger = computed(() => {
    const images = this.images();
    const total = this.total();
    return images !== null && total !== null && images.length < total;
  });

  /** Groupes par Sens, dans l'ordre de leur première Image : un Sens à cheval sur deux pages reste un seul groupe. */
  protected readonly groupes = computed<GroupeBanque[]>(() => {
    const parSens = new Map<string, GroupeBanque>();
    for (const image of this.images() ?? []) {
      let groupe = parSens.get(image.sensId);
      if (groupe === undefined) {
        const categorie = categorieGrammaticale(image.categorie);
        groupe = {
          sensId: image.sensId,
          forme: image.forme,
          sensLibelle: image.sensLibelle,
          categorie: categorie === null ? null : LIBELLES_CATEGORIE[categorie],
          images: [],
        };
        parSens.set(image.sensId, groupe);
      }
      groupe.images.push(image);
    }
    return [...parSens.values()];
  });

  /** Dernier libellé « forme (Sens) » connu d'un Sens filtré : il reste d'une lecture à l'autre. */
  private readonly sensConnu = signal<{ sensId: string; libelle: string } | null>(null);
  /** Libellé du Sens filtré : celui d'un groupe chargé, sinon le dernier connu, sinon `null`. */
  protected readonly libelleSensFiltre = computed(() => {
    const sensId = this.filtres().sensId;
    const groupe = this.groupes().find((autre) => autre.sensId === sensId);
    if (groupe !== undefined) {
      return `${groupe.forme} (${groupe.sensLibelle})`;
    }
    const connu = this.sensConnu();
    return connu !== null && connu.sensId === sensId ? connu.libelle : null;
  });
  /** Sens filtré sans libellé, alors que la liste est chargée : « Sens (inconnu) ». */
  protected readonly sensInconnu = computed(
    () =>
      this.filtres().sensId !== undefined &&
      this.libelleSensFiltre() === null &&
      this.images() !== null,
  );

  /** Identifiants des Images affichées, dans l'ordre de la grille (groupes par Sens). */
  private readonly ordreAffiche = computed(() =>
    this.groupes().flatMap((groupe) => groupe.images.map((image) => image.id)),
  );
  /** Images sélectionnées (story 3.3), dans l'ordre de la grille. */
  protected readonly selection = new Selection(() => this.ordreAffiche());
  /**
   * Versement en lot (`commun/versement`) : récapitulatif, échec indépendant des erreurs de lecture de la liste, journal
   * des Images versées (réappliqué à une page demandée avant).
   */
  protected readonly versement = new VersementLot({
    selection: this.selection,
    imagesSelectionnees: () => new Set(this.selection.identifiants()),
    appliquer: (ids) => this.appliquerVersement(ids),
  });
  protected readonly libelleVersementEnCours = LIBELLE_VERSEMENT_EN_COURS;
  private readonly recapitulatifLot = viewChild(RecapitulatifVersementLot);

  /** Image dont le Panneau Carte d'identité est ouvert ; un seul à la fois. */
  protected readonly carteOuverte = signal<string | null>(null);
  private readonly panneauCarteIdentite = viewChild(CarteIdentite);
  private readonly hotePanneau = viewChild(CarteIdentite, { read: ElementRef });
  private readonly vignettes = viewChildren(VignetteBanque);
  private readonly titre = viewChild.required<ElementRef<HTMLElement>>('titre');
  /** Sous 600 px de large, le Panneau Carte d'identité couvre l'écran. */
  protected readonly pleinEcran = toSignal(
    inject(BreakpointObserver)
      .observe(Breakpoints.XSmall)
      .pipe(map((etat) => etat.matches)),
    { initialValue: false },
  );
  /** Panneau ouvert en plein écran : la page dessous est inerte (ni Tab ni lecteur d'écran). */
  protected readonly pageInerte = computed(() => this.carteOuverte() !== null && this.pleinEcran());

  /** Numéro de la dernière lecture lancée : la réponse d'une lecture dépassée n'écrit rien. */
  private derniereLecture = 0;
  /** Pages déjà reçues pour la provenance courante. */
  private pagesRecues = 0;
  /** Annonce du nombre d'Images due par la dernière première page demandée ; « Réessayer » la garde. */
  protected annonceEnAttente = false;

  constructor() {
    void this.annuaire.charger();
    void this.compteCourant.charger();
    // Nouvelle provenance ou nouveaux filtres : le panneau se ferme et la liste repart de la première page ; le nombre
    // d'Images est annoncé, sauf à l'arrivée sur la page sans filtre.
    let premiereLecture = true;
    effect(() => {
      this.provenance();
      const filtres = this.filtres();
      const annoncer = !premiereLecture || filtresPoses(filtres);
      premiereLecture = false;
      untracked(() => {
        // Retour arrière du navigateur, focus dans le panneau : il ne tombe pas sur la page, il va au titre.
        const focusDansPanneau = this.focusDansPanneau();
        this.carteOuverte.set(null);
        // La sélection, le récapitulatif et l'échec d'un versement valent pour la provenance et les filtres quittés.
        this.versement.changerDeContexte();
        this.selection.reinitialiser();
        if (focusDansPanneau) {
          this.focusTitre();
        }
        void this.chargerPremierePage(annoncer);
      });
    });
    // Libellé du Sens filtré, gardé pour les lectures qui ne le montrent pas.
    effect(() => {
      const sensId = this.filtres().sensId;
      const groupe = this.groupes().find((autre) => autre.sensId === sensId);
      if (sensId !== undefined && groupe !== undefined) {
        this.sensConnu.set({ sensId, libelle: `${groupe.forme} (${groupe.sensLibelle})` });
      }
    });
    // Passage sous 600 px, panneau ouvert : la page devient inerte, le focus passe au panneau.
    effect(() => {
      if (this.pageInerte()) {
        untracked(() =>
          afterNextRender(
            () => {
              if (!this.focusDansPanneau()) {
                this.panneauCarteIdentite()?.focus();
              }
            },
            { injector: this.injecteur },
          ),
        );
      }
    });
    // Image enregistrée par « Ajouter une image » : elle est privée, donc absente de la Banque de l'école ; Mes mots et
    // Tout repartent de la première page.
    let ajoutsVus = this.ajouterImage.imagesAjoutees();
    effect(() => {
      const ajouts = this.ajouterImage.imagesAjoutees();
      if (ajouts === ajoutsVus) {
        return;
      }
      ajoutsVus = ajouts;
      untracked(() => {
        if (this.provenance() !== 'banque') {
          void this.chargerPremierePage();
        }
      });
    });
  }

  /** Vrai si le focus est dans le Panneau Carte d'identité. */
  private focusDansPanneau(): boolean {
    const hote = this.hotePanneau()?.nativeElement as HTMLElement | undefined;
    return hote?.contains(hote.ownerDocument.activeElement) ?? false;
  }

  /** Après le rendu, focus au titre « Banque ». */
  private focusTitre(): void {
    afterNextRender(() => this.titre().nativeElement.focus(), { injector: this.injecteur });
  }

  /**
   * Liste remplacée sans l'Image du panneau : le panneau se ferme, c'est annoncé et le focus va au titre, sauf si un
   * dialogue est ouvert (il garde le focus).
   */
  private fermerPanneauSansImage(images: readonly ImageBanqueDto[]): void {
    const imageId = this.carteOuverte();
    if (imageId === null || images.some((image) => image.id === imageId)) {
      return;
    }
    this.carteOuverte.set(null);
    void this.annonceur.announce("L'image n'est plus dans la liste.", 'polite');
    if (this.dialogues.openDialogs.length === 0) {
      this.focusTitre();
    }
  }

  /** Nom affiché du propriétaire : « vous », son nom, « ancien compte » s'il n'est plus dans l'annuaire chargé. */
  protected proprietaire(id: string): string {
    const compte = this.compteCourant.compte();
    // Compte pas encore connu : aucun libellé, plutôt que son propre nom au lieu de « vous ».
    if (compte === null) {
      return '';
    }
    if (compte.id === id) {
      return PROPRIETAIRE_MOI;
    }
    const nom = this.annuaire.enseignant(id)?.nomAffiche;
    if (nom) {
      return nom;
    }
    return this.annuaire.etat().statut === 'charge' ? PROPRIETAIRE_ANCIEN : '';
  }

  /** Puce de provenance : l'URL change, la liste suit. Un clic sur la Puce déjà choisie la laisse choisie. */
  protected choisirProvenance(evenement: MatChipListboxChange): void {
    const choisie = PROVENANCES.find((provenance) => provenance.valeur === evenement.value)?.valeur;
    if (choisie === undefined) {
      evenement.source.value = this.provenance();
      return;
    }
    if (choisie !== this.provenance()) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { provenance: choisie },
        queryParamsHandling: 'merge',
      });
    }
  }

  /** Filtres posés ou retirés par la barre : l'URL change, la liste suit. */
  protected changerFiltres(changement: ChangementFiltres): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: changement,
      queryParamsHandling: 'merge',
    });
  }

  /** « Filtrer sur ce sens » sur l'en-tête d'un groupe. */
  protected filtrerSurSens(sensId: string): void {
    const groupe = this.groupes().find((autre) => autre.sensId === sensId);
    if (groupe !== undefined) {
      this.sensConnu.set({ sensId, libelle: `${groupe.forme} (${groupe.sensLibelle})` });
    }
    this.changerFiltres({ sensId });
  }

  /** « Effacer les filtres » : ne reste que la provenance déjà dans l'URL ; le focus va au titre « Banque ». */
  protected effacerFiltres(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: Object.fromEntries(CLES_FILTRES.map((cle) => [cle, null])),
      queryParamsHandling: 'merge',
    });
    this.focusTitre();
  }

  /** Identifiant de l'en-tête d'un groupe, qui décrit son bouton « Filtrer sur ce sens ». */
  protected idEntete(sensId: string): string {
    return `banque-groupe-${sensId}`;
  }

  /** Vignette activée : le panneau s'ouvre sur son Image, ou la remplace ; la même Image ne relit rien. */
  protected ouvrirCarteIdentite(imageId: string): void {
    if (this.carteOuverte() === imageId) {
      this.panneauCarteIdentite()?.focus();
      return;
    }
    this.carteOuverte.set(imageId);
  }

  /** « Fermer » ou Échap : focus à la vignette de l'Image, ou au titre si elle n'est plus affichée. */
  protected fermerCarteIdentite(): void {
    const imageId = this.carteOuverte();
    this.carteOuverte.set(null);
    afterNextRender(
      () => {
        const vignette = this.vignettes().find((autre) => autre.image().id === imageId);
        if (vignette === undefined) {
          this.titre().nativeElement.focus();
        } else {
          vignette.focus();
        }
      },
      { injector: this.injecteur },
    );
  }

  /**
   * Carte d'identité enregistrée, panneau ouvert ou non (B-2) : la vignette suit ses Sections, son type, son Mot et son
   * Sens. Changée de Sens, l'Image passe après la dernière Image chargée de ce Sens, ou reste à sa place s'il n'y en a
   * pas : les groupes, faits par Sens, n'apparaissent jamais deux fois. L'état (`etat`, « versée », `aRemplacer`,
   * `reutilisable`, `versabilite`) suit aussi. Le total ne change pas ; le focus reste où il était, y compris sur la
   * vignette déplacée.
   */
  protected readonly appliquerCarteIdentite = (carte: CarteIdentiteImageDto): void => {
    const images = this.images();
    const index = images?.findIndex((image) => image.id === carte.id) ?? -1;
    if (images === null || index < 0) {
      return;
    }
    const avant = images[index];
    const apres: ImageBanqueDto = {
      ...avant,
      etat: carte.etat,
      versee: carte.etat === 'versee',
      aRemplacer: carte.aRemplacer,
      reutilisable: carte.reutilisable,
      versabilite: carte.versabilite,
      sections: carte.sections,
      typeImage: carte.typeImage,
      motId: carte.motId,
      forme: carte.forme,
      sensId: carte.sens.id,
      sensLibelle: carte.sens.libelle,
      categorie: categorieGrammaticale(carte.sens.categorie),
    };
    // Libellé ou catégorie du Sens changés : toutes les Images chargées de ce Sens suivent (en-tête du groupe).
    const autres = images
      .filter((image) => image.id !== carte.id)
      .map((image) =>
        image.sensId === apres.sensId &&
        (image.sensLibelle !== apres.sensLibelle || image.categorie !== apres.categorie)
          ? { ...image, sensLibelle: apres.sensLibelle, categorie: apres.categorie }
          : image,
      );
    let place = index;
    if (apres.sensId !== avant.sensId) {
      for (let i = autres.length - 1; i >= 0; i--) {
        if (autres[i].sensId === apres.sensId) {
          place = i + 1;
          break;
        }
      }
    }
    // Changée de Sens, la vignette change de groupe : elle est recréée, le focus doit la suivre.
    const avecFocus =
      apres.sensId !== avant.sensId &&
      (this.vignettes()
        .find((vignette) => vignette.image().id === carte.id)
        ?.aLeFocus() ??
        false);
    this.images.set([...autres.slice(0, place), apres, ...autres.slice(place)]);
    if (avecFocus) {
      afterNextRender(
        () =>
          this.vignettes()
            .find((vignette) => vignette.image().id === carte.id)
            ?.focus(),
        { injector: this.injecteur },
      );
    }
  };

  /** Case de sélection d'une vignette : bascule, ou plage (Maj+clic) ; le récapitulatif se ferme. */
  protected basculerSelection(imageId: string, geste: BasculeSelection): void {
    if (this.selection.figee()) {
      return;
    }
    this.fermerRecapitulatifLibre();
    if (geste.plage) {
      this.selection.selectionnerPlage(imageId);
    } else {
      this.selection.basculer(imageId);
    }
  }

  /** « Tout sélectionner » : toutes les Images affichées (pages déjà chargées). */
  protected toutSelectionner(): void {
    if (this.selection.figee() || this.images() === null) {
      return;
    }
    this.fermerRecapitulatifLibre();
    this.selection.toutSelectionner();
  }

  /** « Désélectionner » : sélection vide ; la barre disparaît, le focus va au titre. */
  protected deselectionner(): void {
    if (this.selection.figee() || this.images() === null) {
      return;
    }
    this.fermerRecapitulatifLibre();
    this.selection.toutDeselectionner();
    this.rendreFocusSiPerdu();
  }

  protected fermerRecapitulatif(): void {
    this.versement.fermerRecapitulatif();
    this.rendreFocusSiPerdu();
  }

  /** Ferme le récapitulatif, sauf s'il résume un lot en échec que « Réessayer » doit compléter. */
  private fermerRecapitulatifLibre(): void {
    this.versement.fermerRecapitulatifLibre();
  }

  /**
   * Échap dans la page (le panneau, les menus et les dialogues le traitent d'abord) : un panneau ouvert se ferme,
   * toujours ; sinon la sélection se vide, sauf pendant un versement ou si Échap vient d'un champ de saisie ou d'un
   * menu. Sans sélection ni récapitulatif, rien ne change.
   */
  protected echap(evenement: Event): void {
    if (evenement.defaultPrevented || this.dialogues.openDialogs.length > 0) {
      return;
    }
    if (this.carteOuverte() !== null) {
      this.fermerCarteIdentite();
      return;
    }
    if (
      (!this.selection.active() && this.versement.recapitulatif() === null) ||
      this.selection.figee() ||
      echapDeSaisieOuMenu(evenement.target)
    ) {
      return;
    }
    this.selection.toutDeselectionner();
    this.fermerRecapitulatifLibre();
    this.rendreFocusSiPerdu();
  }

  /** Après le rendu, si l'élément focalisé a disparu, focus à `repli` ou au titre « Banque ». */
  private rendreFocusSiPerdu(repli?: () => HTMLElement | undefined): void {
    afterNextRender(
      () => {
        const actif = document.activeElement;
        if (actif === null || actif === document.body || !actif.isConnected) {
          (repli?.() ?? this.titre().nativeElement).focus();
        }
      },
      { injector: this.injecteur },
    );
  }

  /** « Verser » de la Barre d'actions en lot : un nouveau lot, les Images sélectionnées dans l'ordre de la grille. */
  protected verserSelection(): void {
    const images = this.images();
    const ids = this.selection.identifiants();
    if (this.versement.enCours() || images === null || ids.length === 0) {
      return;
    }
    // Noms du récapitulatif, pris à l'envoi : la grille peut changer pendant le versement.
    const noms = new Map(images.map((image) => [image.id, nomImage(image.forme, image.sensLibelle)]));
    void this.versement.verser(ids, noms).then((complet) => this.apresVersement(complet));
  }

  /** « Réessayer » : les Images non envoyées du lot en échec encore sélectionnées, dans le même récapitulatif. */
  protected reessayerVersement(): void {
    if (this.images() === null) {
      return;
    }
    void this.versement.reessayer().then((complet) => this.apresVersement(complet));
  }

  /** Récapitulatif complet : « Verser » disparu (plus rien de sélectionné), le focus va au bouton qui le ferme. */
  private apresVersement(complet: boolean): void {
    if (complet) {
      this.rendreFocusSiPerdu(() => this.recapitulatifLot()?.elementFermer());
    }
  }

  /** Bandeau du versement fermé : plus de reprise ; le récapitulatif partiel reste. */
  protected fermerErreurVersement(): void {
    this.versement.fermerErreur();
    this.rendreFocusSiPerdu();
  }

  /**
   * Images versées ou déjà versées par un paquet : leurs vignettes prennent « versée » sans relire la liste et elles
   * sortent de la sélection ; la Carte ouverte sur l'une d'elles est relue.
   */
  private appliquerVersement(ids: readonly string[]): void {
    const sorties = new Set(ids);
    const images = this.images();
    if (images !== null && images.some((image) => sorties.has(image.id))) {
      this.images.set(images.map((image) => (sorties.has(image.id) ? imageVersee(image) : image)));
    }
    this.selection.retirer(sorties);
    const ouverte = this.carteOuverte();
    if (ouverte !== null && sorties.has(ouverte)) {
      this.panneauCarteIdentite()?.actualiser();
    }
  }

  protected ajouter(evenement: Event): void {
    void this.ajouterImage.ouvrir(evenement.currentTarget as HTMLElement);
  }

  /**
   * Première page de la provenance et des filtres courants ; les Images affichées sont retirées. `annoncer` annonce le
   * nombre d'Images reçu (changement de provenance ou de filtres).
   */
  async chargerPremierePage(annoncer = false): Promise<void> {
    const lecture = ++this.derniereLecture;
    this.images.set(null);
    this.total.set(null);
    this.erreur.set(null);
    this.pagesRecues = 0;
    this.annonceEnAttente = annoncer;
    this.chargement.set('premiere');
    await this.lire(lecture, 0, annoncer);
  }

  /** « Afficher plus » : la page suivante s'ajoute à la suite. */
  async afficherPlus(): Promise<void> {
    if (this.chargement() !== null) {
      return;
    }
    const lecture = ++this.derniereLecture;
    this.erreur.set(null);
    this.chargement.set('suite');
    await this.lire(lecture, this.pagesRecues);
  }

  private async lire(lecture: number, page: number, annoncer = false): Promise<void> {
    const versementsAvant = this.versement.journal.length;
    try {
      const reponse = await this.api.invoke(listerImagesBanque, {
        ...this.filtres(),
        provenance: this.provenance(),
        page,
        taille: TAILLE_PAGE_BANQUE,
      });
      if (lecture !== this.derniereLecture) {
        return;
      }
      // Une Image ajoutée entre deux pages décale la suite : celles déjà affichées ne le sont pas deux fois.
      const dejaLues = new Set((this.images() ?? []).map((image) => image.id));
      // Une Image versée pendant la lecture : la page reçue la montre encore privée.
      const verseesDepuis = new Set(this.versement.journal.slice(versementsAvant));
      const images = [
        ...(this.images() ?? []),
        ...reponse.elements
          .filter((image) => !dejaLues.has(image.id))
          .map((image) => (verseesDepuis.has(image.id) ? imageVersee(image) : image)),
      ];
      this.images.set(images);
      if (page === 0) {
        this.fermerPanneauSansImage(images);
        this.selection.garderSeulement(images.map((image) => image.id));
      }
      if (page > 0) {
        void this.annonceur.announce(
          `${libelleImages(images.length - dejaLues.size)} de plus.`,
          'polite',
        );
      }
      // Une page incomplète est la dernière, même si des Images ont disparu entre-temps.
      this.total.set(reponse.elements.length < TAILLE_PAGE_BANQUE ? images.length : reponse.total);
      this.pagesRecues = page + 1;
      if (page === 0) {
        this.annonceEnAttente = false;
      }
      if (annoncer) {
        const total = this.totalAffiche() ?? 0;
        void this.annonceur.announce(
          total === 0 ? 'Aucune image.' : `${libelleImages(total)}.`,
          'polite',
        );
      }
    } catch (erreur) {
      if (lecture !== this.derniereLecture) {
        return;
      }
      this.erreur.set({
        message: messageErreur(erreur),
        reessayer:
          page === 0
            ? () => void this.chargerPremierePage(annoncer)
            : () => void this.afficherPlus(),
      });
    } finally {
      if (lecture === this.derniereLecture) {
        this.chargement.set(null);
      }
    }
  }
}
