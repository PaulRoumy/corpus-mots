import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Geste sur une Case de sélection : `plage` vaut vrai pour Maj+clic. */
export interface BasculeSelection {
  readonly plage: boolean;
}

/**
 * Case de sélection (DESIGN.md › case-selection, story 3.3) : une case à cocher native de 18 px, dans une cible de
 * 40 px, à placer en haut à gauche d'une carte ou d'une vignette. Son nom accessible vient de la page (« Sélectionner
 * « loup » (animal) »). Un clic sur la case ou sur sa cible, ou Espace, émet `basculer` (Maj+clic : `plage`) ; l'état
 * coché suit l'entrée `cochee`, jamais le navigateur, et le clic ne remonte pas jusqu'à la carte. Figée (action en lot
 * en cours), elle reste focusable (`aria-disabled`) mais n'émet rien.
 *
 * Visibilité : la carte qui l'accueille pose `--case-selection-opacite` (0 au repos, 1 au survol, au focus ou dès qu'une
 * sélection existe) ; la case est toujours visible quand elle est cochée ou focalisée, et sans réglage de la carte.
 */
@Component({
  selector: 'app-case-selection',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './case-selection.scss',
  host: {
    class: 'case-selection',
    '[class.case-selection--cochee]': 'cochee()',
    '(click)': 'activer($event)',
  },
  template: `
    <input
      type="checkbox"
      class="case-selection__case"
      [checked]="cochee()"
      [attr.aria-label]="nom()"
      [attr.aria-disabled]="figee() ? 'true' : null"
    />
  `,
})
export class CaseSelection {
  /** Nom accessible de la case. */
  readonly nom = input.required<string>();
  readonly cochee = input(false);
  /** Vrai pendant une action en lot : la case ne bascule plus. */
  readonly figee = input(false);
  readonly basculer = output<BasculeSelection>();

  protected activer(evenement: MouseEvent): void {
    // L'état coché vient de `cochee` : le navigateur ne bascule pas la case lui-même, et la carte ne reçoit pas le clic.
    evenement.preventDefault();
    evenement.stopPropagation();
    if (!this.figee()) {
      this.basculer.emit({ plage: evenement.shiftKey });
    }
  }
}
