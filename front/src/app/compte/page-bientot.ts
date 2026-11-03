import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { EtatVide } from '../commun/etat-vide/etat-vide';

/**
 * Page d'attente de Mon compte et Mes données (story 1.7) : la route existe
 * déjà, ouverte depuis le Menu de profil. Le titre vient des données de la route.
 */
@Component({
  selector: 'app-page-bientot',
  imports: [EtatVide, MatButtonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../commun/page-rubrique.scss',
  template: `
    <div class="page">
      <h1 class="page__titre">{{ titre() }}</h1>
      <app-etat-vide icone="preparation" phrase="Cette page arrive bientôt.">
        <a matButton="filled" routerLink="/preparations">Retour aux préparations</a>
      </app-etat-vide>
    </div>
  `,
})
export class PageBientot {
  readonly titre = input.required<string>();
}
