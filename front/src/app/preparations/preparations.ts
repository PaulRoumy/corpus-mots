import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EtatVide } from '../commun/etat-vide/etat-vide';

/** Rubrique Préparations (accueil) : État vide, la phrase seule ; l'action arrive avec l'Epic 2. */
@Component({
  selector: 'app-preparations',
  imports: [EtatVide],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../commun/page-rubrique.scss',
  template: `
    <div class="page">
      <h1 class="page__titre">Préparations</h1>
      <app-etat-vide
        icone="preparation"
        phrase="Pas encore de préparation. Choisissez un album : les mots déjà illustrés par l'équipe arrivent tout seuls."
      />
    </div>
  `,
})
export class Preparations {}
