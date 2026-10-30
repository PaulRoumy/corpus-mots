import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

/** Page d'accueil provisoire, remplacée par la coquille de l'application (story 1.4). */
@Component({
  selector: 'app-accueil',
  imports: [MatCardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './accueil.scss',
  template: `
    <main class="accueil">
      <mat-card appearance="outlined">
        <mat-card-header>
          <mat-card-title><h1>corpus-mots</h1></mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>
            La banque mot-image de l'école est en cours de construction. Vous pourrez bientôt y
            préparer le vocabulaire de vos albums.
          </p>
        </mat-card-content>
      </mat-card>
    </main>
  `,
})
export class Accueil {}
