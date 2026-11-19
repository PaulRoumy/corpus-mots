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
import { outputFromObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LONGUEUR_MAX_MOT, LONGUEUR_MAX_SAISIE } from './longueurs-mot';
import type { Navigation } from './panneau-detection';

export { LONGUEUR_MAX_MOT, LONGUEUR_MAX_SAISIE };

let prochainNumero = 0;

/**
 * Champ de saisie rapide d'une Préparation (story 2.3, key-preparation.html › `.field`) : « Ajouter un mot », aide
 * « Entrée pour ajouter ». Entrée émet `ajouter` avec la saisie rognée, si elle n'est pas vide, puis vide aussitôt le
 * champ, qui garde le focus : l'enseignant tape le Mot suivant sans attendre la réponse. Le champ prend le focus à
 * l'affichage si `focusInitial` est vrai.
 *
 * Un refus que l'enseignant doit corriger (Mot déjà présent) s'affiche sous le champ par `refuser`, annoncé aux lecteurs
 * d'écran, jusqu'à la prochaine frappe ; la saisie refusée revient dans le champ s'il est resté vide.
 *
 * Chaque changement de la valeur est émis par `saisieModifiee`, sans validation : la page la donne au Panneau de
 * détection (story 2.7), qui ne prend jamais le focus.
 *
 * Retenir une Image (story 2.7, partie 2) : le champ est un combobox ARIA 1.2 dont la liste est celle du Panneau de
 * détection (`idListe`, `deplie`, `idActif` pour `aria-activedescendant`). ↓, ↑ et Échap sont émis par `naviguer`, sans
 * que le focus quitte le champ ; Entrée émet toujours `ajouter` et la page décide, selon l'Image choisie.
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
        role="combobox"
        aria-autocomplete="list"
        [attr.aria-expanded]="deplie()"
        [attr.aria-controls]="deplie() ? idListe() : null"
        [attr.aria-activedescendant]="idActif()"
        [attr.aria-describedby]="erreur() ? idAide + ' ' + idErreur : idAide"
        (input)="erreur.set(null)"
        (keydown.enter)="$event.preventDefault(); envoyer()"
        (keydown.arrowdown)="naviguerVers($event, 'suivant')"
        (keydown.arrowup)="naviguerVers($event, 'precedent')"
        (keydown.escape)="annulerChoix($event)"
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

  /** Identifiant de la liste des propositions (Panneau de détection), cible de `aria-controls`. */
  readonly idListe = input<string | null>(null);
  /** Vrai quand la liste propose au moins une option (`aria-expanded`). */
  readonly deplie = input(false);
  /** Identifiant de l'option choisie, `null` sans choix (`aria-activedescendant`). */
  readonly idActif = input<string | null>(null);

  /** Saisie rognée, non vide, à ajouter à la Préparation. */
  readonly ajouter = output<string>();
  /** ↓, ↑ ou Échap dans le champ, pour parcourir les propositions. */
  readonly naviguer = output<Navigation>();

  protected readonly longueurMax = LONGUEUR_MAX_SAISIE;
  private readonly numero = prochainNumero++;
  protected readonly idAide = `saisie-rapide-aide-${this.numero}`;
  protected readonly idErreur = `saisie-rapide-erreur-${this.numero}`;
  protected readonly saisie = new FormControl('', { nonNullable: true });
  protected readonly erreur = signal<string | null>(null);

  /** Valeur du champ à chaque changement (frappe, vidage après Entrée, saisie refusée remise) : la détection la suit. */
  readonly saisieModifiee = outputFromObservable(this.saisie.valueChanges);

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

  /** Vide le champ après une Image retenue d'un clic, et lui rend le focus. */
  vider(): void {
    this.erreur.set(null);
    this.saisie.setValue('');
    this.focus();
  }

  /** ↓ ou ↑ : seulement quand des propositions sont dépliées ; le curseur ne bouge pas dans le champ. */
  protected naviguerVers(evenement: Event, navigation: Navigation): void {
    if (!this.deplie()) {
      return;
    }
    evenement.preventDefault();
    this.naviguer.emit(navigation);
  }

  /** Échap retire le choix ; il ne remonte pas (un panneau ouvert à côté ne se ferme pas pour autant). */
  protected annulerChoix(evenement: Event): void {
    if (this.idActif() === null) {
      return;
    }
    evenement.preventDefault();
    evenement.stopPropagation();
    this.naviguer.emit('annuler');
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
