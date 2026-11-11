import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MotPreparationDto } from '../api/models/mot-preparation-dto';

/**
 * Carte de Mot de la Grille d'une Préparation (story 2.3). Tant que le Mot n'a pas d'Image (toujours le cas avant la
 * story 2.4), c'est une Carte « à illustrer » (key-preparation.html › `.todo`) : fond et bordure tirets « à illustrer »,
 * vignette vide avec « + », Mot en cursive, badge crayon « à illustrer ».
 *
 * Le bouton icône « Retirer « forme » de la préparation » (croix), toujours visible, émet `retirer` : le retrait se
 * fait sans confirmation et s'annule par le Bandeau « Annuler » (story 2.3, partie 2).
 */
@Component({
  selector: 'app-carte-mot',
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './carte-mot.scss',
  host: { '[class.carte-mot--a-illustrer]': '!mot().illustre' },
  template: `
    <button
      #boutonRetirer
      matIconButton
      class="carte-mot__retirer"
      type="button"
      [attr.aria-label]="'Retirer « ' + mot().forme + ' » de la préparation'"
      (click)="retirer.emit()"
    >
      <mat-icon svgIcon="fermer" aria-hidden="true" />
    </button>
    <span class="carte-mot__vignette" aria-hidden="true"><mat-icon svgIcon="plus" /></span>
    <span class="carte-mot__mot">{{ mot().forme }}</span>
    @if (!mot().illustre) {
      <span class="carte-mot__etat">
        <mat-icon svgIcon="crayon" aria-hidden="true" />
        à illustrer
      </span>
    }
  `,
})
export class CarteMot {
  readonly mot = input.required<MotPreparationDto>();
  readonly retirer = output<void>();

  private readonly boutonRetirer = viewChild.required('boutonRetirer', {
    read: ElementRef<HTMLButtonElement>,
  });

  /** Donne le focus au bouton « Retirer » : après le retrait d'une Carte voisine, ou le rétablissement de celle-ci. */
  focusRetirer(): void {
    this.boutonRetirer().nativeElement.focus();
  }
}
