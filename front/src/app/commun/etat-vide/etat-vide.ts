import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Icone } from '../icones';

/**
 * État vide (DESIGN.md › Accueil) : carte `surface`, pictogramme dans un cercle `tertiary-container`, une phrase
 * courte et, facultative, une action projetée (contenu projeté dans `<app-etat-vide>`).
 */
@Component({
  selector: 'app-etat-vide',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './etat-vide.scss',
  template: `
    <section class="etat-vide">
      <span class="etat-vide__pictogramme" aria-hidden="true"
        ><mat-icon [svgIcon]="icone()"
      /></span>
      <p class="etat-vide__phrase">{{ phrase() }}</p>
      <div class="etat-vide__action"><ng-content /></div>
    </section>
  `,
})
export class EtatVide {
  readonly phrase = input.required<string>();
  readonly icone = input.required<Icone>();
}
