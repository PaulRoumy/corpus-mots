import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/** Longueur maximale d'un Mot, une fois la saisie normalisée (le back applique la limite exacte). */
export const LONGUEUR_MAX_MOT = 100;

/** Longueur maximale du champ : un Mot de 100 caractères précédé de l'article le plus long et d'une espace (« une »). */
export const LONGUEUR_MAX_SAISIE = LONGUEUR_MAX_MOT + 'une '.length;

let prochainNumero = 0;

/**
 * Champ de saisie rapide d'une Préparation (story 2.3, key-preparation.html › `.field`) : « Ajouter un mot », aide
 * « Entrée pour ajouter ». Entrée émet `ajouter` avec la saisie rognée, si elle n'est pas vide, puis vide aussitôt le
 * champ, qui garde le focus : l'enseignant tape le Mot suivant sans attendre la réponse. Le champ prend le focus à
 * l'affichage si `focusInitial` est vrai.
 *
 * Un refus que l'enseignant doit corriger (Mot déjà présent) s'affiche sous le champ par `refuser`, annoncé aux lecteurs
 * d'écran, jusqu'à la prochaine frappe ; la saisie refusée revient dans le champ s'il est resté vide.
 */
@Component({
  selector: 'app-saisie-rapide',
  imports: [MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './saisie-rapide.scss',
  template: `
    <mat-form-field class="saisie-rapide__champ" subscriptSizing="dynamic">
      <mat-label>Ajouter un mot</mat-label>
      <input
        #champ
        matInput
        type="text"
        autocomplete="off"
        enterkeyhint="enter"
        [maxlength]="longueurMax"
        [formControl]="saisie"
        [attr.aria-describedby]="erreur() ? idAide + ' ' + idErreur : idAide"
        (input)="erreur.set(null)"
        (keydown.enter)="$event.preventDefault(); envoyer()"
      />
      <span matSuffix class="saisie-rapide__aide" [id]="idAide">Entrée pour ajouter</span>
    </mat-form-field>
    @if (erreur(); as message) {
      <p class="saisie-rapide__erreur" role="alert" [id]="idErreur">{{ message }}</p>
    }
  `,
})
export class SaisieRapide {
  /** Vrai pour prendre le focus à l'affichage (Préparation sans Mot). */
  readonly focusInitial = input(false);

  /** Saisie rognée, non vide, à ajouter à la Préparation. */
  readonly ajouter = output<string>();

  protected readonly longueurMax = LONGUEUR_MAX_SAISIE;
  private readonly numero = prochainNumero++;
  protected readonly idAide = `saisie-rapide-aide-${this.numero}`;
  protected readonly idErreur = `saisie-rapide-erreur-${this.numero}`;
  protected readonly saisie = new FormControl('', { nonNullable: true });
  protected readonly erreur = signal<string | null>(null);

  private readonly champ = viewChild.required<ElementRef<HTMLInputElement>>('champ');

  constructor() {
    afterNextRender(() => {
      if (this.focusInitial()) {
        this.focus();
      }
    });
  }

  focus(): void {
    this.champ().nativeElement.focus();
  }

  /** Affiche `message` sous le champ et y remet `saisie` s'il est vide. */
  refuser(message: string, saisie: string): void {
    if (this.saisie.value.trim() === '') {
      this.saisie.setValue(saisie);
    }
    this.erreur.set(message);
  }

  protected envoyer(): void {
    const saisie = this.saisie.value.trim();
    if (saisie === '') {
      return;
    }
    this.erreur.set(null);
    this.saisie.setValue('');
    this.ajouter.emit(saisie);
  }
}
