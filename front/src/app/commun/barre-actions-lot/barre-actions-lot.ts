import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

/** « Aucune image sélectionnée », « 1 image sélectionnée », « 3 images sélectionnées ». */
export function libelleSelection(nombre: number): string {
  if (nombre === 0) {
    return 'Aucune image sélectionnée';
  }
  return nombre === 1 ? '1 image sélectionnée' : `${nombre} images sélectionnées`;
}

/** « Aucun mot sélectionné », « 1 mot sélectionné », « 3 mots sélectionnés » (Préparation). */
export function libelleSelectionMots(nombre: number): string {
  if (nombre === 0) {
    return 'Aucun mot sélectionné';
  }
  return nombre === 1 ? '1 mot sélectionné' : `${nombre} mots sélectionnés`;
}

/**
 * Barre d'actions en lot (DESIGN.md › barre-actions-lot, story 3.3, UX-DR-12), identique dans la Banque, la Préparation
 * et l'Import. En haut de la grille, collante au défilement, `surface-container-high` : le nombre sélectionné, « Tout
 * sélectionner », « Désélectionner », puis les actions de la page (contenu projeté). Un contenu marqué
 * `barreActionsLotSuite` (récapitulatif d'une action) s'affiche sous la ligne.
 *
 * La page la garde dans la vue : elle ne se montre que si `nombre` est positif ou si `ouverte` est vrai (récapitulatif
 * encore affiché). Chaque changement du nombre est annoncé poliment, y compris le retour à « Aucune image
 * sélectionnée », sauf avec `annoncer` à faux. Figée (`figee`, action en cours), « Tout sélectionner » et « Désélectionner » restent focusables mais
 * indisponibles. Elle ne dépend d'aucune page : la sélection est tenue par `commun/selection`.
 */
@Component({
  selector: 'app-barre-actions-lot',
  imports: [MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './barre-actions-lot.scss',
  host: { '[class.barre-actions-lot--affichee]': 'affichee()' },
  template: `
    @if (affichee()) {
      <div class="barre-actions-lot" role="region" aria-label="Actions sur la sélection">
        <div class="barre-actions-lot__ligne">
          <span class="barre-actions-lot__nombre">{{ libelle() }}</span>
          <button
            matButton
            class="barre-actions-lot__tout"
            type="button"
            disabledInteractive
            [disabled]="figee()"
            (click)="tout()"
          >
            Tout sélectionner
          </button>
          @if (nombre() > 0) {
            <button
              matButton
              class="barre-actions-lot__deselectionner"
              type="button"
              disabledInteractive
              [disabled]="figee()"
              (click)="aucun()"
            >
              Désélectionner
            </button>
          }
          <span class="barre-actions-lot__actions"><ng-content /></span>
        </div>
        <ng-content select="[barreActionsLotSuite]" />
      </div>
    }
  `,
})
export class BarreActionsLot {
  /** Nombre d'éléments sélectionnés. */
  readonly nombre = input.required<number>();
  /** Garde la barre affichée sans sélection (récapitulatif d'une action encore visible). */
  readonly ouverte = input(false);
  /** Vrai pendant une action en lot. */
  readonly figee = input(false);
  /** Faux pour taire l'annonce du nombre (pendant une action, ou quand la page annonce son récapitulatif). */
  readonly annoncer = input(true);
  /** Libellé du nombre sélectionné, selon ce que la page sélectionne : Images par défaut, Mots dans la Préparation. */
  readonly libelleNombre = input<(nombre: number) => string>(libelleSelection);
  readonly toutSelectionner = output<void>();
  readonly deselectionner = output<void>();

  private readonly annonceur = inject(LiveAnnouncer);

  protected readonly affichee = computed(() => this.nombre() > 0 || this.ouverte());
  protected readonly libelle = computed(() => this.libelleNombre()(this.nombre()));

  protected tout(): void {
    if (!this.figee()) {
      this.toutSelectionner.emit();
    }
  }

  protected aucun(): void {
    if (!this.figee()) {
      this.deselectionner.emit();
    }
  }

  constructor() {
    // Le nombre est annoncé à chaque changement, pas à la création de la barre sans sélection.
    let precedent: number | null = null;
    effect(() => {
      const nombre = this.nombre();
      if (nombre === precedent || (precedent === null && nombre === 0)) {
        precedent = nombre;
        return;
      }
      precedent = nombre;
      untracked(() => {
        if (this.annoncer()) {
          void this.annonceur.announce(`${this.libelleNombre()(nombre)}.`, 'polite');
        }
      });
    });
  }
}
