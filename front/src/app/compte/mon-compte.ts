import { LiveAnnouncer } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Api } from '../api/api';
import { modifierNomAffiche } from '../api/fn/mon-compte-resource/modifier-nom-affiche';
import { Annuaire } from '../commun/annuaire';
import { BandeauErreur } from '../commun/bandeau-erreur/bandeau-erreur';
import { CompteCourant } from '../commun/compte-courant';
import { MESSAGES_PAR_CODE, messageErreur } from '../commun/erreurs/message-erreur';

/** Même règle que le back (`ComptesService.renommer`) : sans espaces autour, de 1 à 100 caractères. */
export const LONGUEUR_MAX_NOM_AFFICHE = 100;

export function nettoyerNom(saisie: string): string {
  return saisie.trim();
}

function nomValide(saisie: string): boolean {
  const nom = nettoyerNom(saisie);
  return nom.length > 0 && nom.length <= LONGUEUR_MAX_NOM_AFFICHE;
}

function validateurNom(controle: AbstractControl<string>): ValidationErrors | null {
  return nomValide(controle.value ?? '') ? null : { nomAffiche: true };
}

/**
 * Mon compte (FR-3) : le nom affiché, seul modifiable, puis l'e-mail et le rôle en lecture seule, et rien d'autre
 * (aucun champ ne permet de saisir une donnée d'élève). « Enregistrer » n'est actif que si la saisie, nettoyée, est
 * valide et diffère du nom enregistré. Après l'enregistrement, le compte courant porte le nouveau nom (Menu de
 * profil, avatar) et l'annuaire déjà chargé est relu ; un échec ouvre le Bandeau d'erreur, la saisie restant en place.
 *
 * La coquille ne rend la page qu'une fois le compte chargé.
 */
@Component({
  selector: 'app-mon-compte',
  imports: [
    BandeauErreur,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../commun/page-rubrique.scss', './mon-compte.scss'],
  template: `
    <div class="page">
      <h1 class="page__titre">Mon compte</h1>

      @if (erreur(); as message) {
        <app-bandeau-erreur
          [message]="message"
          (reessayer)="enregistrer()"
          (fermer)="erreur.set(null)"
        />
      }

      <form class="mon-compte__formulaire" novalidate (submit)="soumettre($event)">
        <mat-form-field class="mon-compte__champ">
          <mat-label>Nom affiché</mat-label>
          <input matInput type="text" autocomplete="name" [formControl]="nom" />
          <mat-error>{{ messageNomInvalide }}</mat-error>
        </mat-form-field>
        <button
          matButton="filled"
          class="mon-compte__enregistrer"
          type="submit"
          [disabled]="!enregistrable()"
          disabledInteractive
        >
          Enregistrer
        </button>
      </form>

      <dl class="mon-compte__lecture">
        <div class="mon-compte__ligne">
          <dt>E-mail</dt>
          <dd>{{ email() || 'Non renseigné' }}</dd>
        </div>
        <div class="mon-compte__ligne">
          <dt>Rôle</dt>
          <dd>{{ role() }}</dd>
        </div>
      </dl>
    </div>
  `,
})
export class MonCompte {
  private readonly api = inject(Api);
  private readonly annonceur = inject(LiveAnnouncer);
  private readonly annuaire = inject(Annuaire);
  private readonly compteCourant = inject(CompteCourant);

  protected readonly messageNomInvalide = MESSAGES_PAR_CODE['compte.nom_affiche_invalide'];

  private readonly nomEnregistre = computed(() => this.compteCourant.compte()?.nomAffiche ?? '');
  protected readonly email = computed(() => this.compteCourant.compte()?.email ?? '');
  protected readonly role = computed(() =>
    this.compteCourant.administrateur() ? 'Administrateur' : 'Enseignant',
  );

  protected readonly nom = new FormControl(this.nomEnregistre(), {
    nonNullable: true,
    validators: [validateurNom],
  });
  private readonly saisie = toSignal(this.nom.valueChanges, { initialValue: this.nom.value });

  protected readonly envoiEnCours = signal(false);
  protected readonly erreur = signal<string | null>(null);

  /** Saisie valide, différente du nom enregistré, et aucun envoi en cours. */
  protected readonly enregistrable = computed(
    () =>
      !this.envoiEnCours() &&
      nomValide(this.saisie()) &&
      nettoyerNom(this.saisie()) !== this.nomEnregistre(),
  );

  protected soumettre(evenement: Event): void {
    evenement.preventDefault();
    void this.enregistrer();
  }

  /** Enregistre la saisie ; refusée avant l'envoi si elle est invalide (champ en erreur) ou inchangée. */
  async enregistrer(): Promise<void> {
    this.nom.markAsTouched();
    if (this.envoiEnCours()) {
      return;
    }
    if (!this.enregistrable()) {
      // « Réessayer » sur une saisie revenue au nom enregistré, ou devenue invalide : plus rien à envoyer.
      this.erreur.set(null);
      return;
    }
    const envoye = nettoyerNom(this.nom.value);
    this.envoiEnCours.set(true);
    try {
      const compte = await this.api.invoke(modifierNomAffiche, { body: { nomAffiche: envoye } });
      this.erreur.set(null);
      this.compteCourant.mettreAJour(compte);
      if (nettoyerNom(this.nom.value) === envoye) {
        this.nom.setValue(compte.nomAffiche);
      }
      if (this.annuaire.etat().statut === 'charge') {
        void this.annuaire.recharger();
      }
      this.annonceur.announce('Nom affiché enregistré.');
    } catch (erreur) {
      this.erreur.set(messageErreur(erreur));
    } finally {
      this.envoiEnCours.set(false);
    }
  }
}
