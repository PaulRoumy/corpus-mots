import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EtatVide } from '../commun/etat-vide/etat-vide';

/**
 * Rubrique Banque : État vide, la phrase seule. Le Champ de recherche y mène par `?mot=` ; la recherche elle-même
 * arrive avec l'Epic 3.
 */
@Component({
  selector: 'app-banque',
  imports: [EtatVide],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../commun/page-rubrique.scss',
  template: `
    <div class="page">
      <h1 class="page__titre">Banque</h1>
      <app-etat-vide icone="banque" phrase="Aucune image." />
    </div>
  `,
})
export class Banque {}
