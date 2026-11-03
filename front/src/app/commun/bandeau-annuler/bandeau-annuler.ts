import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injectable,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_SNACK_BAR_DATA,
  MatSnackBar,
  MatSnackBarAction,
  MatSnackBarActions,
  MatSnackBarLabel,
  MatSnackBarRef,
} from '@angular/material/snack-bar';

/** Temps laissé pour annuler (DESIGN.md › bandeau-annuler, EXPERIENCE.md : 8 s), hors survol et focus. */
export const DUREE_BANDEAU_ANNULER_MS = 8000;

/** Données passées au contenu du snackbar. */
export interface DonneesBandeauAnnuler {
  readonly message: string;
  /** Opération inverse fournie par l'appelant, appelée au plus une fois. */
  readonly annuler: () => unknown;
}

/**
 * Contenu du Bandeau « Annuler » (UX-DR-13). Sa propre minuterie remplace la `duration` du snackbar, qui ne sait
 * pas se suspendre : le décompte s'arrête tant que le pointeur survole le bandeau ou que le focus y est (WCAG
 * 2.2.1), puis reprend avec le temps restant.
 */
@Component({
  selector: 'app-bandeau-annuler',
  imports: [MatButtonModule, MatSnackBarLabel, MatSnackBarActions, MatSnackBarAction],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './bandeau-annuler.scss',
  host: {
    '(mouseenter)': 'survoler(true)',
    '(mouseleave)': 'survoler(false)',
    '(focusin)': 'entrerFocus()',
    '(focusout)': 'quitterFocus($event)',
  },
  template: `
    <div matSnackBarLabel class="bandeau-annuler__message">{{ donnees.message }}</div>
    <div matSnackBarActions>
      <button matButton matSnackBarAction type="button" (click)="annuler()">Annuler</button>
    </div>
  `,
})
export class BandeauAnnulerContenu {
  protected readonly donnees = inject<DonneesBandeauAnnuler>(MAT_SNACK_BAR_DATA);
  private readonly reference = inject<MatSnackBarRef<BandeauAnnulerContenu>>(MatSnackBarRef);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  private survol = false;
  private focus = false;
  private restant = DUREE_BANDEAU_ANNULER_MS;
  private debut = 0;
  private minuterie: ReturnType<typeof setTimeout> | undefined;
  private termine = false;

  constructor() {
    this.demarrer();
    inject(DestroyRef).onDestroy(() => this.suspendre());
  }

  /** Appelle l'opération inverse une seule fois, puis ferme le bandeau. */
  protected annuler(): void {
    if (this.termine) {
      return;
    }
    this.termine = true;
    this.suspendre();
    try {
      this.donnees.annuler();
    } finally {
      this.reference.dismissWithAction();
    }
  }

  protected survoler(dessus: boolean): void {
    this.survol = dessus;
    this.actualiser();
  }

  protected entrerFocus(): void {
    this.focus = true;
    this.actualiser();
  }

  /** Le focus ne quitte le bandeau que s'il part hors de lui (pas d'un de ses éléments à un autre). */
  protected quitterFocus(evenement: FocusEvent): void {
    const destination = evenement.relatedTarget;
    this.focus = destination instanceof Node && this.element.nativeElement.contains(destination);
    this.actualiser();
  }

  private actualiser(): void {
    if (this.survol || this.focus) {
      this.suspendre();
    } else {
      this.demarrer();
    }
  }

  private demarrer(): void {
    if (this.termine || this.minuterie !== undefined) {
      return;
    }
    this.debut = Date.now();
    this.minuterie = setTimeout(() => {
      this.minuterie = undefined;
      this.termine = true;
      this.reference.dismiss();
    }, this.restant);
  }

  private suspendre(): void {
    if (this.minuterie === undefined) {
      return;
    }
    clearTimeout(this.minuterie);
    this.minuterie = undefined;
    this.restant = Math.max(0, this.restant - (Date.now() - this.debut));
  }
}

/**
 * Bandeau « Annuler » : confirme un geste courant fait sans confirmation et laisse 8 s pour l'annuler. Un seul à la
 * fois : en afficher un nouveau ferme le précédent sans l'annuler (son opération reste faite). Le message est
 * annoncé aux lecteurs d'écran par `LiveAnnouncer` (la région vive du snackbar est coupée pour ne pas le dire deux
 * fois).
 */
@Injectable({ providedIn: 'root' })
export class BandeauAnnuler {
  private readonly snackBar = inject(MatSnackBar);
  private readonly annonceur = inject(LiveAnnouncer);

  afficher(message: string, annuler: () => unknown): void {
    this.snackBar.openFromComponent<BandeauAnnulerContenu, DonneesBandeauAnnuler>(
      BandeauAnnulerContenu,
      { data: { message, annuler }, politeness: 'off' },
    );
    void this.annonceur.announce(message, 'polite');
  }
}
