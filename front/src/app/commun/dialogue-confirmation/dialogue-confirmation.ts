import { ChangeDetectionStrategy, Component, inject, Injectable } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

/** Contenu du Dialogue de confirmation. */
export interface DemandeConfirmation {
  readonly titre: string;
  readonly phrase: string;
  /** Libellé du bouton grave, verbe à l'infinitif (« Supprimer l'image »). */
  readonly libelleConfirmer: string;
}

/**
 * Dialogue de confirmation d'une action grave (DESIGN.md › dialogue-confirmation). « Annuler » vient d'abord et
 * reçoit le focus : Entrée sans rien toucher refuse. Surface, arrondi et ombre : styles.scss
 * (`mat.dialog-overrides`), car le dialogue est rendu dans la surcouche.
 */
@Component({
  selector: 'app-dialogue-confirmation',
  imports: [MatButtonModule, MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './dialogue-confirmation.scss',
  template: `
    <h2 mat-dialog-title>{{ demande.titre }}</h2>
    <mat-dialog-content>
      <p id="dialogue-confirmation-phrase" class="dialogue-confirmation__phrase">
        {{ demande.phrase }}
      </p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button
        matButton
        class="dialogue-confirmation__annuler"
        type="button"
        [mat-dialog-close]="false"
      >
        Annuler
      </button>
      <button
        matButton="filled"
        class="dialogue-confirmation__confirmer"
        type="button"
        [mat-dialog-close]="true"
      >
        {{ demande.libelleConfirmer }}
      </button>
    </mat-dialog-actions>
  `,
})
export class DialogueConfirmationContenu {
  protected readonly demande = inject<DemandeConfirmation>(MAT_DIALOG_DATA);
}

/**
 * Ouvre le Dialogue de confirmation et rend `true` si l'enseignant confirme ; `false` pour « Annuler », Échap ou
 * un clic hors du dialogue.
 */
@Injectable({ providedIn: 'root' })
export class DialogueConfirmation {
  private readonly dialogue = inject(MatDialog);

  async confirmer(demande: DemandeConfirmation): Promise<boolean> {
    const reference = this.dialogue.open<DialogueConfirmationContenu, DemandeConfirmation, boolean>(
      DialogueConfirmationContenu,
      {
        data: demande,
        role: 'alertdialog',
        ariaDescribedBy: 'dialogue-confirmation-phrase',
        // Focus initial sur « Annuler », bouton par défaut : Entrée sans rien toucher refuse.
        autoFocus: '.dialogue-confirmation__annuler',
        restoreFocus: true,
      },
    );
    return (await firstValueFrom(reference.afterClosed())) === true;
  }
}
