import { LiveAnnouncer } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { Api } from '../../api/api';
import { inviter } from '../../api/fn/comptes-resource/inviter';
import { listerComptes } from '../../api/fn/comptes-resource/lister-comptes';
import { renvoyerInvitation } from '../../api/fn/comptes-resource/renvoyer-invitation';
import { CompteDto } from '../../api/models/compte-dto';
import { BandeauErreur } from '../../commun/bandeau-erreur/bandeau-erreur';
import { codeErreur, MESSAGES_PAR_CODE, messageErreur } from '../../commun/erreurs/message-erreur';
import { Squelette } from '../../commun/squelette/squelette';

/** Libellés affichés des statuts (décisions de la story 1.5). */
export const LIBELLES_STATUT: Readonly<Record<CompteDto['statut'], string>> = {
  invite: 'invité',
  actif: 'actif',
  desactive: 'désactivé',
  suppression_en_cours: 'suppression en cours',
};

export const MESSAGE_EMAIL_INVALIDE = 'Saisissez une adresse e-mail valide.';

const CODE_EMAIL_DEJA_UTILISE = 'compte.email_deja_utilise';

/**
 * Même normalisation que le back (`ComptesAdministration.normaliser`) : sans espaces autour, en minuscules. Un espace
 * intérieur reste, et rend l'adresse invalide.
 */
export function normaliserEmail(saisie: string): string {
  return saisie.trim().toLowerCase();
}

/**
 * Même forme que celle qu'exige le back : partie locale, `@`, domaine avec au moins un point ; sans espace, caractère
 * de contrôle ni caractère que Keycloak refuse (`<>()[],;:"'`), 254 caractères au plus.
 */
// eslint-disable-next-line no-control-regex
const FORME_EMAIL =
  /^[^@\s\u0000-\u001f\u007f<>()[\],;:"']+@[^@\s\u0000-\u001f\u007f<>()[\],;:"'.]+(\.[^@\s\u0000-\u001f\u007f<>()[\],;:"'.]+)+$/;
const LONGUEUR_MAX_EMAIL = 254;

function emailValide(controle: AbstractControl<string>): ValidationErrors | null {
  const adresse = normaliserEmail(controle.value ?? '');
  return adresse.length <= LONGUEUR_MAX_EMAIL && FORME_EMAIL.test(adresse) ? null : { email: true };
}

type Operation = 'liste' | 'invitation' | 'renvoi';

/** Erreur montrée dans le Bandeau d'erreur ; « Réessayer » relance l'opération échouée. */
interface ErreurAffichee {
  operation: Operation;
  message: string;
  reessayer: () => void;
}

/**
 * Administration › Comptes (FR-1, UX-DR-41) : formulaire « Inviter » et liste des comptes de l'équipe (nom, e-mail,
 * statut, rôle), invités en premier (ordre donné par le back) ; « Renvoyer l'invitation » sur les lignes « invité ».
 * Un e-mail déjà associé à un compte s'affiche sous le champ ; tout autre échec ouvre le Bandeau d'erreur, la saisie
 * restant en place.
 */
@Component({
  selector: 'app-comptes',
  imports: [
    BandeauErreur,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    ReactiveFormsModule,
    Squelette,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../../commun/page-rubrique.scss', './comptes.scss'],
  template: `
    <div class="page">
      <h1 class="page__titre">Comptes</h1>

      @if (erreur(); as affichee) {
        <app-bandeau-erreur
          [message]="affichee.message"
          (reessayer)="affichee.reessayer()"
          (fermer)="erreur.set(null)"
        />
      }

      <form class="comptes__invitation" novalidate (submit)="soumettre($event)">
        <mat-form-field class="comptes__champ">
          <mat-label>E-mail du collègue</mat-label>
          <input matInput type="email" autocomplete="off" [formControl]="email" />
          @if (email.hasError('dejaUtilise')) {
            <mat-error>{{ messageDejaUtilise }}</mat-error>
          } @else {
            <mat-error>{{ messageEmailInvalide }}</mat-error>
          }
        </mat-form-field>
        <button
          matButton="filled"
          class="comptes__inviter"
          type="submit"
          [disabled]="envoiEnCours()"
        >
          Inviter
        </button>
      </form>

      @if (comptes(); as liste) {
        <div class="comptes__defilement">
          <table
            mat-table
            class="comptes__table"
            aria-label="Comptes de l'équipe"
            [dataSource]="liste"
          >
            <ng-container matColumnDef="nom">
              <th mat-header-cell *matHeaderCellDef scope="col">Nom</th>
              <td mat-cell *matCellDef="let compte">
                @if (compte.statut === 'invite') {
                  <span class="comptes__en-attente">en attente</span>
                } @else {
                  {{ compte.nomAffiche }}
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef scope="col">E-mail</th>
              <td mat-cell *matCellDef="let compte">{{ compte.email }}</td>
            </ng-container>
            <ng-container matColumnDef="statut">
              <th mat-header-cell *matHeaderCellDef scope="col">Statut</th>
              <td mat-cell *matCellDef="let compte">{{ libelleStatut(compte) }}</td>
            </ng-container>
            <ng-container matColumnDef="role">
              <th mat-header-cell *matHeaderCellDef scope="col">Rôle</th>
              <td mat-cell *matCellDef="let compte">
                {{ compte.administrateur ? 'administrateur' : 'enseignant' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef scope="col">
                <span class="cm-visuellement-masque">Actions</span>
              </th>
              <td mat-cell *matCellDef="let compte">
                @if (compte.statut === 'invite') {
                  <button
                    matButton
                    type="button"
                    [attr.aria-label]="libelleRenvoi(compte)"
                    [disabled]="renvoisEnCours().has(compte.id)"
                    (click)="renvoyer(compte)"
                  >
                    Renvoyer l'invitation
                  </button>
                }
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="colonnes"></tr>
            <tr mat-row *matRowDef="let compte; columns: colonnes"></tr>
          </table>
        </div>
      } @else if (chargementEnCours()) {
        <app-squelette forme="ligne" [nombre]="4" />
      }
    </div>
  `,
})
export class Comptes implements OnInit {
  private readonly api = inject(Api);
  private readonly annonceur = inject(LiveAnnouncer);

  protected readonly colonnes = ['nom', 'email', 'statut', 'role', 'actions'];
  protected readonly messageEmailInvalide = MESSAGE_EMAIL_INVALIDE;
  protected readonly messageDejaUtilise = MESSAGES_PAR_CODE[CODE_EMAIL_DEJA_UTILISE];

  protected readonly email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, emailValide],
  });

  /** `null` tant qu'aucune liste n'a été reçue ; une liste déjà affichée reste en place pendant un rechargement. */
  protected readonly comptes = signal<CompteDto[] | null>(null);
  protected readonly chargementEnCours = signal(false);
  protected readonly erreur = signal<ErreurAffichee | null>(null);
  protected readonly envoiEnCours = signal(false);
  /** Comptes dont un renvoi d'invitation est en cours : leur bouton reste désactivé jusqu'à la réponse. */
  protected readonly renvoisEnCours = signal<ReadonlySet<string>>(new Set());

  ngOnInit(): void {
    void this.charger();
  }

  protected libelleStatut(compte: CompteDto): string {
    return LIBELLES_STATUT[compte.statut] ?? compte.statut;
  }

  /** Nom accessible du bouton : chaque ligne nomme son destinataire (texte visible inchangé). */
  protected libelleRenvoi(compte: CompteDto): string {
    return `Renvoyer l'invitation à ${compte.email}`;
  }

  protected soumettre(evenement: Event): void {
    evenement.preventDefault();
    void this.envoyerInvitation();
  }

  /** Charge la liste ; en échec, Bandeau d'erreur dont « Réessayer » recharge. */
  async charger(): Promise<void> {
    this.chargementEnCours.set(true);
    try {
      this.comptes.set(await this.api.invoke(listerComptes));
      this.effacerErreur('liste');
    } catch (erreur) {
      this.montrerErreur('liste', erreur, () => void this.charger());
    } finally {
      this.chargementEnCours.set(false);
    }
  }

  /** Invite l'e-mail saisi ; refusé avant l'envoi s'il n'a pas la forme d'une adresse. */
  async envoyerInvitation(): Promise<void> {
    this.email.markAsTouched();
    if (this.email.invalid || this.envoiEnCours()) {
      return;
    }
    await this.inviterAdresse(normaliserEmail(this.email.value));
  }

  /**
   * Invite `adresse` ; « Réessayer » renvoie exactement cette adresse, même si le champ a changé entre-temps. Le
   * champ n'est vidé (ou marqué « déjà utilisé ») que s'il porte encore cette adresse.
   */
  private async inviterAdresse(adresse: string): Promise<void> {
    if (this.envoiEnCours()) {
      return;
    }
    const champSurCetteAdresse = () => normaliserEmail(this.email.value) === adresse;
    this.envoiEnCours.set(true);
    try {
      await this.api.invoke(inviter, { body: { email: adresse } });
      this.effacerErreur('invitation');
      if (champSurCetteAdresse()) {
        this.email.reset();
      }
      this.annonceur.announce(`Invitation envoyée à ${adresse}.`);
      void this.charger();
    } catch (erreur) {
      if (codeErreur(erreur) === CODE_EMAIL_DEJA_UTILISE && champSurCetteAdresse()) {
        this.effacerErreur('invitation');
        this.email.setErrors({ dejaUtilise: true });
      } else {
        this.montrerErreur('invitation', erreur, () => void this.inviterAdresse(adresse));
      }
    } finally {
      this.envoiEnCours.set(false);
    }
  }

  /** Renvoie l'e-mail d'invitation d'un compte « invité ». */
  async renvoyer(compte: CompteDto): Promise<void> {
    this.renvoisEnCours.update((ids) => new Set(ids).add(compte.id));
    try {
      await this.api.invoke(renvoyerInvitation, { id: compte.id });
      this.effacerErreur('renvoi');
      this.annonceur.announce(`Invitation renvoyée à ${compte.email}.`);
    } catch (erreur) {
      const code = codeErreur(erreur);
      if (code === 'compte.invitation_inutile' || code === 'ressource.introuvable') {
        // Le compte a changé entre-temps (déjà actif, supprimé) : renvoyer échouerait encore ; la liste reprend
        // l'état du back, et « Réessayer » la recharge.
        this.montrerErreur(
          'renvoi',
          erreur,
          () => void this.charger().then(() => this.effacerErreur('renvoi')),
        );
        void this.charger();
      } else {
        this.montrerErreur('renvoi', erreur, () => void this.renvoyer(compte));
      }
    } finally {
      this.renvoisEnCours.update((ids) => {
        const restants = new Set(ids);
        restants.delete(compte.id);
        return restants;
      });
    }
  }

  private montrerErreur(operation: Operation, erreur: unknown, reessayer: () => void): void {
    this.erreur.set({ operation, message: messageErreur(erreur), reessayer });
  }

  /** Retire le Bandeau d'erreur s'il concernait cette opération, qui vient de réussir. */
  private effacerErreur(operation: Operation): void {
    if (this.erreur()?.operation === operation) {
      this.erreur.set(null);
    }
  }
}
