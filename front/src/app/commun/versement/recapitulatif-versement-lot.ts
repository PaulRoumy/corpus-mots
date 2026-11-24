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
import { BandeauErreur } from '../bandeau-erreur/bandeau-erreur';
import { EchecVersement, RecapitulatifVersement } from './versement-lot';

/**
 * Suite de la Barre d'actions en lot après un « Verser » (story 3.3), partagée par la Banque et la Préparation : le
 * Bandeau d'erreur du versement (« Réessayer » s'il est réessayable), puis le récapitulatif : message de partage, bilan
 * seul en `role="status"` (la région existe avant d'être remplie), liste des refusées hors de la région, défilante au
 * clavier, et « Fermer le récapitulatif ». La page tient l'état (`VersementLot`) et reçoit les gestes.
 */
@Component({
  selector: 'app-recapitulatif-versement-lot',
  imports: [BandeauErreur, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './recapitulatif-versement-lot.scss',
  template: `
    @if (erreur(); as echec) {
      <app-bandeau-erreur
        class="versement-lot__erreur"
        [message]="echec.message"
        [reessayable]="echec.reessayable"
        (reessayer)="reessayer.emit()"
        (fermer)="fermerErreur.emit()"
      />
    }
    <div class="versement-lot__ligne">
      <div class="versement-lot__recapitulatif">
        @if (recapitulatif()?.partage; as partage) {
          <p class="versement-lot__partage">{{ partage }}</p>
        }
        <!-- Seul le bilan est annoncé ; la région existe avant d'être remplie. -->
        <p class="versement-lot__bilan" role="status">{{ recapitulatif()?.bilan }}</p>
        @if (recapitulatif()?.refusees; as refusees) {
          @if (refusees.length > 0) {
            <ul class="versement-lot__refusees" tabindex="0" [attr.aria-label]="libelleRefusees()">
              @for (refus of refusees; track refus.cle) {
                <li>{{ refus.texte }}</li>
              }
            </ul>
          }
        }
      </div>
      @if (recapitulatif() !== null) {
        <button
          #fermerRecap
          matIconButton
          class="versement-lot__fermer"
          type="button"
          aria-label="Fermer le récapitulatif"
          (click)="fermerRecapitulatif.emit()"
        >
          <mat-icon svgIcon="fermer" aria-hidden="true" />
        </button>
      }
    </div>
  `,
})
export class RecapitulatifVersementLot {
  readonly recapitulatif = input<RecapitulatifVersement | null>(null);
  readonly erreur = input<EchecVersement | null>(null);
  /** Nom de la liste des refusées, selon ce que la page sélectionne (« Images non versées », « Mots non versés »). */
  readonly libelleRefusees = input('Éléments non versés');
  readonly reessayer = output<void>();
  readonly fermerErreur = output<void>();
  readonly fermerRecapitulatif = output<void>();

  private readonly boutonFermer = viewChild('fermerRecap', { read: ElementRef });

  /** Bouton « Fermer le récapitulatif », s'il est affiché : le focus y va quand « Verser » disparaît. */
  elementFermer(): HTMLElement | undefined {
    return this.boutonFermer()?.nativeElement as HTMLElement | undefined;
  }
}
