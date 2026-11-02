import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Api } from '../api/api';
import { lireMonCompte } from '../api/fn/mon-compte-resource/lire-mon-compte';
import { MonCompteDto } from '../api/models/mon-compte-dto';
import { Authentification } from '../commun/authentification/authentification';

type Etat = { compte: MonCompteDto } | { refus: 'compte_inactif' | 'erreur' } | null;

/**
 * Page d'accueil provisoire, remplacée par la coquille de l'application (story 1.4) : salue l'enseignant connecté
 * et propose la déconnexion, en attendant le Menu de profil.
 */
@Component({
  selector: 'app-accueil',
  imports: [MatButtonModule, MatCardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './accueil.scss',
  template: `
    <main class="accueil">
      <mat-card appearance="outlined">
        <mat-card-header>
          <mat-card-title><h1>corpus-mots</h1></mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @let etatCourant = etat();
          @if (etatCourant && 'compte' in etatCourant) {
            <p class="salutation">Bonjour, {{ etatCourant.compte.nomAffiche }}</p>
          } @else if (etatCourant && etatCourant.refus === 'compte_inactif') {
            <p role="alert">Votre compte n'est pas actif. Adressez-vous à l'administrateur de l'école.</p>
          } @else if (etatCourant) {
            <p role="alert">Votre compte n'a pas pu être chargé. Rechargez la page.</p>
          }
          <p>
            La banque mot-image de l'école est en cours de construction. Vous pourrez bientôt y
            préparer le vocabulaire de vos albums.
          </p>
        </mat-card-content>
        <mat-card-actions>
          <button mat-stroked-button type="button" (click)="deconnecter()">Se déconnecter</button>
        </mat-card-actions>
      </mat-card>
    </main>
  `,
})
export class Accueil {
  private readonly api = inject(Api);
  private readonly authentification = inject(Authentification);

  protected readonly etat = signal<Etat>(null);

  constructor() {
    this.api.invoke(lireMonCompte).then(
      (compte) => this.etat.set({ compte }),
      (erreur: unknown) =>
        this.etat.set({
          refus:
            erreur instanceof HttpErrorResponse && erreur.error?.code === 'compte.inconnu_ou_inactif'
              ? 'compte_inactif'
              : 'erreur',
        }),
    );
  }

  protected deconnecter(): void {
    void this.authentification.deconnecter();
  }
}
