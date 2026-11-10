import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  linkedSignal,
  OnInit,
  output,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/** Longueur maximale du nom d'un Module (le back applique la même, espaces superflues retirées). */
export const LONGUEUR_MAX_NOM_MODULE = 200;

let prochainNumero = 0;

/**
 * Champ en ligne qui nomme un Module (story 2.2, partie 2), déplié à la place de la liste Module : dans l'En-tête de
 * Préparation (« Nouveau module », « Renommer ») et dans le Dialogue « Nouvelle préparation » (« Nouveau module »
 * seulement : pas de dialogue sur un dialogue). Il prend le focus en s'ouvrant. Entrée ou le bouton de validation
 * émettent `valider` avec le nom rogné ; Échap ou « Annuler » émettent `annuler`, sans fermer le dialogue qui le
 * contient. L'échec de l'enregistrement s'affiche sous le champ, annoncé aux lecteurs d'écran, jusqu'à ce que le nom soit
 * modifié.
 */
@Component({
  selector: 'app-champ-nom-module',
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './champ-nom-module.scss',
  template: `
    <mat-form-field class="champ-nom-module__champ" subscriptSizing="dynamic">
      <mat-label>{{ etiquette() }}</mat-label>
      <input
        #champ
        matInput
        type="text"
        autocomplete="off"
        [maxlength]="longueurMax"
        [formControl]="nom"
        [attr.aria-describedby]="erreurAffichee() ? idErreur : null"
        (input)="erreurMasquee.set(true)"
        (keydown.enter)="$event.preventDefault(); confirmer()"
        (keydown.escape)="$event.preventDefault(); $event.stopPropagation(); abandonner()"
      />
    </mat-form-field>
    <div class="champ-nom-module__actions">
      <button matButton type="button" [disabled]="enCours()" (click)="abandonner()">Annuler</button>
      <button
        matButton="tonal"
        type="button"
        [disabled]="!rempli() || enCours()"
        (click)="confirmer()"
      >
        {{ libelleValider() }}
      </button>
    </div>
    @if (erreurAffichee(); as message) {
      <p class="champ-nom-module__erreur" role="alert" [id]="idErreur">{{ message }}</p>
    }
  `,
})
export class ChampNomModule implements OnInit {
  /** Étiquette du champ (« Nom du nouveau module »). */
  readonly etiquette = input.required<string>();
  /** Libellé du bouton de validation (« Ajouter », « Renommer »). */
  readonly libelleValider = input.required<string>();
  /** Nom prérempli (renommage) ; vide pour un nouveau Module. */
  readonly valeurInitiale = input('');
  /** Vrai pendant l'enregistrement : ni validation ni abandon. */
  readonly enCours = input(false);
  /** Message de l'échec du dernier enregistrement, ou `null`. */
  readonly erreur = input<string | null>(null);

  readonly valider = output<string>();
  readonly annuler = output<void>();

  protected readonly longueurMax = LONGUEUR_MAX_NOM_MODULE;
  protected readonly idErreur = `champ-nom-module-erreur-${prochainNumero++}`;
  protected readonly nom = new FormControl('', { nonNullable: true });
  private readonly saisie = toSignal(this.nom.valueChanges, { initialValue: '' });
  protected readonly rempli = computed(() => this.saisie().trim() !== '');
  /** Vrai dès que le nom est modifié après un échec, jusqu'au prochain message. */
  protected readonly erreurMasquee = linkedSignal({ source: this.erreur, computation: () => false });
  protected readonly erreurAffichee = computed(() => (this.erreurMasquee() ? null : this.erreur()));

  private readonly champ = viewChild.required<ElementRef<HTMLInputElement>>('champ');

  constructor() {
    afterNextRender(() => {
      this.champ().nativeElement.focus();
      this.champ().nativeElement.select();
    });
  }

  ngOnInit(): void {
    this.nom.setValue(this.valeurInitiale());
  }

  protected confirmer(): void {
    if (this.rempli() && !this.enCours()) {
      this.valider.emit(this.nom.value.trim());
    }
  }

  protected abandonner(): void {
    if (!this.enCours()) {
      this.annuler.emit();
    }
  }
}
