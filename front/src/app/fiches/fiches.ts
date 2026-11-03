import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EtatVide } from '../commun/etat-vide/etat-vide';

/** Rubrique Fiches : État vide, la phrase seule ; l'action arrive avec l'epic des Fiches. */
@Component({
  selector: 'app-fiches',
  imports: [EtatVide],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../commun/page-rubrique.scss',
  template: `
    <div class="page">
      <h1 class="page__titre">Fiches</h1>
      <app-etat-vide icone="fiche" phrase="Pas encore de fiche." />
    </div>
  `,
})
export class Fiches {}
