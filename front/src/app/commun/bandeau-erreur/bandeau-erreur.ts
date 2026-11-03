import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Bandeau d'erreur (UX-DR-14) : bannière en tête de la zone concernée, `error-container` / `on-error-container`,
 * icône d'alerte, message, action « Réessayer » et bouton « Fermer ». Il reste affiché tant que le parent le garde
 * (jusqu'au succès de « Réessayer » ou à sa fermeture) et ne touche pas à la saisie de la page. `role="alert"`, porté par
 * le message seul (pas par les boutons), le fait annoncer aux lecteurs d'écran. Le message vient en général de `messageErreur`.
 */
@Component({
  selector: 'app-bandeau-erreur',
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './bandeau-erreur.scss',
  template: `
    <div class="bandeau-erreur">
      <mat-icon class="bandeau-erreur__icone" svgIcon="alerte" aria-hidden="true" />
      <p class="bandeau-erreur__message" role="alert">{{ message() }}</p>
      <button matButton class="bandeau-erreur__reessayer" type="button" (click)="reessayer.emit()">
        Réessayer
      </button>
      <button
        matIconButton
        class="bandeau-erreur__fermer"
        type="button"
        aria-label="Fermer"
        (click)="fermer.emit()"
      >
        <mat-icon svgIcon="fermer" aria-hidden="true" />
      </button>
    </div>
  `,
})
export class BandeauErreur {
  readonly message = input.required<string>();
  readonly reessayer = output<void>();
  readonly fermer = output<void>();
}
