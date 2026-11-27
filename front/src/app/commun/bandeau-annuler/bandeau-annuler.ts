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
import { MatIconModule } from '@angular/material/icon';
import {
  MAT_SNACK_BAR_DATA,
  MatSnackBar,
  MatSnackBarAction,
  MatSnackBarActions,
  MatSnackBarLabel,
  MatSnackBarRef,
} from '@angular/material/snack-bar';
import { NavigationStart, Router } from '@angular/router';
import { ecrituresApi } from './geste-suivant';

/** Temps laissé pour annuler (DESIGN.md › bandeau-annuler, EXPERIENCE.md : 8 s), hors survol et focus. */
export const DUREE_BANDEAU_ANNULER_MS = 8000;

/** Données passées au contenu du snackbar. */
export interface DonneesBandeauAnnuler {
  readonly message: string;
  /** Opération inverse fournie par l'appelant, appelée au plus une fois. */
  readonly annuler: () => unknown;
  /** Geste en lot : aucune minuterie, bouton « Fermer » (UX-DR-13, story 3.7). */
  readonly lot: boolean;
}

/** Options d'affichage du Bandeau « Annuler ». */
export interface OptionsBandeauAnnuler {
  /**
   * Geste en lot (plusieurs éléments) : le bandeau n'a aucune minuterie et reste jusqu'au geste suivant de
   * l'enseignant (une requête qui modifie des données), un autre bandeau, sa fermeture ou la sortie de la page.
   */
  readonly lot?: boolean;
}

/**
 * Contenu du Bandeau « Annuler » (UX-DR-13). Sa propre minuterie remplace la `duration` du snackbar, qui ne sait
 * pas se suspendre : le décompte s'arrête tant que le pointeur survole le bandeau ou que le focus y est (WCAG
 * 2.2.1), puis reprend avec le temps restant. Un bandeau de lot n'a aucune minuterie et offre « Fermer ».
 */
@Component({
  selector: 'app-bandeau-annuler',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatSnackBarLabel,
    MatSnackBarActions,
    MatSnackBarAction,
  ],
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
      @if (donnees.lot) {
        <button
          matIconButton
          class="bandeau-annuler__fermer"
          type="button"
          aria-label="Fermer"
          (click)="fermer()"
        >
          <mat-icon svgIcon="fermer" aria-hidden="true" />
        </button>
      }
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

  /** Bandeau d'un geste en lot. */
  get lot(): boolean {
    return this.donnees.lot;
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

  /** Ferme le bandeau sans annuler : « Annuler » est sans effet dès cet instant, même pendant l'animation de sortie. */
  fermer(): void {
    if (this.termine) {
      return;
    }
    this.termine = true;
    this.suspendre();
    this.reference.dismiss();
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
    if (this.donnees.lot) {
      return;
    }
    if (this.survol || this.focus) {
      this.suspendre();
    } else {
      this.demarrer();
    }
  }

  private demarrer(): void {
    // Geste en lot : aucune minuterie.
    if (this.donnees.lot || this.termine || this.minuterie !== undefined) {
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
 * Bandeau « Annuler » : confirme un geste courant fait sans confirmation et laisse 8 s pour l'annuler ; un geste en
 * lot n'a aucune minuterie et son bandeau se ferme, sans annuler, au geste suivant de l'enseignant
 * ({@link fermerLot}, à chaque requête qui modifie des données signalée par `ecrituresApi`). Un seul à la
 * fois : en afficher un nouveau ferme le précédent sans l'annuler (son opération reste faite). Le bandeau se ferme
 * de même, sans annuler, dès qu'une navigation commence (`NavigationStart`), quelle que soit la page : « Annuler » ne
 * vise jamais une page quittée. L'appelant passe son `DestroyRef` : une réponse arrivée après sa destruction n'ouvre
 * aucun bandeau, et sa destruction ferme le sien. Le message est annoncé aux lecteurs d'écran par `LiveAnnouncer` (la région vive du
 * snackbar est coupée pour ne pas le dire deux fois).
 */
@Injectable({ providedIn: 'root' })
export class BandeauAnnuler {
  private readonly snackBar = inject(MatSnackBar);
  private readonly annonceur = inject(LiveAnnouncer);
  /** Bandeau ouvert, s'il y en a un. */
  private ouvert: MatSnackBarRef<BandeauAnnulerContenu> | null = null;

  constructor() {
    // Service racine : l'abonnement vit autant que l'application.
    inject(Router).events.subscribe((evenement) => {
      if (evenement instanceof NavigationStart) {
        this.ouvert?.instance.fermer();
      }
    });
    ecrituresApi.subscribe(() => this.fermerLot());
  }

  afficher(
    message: string,
    annuler: () => unknown,
    appelant?: DestroyRef,
    options?: OptionsBandeauAnnuler,
  ): void {
    if (appelant?.destroyed) {
      return;
    }
    // Le bandeau remplacé est terminé dès maintenant : son « Annuler » est sans effet pendant sa sortie.
    this.ouvert?.instance.fermer();
    const reference = this.snackBar.openFromComponent<BandeauAnnulerContenu, DonneesBandeauAnnuler>(
      BandeauAnnulerContenu,
      { data: { message, annuler, lot: options?.lot ?? false }, politeness: 'off' },
    );
    this.ouvert = reference;
    const desabonner = appelant?.onDestroy(() => reference.instance.fermer());
    reference.afterDismissed().subscribe(() => {
      desabonner?.();
      if (this.ouvert === reference) {
        this.ouvert = null;
      }
    });
    void this.annonceur.announce(message, 'polite');
  }

  /** Geste suivant de l'enseignant : ferme sans annuler le bandeau ouvert s'il est celui d'un geste en lot. */
  fermerLot(): void {
    if (this.ouvert?.instance.lot) {
      this.ouvert.instance.fermer();
    }
  }
}
