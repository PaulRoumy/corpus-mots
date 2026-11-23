import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatChipListboxChange, MatChipsModule } from '@angular/material/chips';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { Api } from '../api/api';
import { listerImagesBanque } from '../api/fn/images-resource/lister-images-banque';
import { ImageBanqueDto } from '../api/models/image-banque-dto';
import { Annuaire } from '../commun/annuaire';
import { BandeauErreur } from '../commun/bandeau-erreur/bandeau-erreur';
import { CompteCourant } from '../commun/compte-courant';
import { messageErreur } from '../commun/erreurs/message-erreur';
import { EtatVide } from '../commun/etat-vide/etat-vide';
import { categorieGrammaticale, LIBELLES_CATEGORIE } from '../commun/libelles-images';
import { Squelette } from '../commun/squelette/squelette';
import { AjouterImage } from '../preparations/ajouter-image';
import { VignetteBanque } from './vignette-banque';

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

/**
 * Rubrique Banque (story 3.1, partie 1, FR-18) : une seule Banque, ouverte sur Mes mots. La Puce de provenance (Mes
 * mots, Banque de l'école, Tout), en choix unique, est reflétée dans l'URL (`?provenance=`). La grille regroupe les
 * Images par Mot et par Sens, dans l'ordre du back ; chaque groupe dit « forme (Sens) catégorie · n images », n comptant
 * les Images chargées. Les 100 premières Images d'abord, puis « Afficher plus » tant qu'il en reste. Squelettes pendant
 * le chargement, Bandeau d'erreur avec « Réessayer » en échec (les Images déjà chargées restent). Une réponse arrivée
 * pour une provenance quittée depuis n'écrit rien. Mes mots vide propose « Ajouter une image » ; la Banque se recharge
 * dès qu'une Image est enregistrée (sauf sur la Banque de l'école, où elle ne paraît pas).
 *
 * Aucun filtrage d'Images ici (AD-2) : le back renvoie ce que l'enseignant peut voir. Le propriétaire est résolu par
 * l'annuaire (AD-20).
 */
@Component({
  selector: 'app-banque',
  imports: [BandeauErreur, EtatVide, MatButtonModule, MatChipsModule, Squelette, VignetteBanque],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../commun/page-rubrique.scss', './banque.scss'],
  template: `
    <div class="page">
      <div class="banque__entete">
        <h1 class="page__titre">Banque</h1>
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

      @if (erreur(); as echec) {
        <app-bandeau-erreur
          [message]="echec.message"
          (reessayer)="echec.reessayer()"
          (fermer)="erreur.set(null)"
        />
      }

      @if (images(); as chargees) {
        @if (chargees.length === 0) {
          @if (provenance() === 'mes-mots') {
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
              <h2 class="groupe__entete">
                <span class="groupe__forme">{{ groupe.forme }}</span
                >&ngsp; <span class="groupe__sens">({{ groupe.sensLibelle }})</span>&ngsp;
                <span class="groupe__compte"
                  >{{ groupe.categorie ? groupe.categorie + ' · ' : ''
                  }}{{ libelleImages(groupe.images.length) }}</span
                >
              </h2>
              <ul class="groupe__vignettes">
                @for (image of groupe.images; track image.id) {
                  <li>
                    <app-vignette-banque
                      [image]="image"
                      [proprietaire]="proprietaire(image.proprietaireId)"
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
          (click)="chargerPremierePage()"
        >
          Réessayer
        </button>
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

  protected readonly provenances = PROVENANCES;
  protected readonly libelleImages = libelleImages;

  /** Provenance de l'URL ; absente ou inconnue, Mes mots. */
  protected readonly provenance = toSignal(
    this.route.queryParamMap.pipe(
      map((parametres) => provenanceDeLUrl(parametres.get('provenance'))),
    ),
    { initialValue: provenanceDeLUrl(this.route.snapshot.queryParamMap.get('provenance')) },
  );

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

  /** Numéro de la dernière lecture lancée : la réponse d'une lecture dépassée n'écrit rien. */
  private derniereLecture = 0;
  /** Pages déjà reçues pour la provenance courante. */
  private pagesRecues = 0;

  constructor() {
    void this.annuaire.charger();
    void this.compteCourant.charger();
    // Nouvelle provenance : la liste repart de la première page.
    effect(() => {
      this.provenance();
      untracked(() => void this.chargerPremierePage());
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

  protected ajouter(evenement: Event): void {
    void this.ajouterImage.ouvrir(evenement.currentTarget as HTMLElement);
  }

  /** Première page de la provenance courante ; les Images affichées sont retirées. */
  async chargerPremierePage(): Promise<void> {
    const lecture = ++this.derniereLecture;
    this.images.set(null);
    this.total.set(null);
    this.erreur.set(null);
    this.pagesRecues = 0;
    this.chargement.set('premiere');
    await this.lire(lecture, 0);
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

  private async lire(lecture: number, page: number): Promise<void> {
    try {
      const reponse = await this.api.invoke(listerImagesBanque, {
        provenance: this.provenance(),
        page,
        taille: TAILLE_PAGE_BANQUE,
      });
      if (lecture !== this.derniereLecture) {
        return;
      }
      // Une Image ajoutée entre deux pages décale la suite : celles déjà affichées ne le sont pas deux fois.
      const dejaLues = new Set((this.images() ?? []).map((image) => image.id));
      const images = [
        ...(this.images() ?? []),
        ...reponse.elements.filter((image) => !dejaLues.has(image.id)),
      ];
      this.images.set(images);
      if (page > 0) {
        void this.annonceur.announce(
          `${libelleImages(images.length - dejaLues.size)} de plus.`,
          'polite',
        );
      }
      // Une page incomplète est la dernière, même si des Images ont disparu entre-temps.
      this.total.set(reponse.elements.length < TAILLE_PAGE_BANQUE ? images.length : reponse.total);
      this.pagesRecues = page + 1;
    } catch (erreur) {
      if (lecture !== this.derniereLecture) {
        return;
      }
      this.erreur.set({
        message: messageErreur(erreur),
        reessayer:
          page === 0 ? () => void this.chargerPremierePage() : () => void this.afficherPlus(),
      });
    } finally {
      if (lecture === this.derniereLecture) {
        this.chargement.set(null);
      }
    }
  }
}
