import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Api } from '../api/api';
import { fichierImage } from '../api/fn/images-resource/fichier-image';
import { ImageBanqueDto } from '../api/models/image-banque-dto';
import { BadgeTypeImage } from '../commun/badge-type-image/badge-type-image';
import { ChargementImage, ImageSecurisee } from '../commun/image-securisee/image-securisee';
import { RepereSection } from '../commun/repere-section/repere-section';
import { BasculeSelection, CaseSelection } from '../commun/selection/case-selection';
import { nomImage } from '../commun/nom-image';

/** Identifiant du Panneau Carte d'identité de la Banque, que la vignette ouverte contrôle (`aria-controls`). */
export const ID_PANNEAU_CARTE_IDENTITE = 'banque-carte-identite';

/** Compteur des vignettes créées, pour des identifiants de description uniques. */
let numeroVignette = 0;

/**
 * Vignette d'Image de la Banque (key-banque.html › `.vg`, story 3.1) : la miniature, chargée par le client généré
 * (`taille=miniature`), puis les Repères de Section, le Badge de type d'image, le Badge d'état « versée » s'il y a lieu
 * et le propriétaire, déjà résolu par la page (« vous », un nom, « ancien compte »).
 *
 * Toute la vignette est un bouton (story 3.1, partie 2), nommé « Carte d'identité de « forme » (Sens) », qui émet
 * `ouvrir` : la page ouvre le Panneau Carte d'identité de l'Image. Les Repères, Badges et le propriétaire restent lus,
 * en description du bouton. La vignette de l'Image ouverte porte `aria-expanded="true"`, `aria-controls` vers le
 * panneau et l'anneau `primary` de 2 px, sans fond.
 *
 * Case de sélection (story 3.3, partie 3a) : avant le bouton dans l'ordre de tabulation, en haut à gauche, nommée
 * « Sélectionner « forme » (Sens) ». Elle paraît au survol et au focus de la vignette, et sur toutes les vignettes dès
 * qu'une sélection existe (`selectionActive`). Son geste (`basculerSelection`, Maj+clic : plage) n'ouvre pas la Carte.
 * La vignette sélectionnée prend le fond `primary-container` (DESIGN.md › case-selection), avec la case cochée ;
 * « ouverte » et « sélectionnée » se combinent.
 */
@Component({
  selector: 'app-vignette-banque',
  imports: [BadgeTypeImage, CaseSelection, ImageSecurisee, MatIconModule, RepereSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './vignette-banque.scss',
  host: { '[class.vignette-banque--selection-active]': 'selectionActive()' },
  template: `
    <app-case-selection
      class="vignette__case"
      [nom]="nomSelection()"
      [cochee]="selectionnee()"
      [figee]="selectionFigee()"
      (basculer)="basculerSelection.emit($event)"
    />
    <button
      #bouton
      type="button"
      class="vignette"
      [class.vignette--selectionnee]="selectionnee()"
      [class.vignette--ouverte]="ouverte()"
      [attr.aria-label]="nom()"
      [attr.aria-describedby]="idDescription"
      [attr.aria-expanded]="ouverte()"
      [attr.aria-controls]="ouverte() ? idPanneau : null"
      (click)="ouvrir.emit()"
    >
      <span class="vignette__photo">
        @if (echec()) {
          <mat-icon class="vignette__repli" svgIcon="image" aria-hidden="true" />
          <span class="cm-visuellement-masque">{{ alternative() }}</span>
        } @else {
          <img
            class="vignette__image"
            [appImageSecurisee]="charger()"
            [alt]="alternative()"
            (echec)="echec.set(true)"
          />
        }
      </span>
      <span class="vignette__description" [id]="idDescription">
        <span class="vignette__meta">
          @for (section of image().sections; track section) {
            <app-repere-section [section]="section" />
          }
          <app-badge-type-image [type]="image().typeImage" />
          @if (image().versee) {
            <span class="vignette__versee">
              <mat-icon class="vignette__versee-icone" svgIcon="coche" aria-hidden="true" />versée
            </span>
          }
        </span>
        @if (proprietaire()) {
          <span class="vignette__proprietaire">
            <span class="cm-visuellement-masque">Propriétaire : </span>{{ proprietaire() }}
          </span>
        }
      </span>
    </button>
  `,
})
export class VignetteBanque {
  readonly image = input.required<ImageBanqueDto>();
  /** Nom affiché du propriétaire ; vide tant que l'annuaire n'est pas chargé. */
  readonly proprietaire = input('');
  /** Vrai si le Panneau Carte d'identité est ouvert sur cette Image. */
  readonly ouverte = input(false);
  /** Clic, Entrée ou Espace sur la vignette. */
  readonly ouvrir = output<void>();
  /** Vrai si l'Image est dans la sélection. */
  readonly selectionnee = input(false);
  /** Vrai dès qu'une sélection existe dans la page : la Case de sélection reste visible. */
  readonly selectionActive = input(false);
  /** Vrai pendant une action en lot : la Case de sélection ne bascule plus. */
  readonly selectionFigee = input(false);
  /** Clic ou Espace sur la Case de sélection. */
  readonly basculerSelection = output<BasculeSelection>();

  private readonly api = inject(Api);
  private readonly bouton = viewChild.required<ElementRef<HTMLButtonElement>>('bouton');
  private readonly imageId = computed(() => this.image().id);

  /** Identifiant de la description (Repères, Badges, propriétaire), unique dans la page. */
  protected readonly idDescription = `vignette-banque-${++numeroVignette}`;
  protected readonly idPanneau = ID_PANNEAU_CARTE_IDENTITE;
  /** Nom accessible, Sens compris : « Carte d'identité de « loup » (animal) ». */
  protected readonly nom = computed(
    () => `Carte d'identité de ${nomImage(this.image().forme, this.image().sensLibelle)}`,
  );

  /** Nom de la Case de sélection : « Sélectionner « loup » (animal) ». */
  protected readonly nomSelection = computed(
    () => `Sélectionner ${nomImage(this.image().forme, this.image().sensLibelle)}`,
  );

  /** Chargement de la miniature, d'identité stable tant que l'Image ne change pas. */
  protected readonly charger = computed<ChargementImage>(() => {
    const id = this.imageId();
    return () => this.api.invoke(fichierImage, { id, taille: 'miniature' });
  });
  /** Vrai si la miniature n'a pas pu être chargée ; revient à faux quand l'Image change. */
  protected readonly echec = linkedSignal({ source: this.imageId, computation: () => false });
  /** Alternative de la miniature : « citrouille, légume ». */
  protected readonly alternative = computed(
    () => `${this.image().forme}, ${this.image().sensLibelle}`,
  );

  /** Donne le focus à la vignette. */
  focus(): void {
    this.bouton().nativeElement.focus();
  }

  /** Vrai si la vignette a le focus. */
  aLeFocus(): boolean {
    const bouton = this.bouton().nativeElement;
    return bouton === bouton.ownerDocument.activeElement;
  }
}
