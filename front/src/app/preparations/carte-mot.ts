import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MotPreparationDto } from '../api/models/mot-preparation-dto';

/**
 * Carte de Mot de la Grille d'une Préparation (story 2.3). Tant que le Mot n'a pas d'Image (toujours le cas avant la
 * story 2.4), c'est une Carte « à illustrer » (key-preparation.html › `.todo`) : fond et bordure tirets « à illustrer »,
 * vignette vide avec « + », Mot en cursive, badge crayon « à illustrer ».
 */
@Component({
  selector: 'app-carte-mot',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './carte-mot.scss',
  host: { '[class.carte-mot--a-illustrer]': '!mot().illustre' },
  template: `
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
}
