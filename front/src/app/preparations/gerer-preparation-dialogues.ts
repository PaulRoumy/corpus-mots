import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, Injector, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { firstValueFrom } from 'rxjs';
import { Api } from '../api/api';
import { dupliquerPreparation } from '../api/fn/preparations-resource/dupliquer-preparation';
import { renommerPreparation } from '../api/fn/preparations-resource/renommer-preparation';
import { CartePreparationDto } from '../api/models/carte-preparation-dto';
import { BandeauErreur } from '../commun/bandeau-erreur/bandeau-erreur';
import {
  erreurPassagere,
  MESSAGES_PAR_CODE,
  messageErreur,
} from '../commun/erreurs/message-erreur';
import { LIBELLES_SECTION, Section, SECTIONS } from '../commun/repere-section/repere-section';
import {
  LONGUEUR_MAX_NOM_PREPARATION,
  nettoyerNomPreparation,
  nomPreparation,
} from './nom-preparation';

/** Échec affiché dans un Bandeau d'erreur du dialogue ; `reessayer` absent pour un refus que rien ne changerait. */
interface ErreurAffichee {
  readonly message: string;
  readonly reessayer: (() => void) | null;
}

/** Erreur du champ « Nom » : nom nettoyé de plus de 100 caractères. */
const ERREUR_TROP_LONG = 'tropLong';

/** Issue d'un dialogue dont la Préparation n'existe plus (`404`) : la page retire sa Carte. */
export const PREPARATION_INTROUVABLE = 'introuvable';
export type PreparationIntrouvable = typeof PREPARATION_INTROUVABLE;

/** Message du Bandeau de l'accueil pour une Préparation supprimée ailleurs entre-temps. */
export const MESSAGE_PREPARATION_INTROUVABLE = "Cette préparation n'existe plus.";

/** Vrai pour une réponse `404` : la Préparation n'existe plus (ou n'est pas celle de l'enseignant). */
export function introuvable(erreur: unknown): boolean {
  return erreur instanceof HttpErrorResponse && erreur.status === 404;
}

/** Section présélectionnée pour la copie : la suivante, la GS restant la GS. */
export function sectionSuivante(section: Section): Section {
  return section === 'ps' ? 'ms' : 'gs';
}

/**
 * Dialogue « Renommer la préparation » (story 2.10), ouvert par le menu d'une Carte de Préparation de l'accueil : un
 * champ prérempli avec le nom affiché. « Enregistrer » ou Entrée envoie le nom et ferme le dialogue avec la Carte
 * renvoyée ; un nom vide efface le nom propre, et le titre de l'Album s'affiche de nouveau. Un nom inchangé ferme sans
 * rien envoyer. « Annuler », Échap ou un clic hors du dialogue le ferment sans rien envoyer. Pendant l'envoi, le
 * dialogue ne se ferme pas ; en échec, il reste ouvert avec la saisie et un Bandeau d'erreur (« Réessayer » pour un
 * échec passager).
 */
@Component({
  selector: 'app-renommer-preparation',
  imports: [
    BandeauErreur,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './gerer-preparation-dialogues.scss',
  template: `
    <h2 mat-dialog-title>Renommer la préparation</h2>
    <mat-dialog-content class="gerer-preparation">
      @if (erreur(); as affichee) {
        <app-bandeau-erreur
          [message]="affichee.message"
          [reessayable]="affichee.reessayer !== null"
          (reessayer)="affichee.reessayer?.()"
          (fermer)="erreur.set(null)"
        />
      }
      <mat-form-field class="gerer-preparation__champ">
        <mat-label>Nom de la préparation</mat-label>
        <input
          matInput
          class="renommer-preparation__saisie"
          type="text"
          autocomplete="off"
          [formControl]="nom"
          (keydown.enter)="$event.preventDefault(); enregistrer()"
        />
        <mat-hint>Laissé vide, le titre de l'album s'affiche.</mat-hint>
        @if (nom.hasError(erreurTropLong)) {
          <mat-error>{{ messageTropLong }}</mat-error>
        }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button matButton type="button" [mat-dialog-close]="undefined" [disabled]="envoiEnCours()">
        Annuler
      </button>
      <button matButton="filled" type="button" [disabled]="envoiEnCours()" (click)="enregistrer()">
        Enregistrer
      </button>
    </mat-dialog-actions>
  `,
})
export class RenommerPreparationDialogue {
  private readonly api = inject(Api);
  private readonly reference =
    inject<MatDialogRef<RenommerPreparationDialogue, CartePreparationDto | PreparationIntrouvable>>(
      MatDialogRef,
    );
  private readonly carte = inject<CartePreparationDto>(MAT_DIALOG_DATA);

  protected readonly erreurTropLong = ERREUR_TROP_LONG;
  protected readonly messageTropLong = MESSAGES_PAR_CODE['preparation.nom_trop_long'];
  protected readonly nom = new FormControl(nomPreparation(this.carte), { nonNullable: true });
  protected readonly envoiEnCours = signal(false);
  protected readonly erreur = signal<ErreurAffichee | null>(null);

  async enregistrer(): Promise<void> {
    if (this.envoiEnCours()) {
      return;
    }
    const nettoye = nettoyerNomPreparation(this.nom.value);
    // Contrôle sur le nom nettoyé, comme le back : un nom collé avec des espaces en trop n'est pas coupé.
    if (nettoye.length > LONGUEUR_MAX_NOM_PREPARATION) {
      this.nom.setErrors({ [ERREUR_TROP_LONG]: true });
      this.nom.markAsTouched();
      return;
    }
    const nom = nettoye === '' ? null : nettoye;
    // Inchangé : le nom propre, ou le titre de l'Album prérempli d'une Préparation sans nom.
    if (
      nom === (this.carte.nom ?? null) ||
      (this.carte.nom == null && nom === nettoyerNomPreparation(this.carte.titreAlbum))
    ) {
      this.reference.close(undefined);
      return;
    }
    this.envoiEnCours.set(true);
    this.reference.disableClose = true;
    // Un nouvel échec réaffiche son message, même identique au précédent.
    this.erreur.set(null);
    try {
      const renommee = await this.api.invoke(renommerPreparation, {
        id: this.carte.id,
        body: { nom },
      });
      this.reference.close(renommee);
    } catch (erreur) {
      if (introuvable(erreur)) {
        this.reference.close(PREPARATION_INTROUVABLE);
        return;
      }
      this.erreur.set({
        message: messageErreur(erreur),
        reessayer: erreurPassagere(erreur) ? () => void this.enregistrer() : null,
      });
    } finally {
      this.envoiEnCours.set(false);
      this.reference.disableClose = false;
    }
  }
}

/**
 * Dialogue « Dupliquer la préparation » (story 2.10), ouvert par le menu d'une Carte de Préparation de l'accueil : la
 * Section de la copie (PS, MS, GS), la suivante présélectionnée, la même permise (une autre année). « Dupliquer » ou
 * Entrée crée la copie et ferme le dialogue avec sa Carte. Mêmes règles de fermeture et d'échec que « Renommer ».
 */
@Component({
  selector: 'app-dupliquer-preparation',
  imports: [BandeauErreur, MatButtonModule, MatDialogModule, MatRadioModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './gerer-preparation-dialogues.scss',
  template: `
    <h2 mat-dialog-title>Dupliquer la préparation</h2>
    <mat-dialog-content class="gerer-preparation">
      @if (erreur(); as affichee) {
        <app-bandeau-erreur
          [message]="affichee.message"
          [reessayable]="affichee.reessayer !== null"
          (reessayer)="affichee.reessayer?.()"
          (fermer)="erreur.set(null)"
        />
      }
      <p class="gerer-preparation__phrase">
        La copie de « {{ nom }} » reprend ses mots, leurs sens et leurs images ; aucune image n'est
        copiée.
      </p>
      <span id="dupliquer-preparation-section" class="gerer-preparation__etiquette"
        >Section de la copie</span
      >
      <mat-radio-group
        class="gerer-preparation__sections"
        aria-labelledby="dupliquer-preparation-section"
        [value]="section()"
        (change)="section.set($event.value)"
        (keydown.enter)="$event.preventDefault(); dupliquer()"
      >
        @for (choix of sections; track choix) {
          <mat-radio-button [value]="choix">
            <span class="gerer-preparation__section">
              <span class="forme-section forme-section--{{ choix }}" aria-hidden="true"></span>
              {{ libellesSection[choix] }}
            </span>
          </mat-radio-button>
        }
      </mat-radio-group>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button matButton type="button" [mat-dialog-close]="undefined" [disabled]="envoiEnCours()">
        Annuler
      </button>
      <button matButton="filled" type="button" [disabled]="envoiEnCours()" (click)="dupliquer()">
        Dupliquer
      </button>
    </mat-dialog-actions>
  `,
})
export class DupliquerPreparationDialogue {
  private readonly api = inject(Api);
  private readonly reference =
    inject<
      MatDialogRef<DupliquerPreparationDialogue, CartePreparationDto | PreparationIntrouvable>
    >(MatDialogRef);
  private readonly carte = inject<CartePreparationDto>(MAT_DIALOG_DATA);

  protected readonly nom = nomPreparation(this.carte);
  protected readonly sections = SECTIONS;
  protected readonly libellesSection = LIBELLES_SECTION;
  protected readonly section = signal<Section>(sectionSuivante(this.carte.section));
  protected readonly envoiEnCours = signal(false);
  protected readonly erreur = signal<ErreurAffichee | null>(null);

  async dupliquer(): Promise<void> {
    if (this.envoiEnCours()) {
      return;
    }
    this.envoiEnCours.set(true);
    this.reference.disableClose = true;
    this.erreur.set(null);
    try {
      const copie = await this.api.invoke(dupliquerPreparation, {
        id: this.carte.id,
        body: { section: this.section() },
      });
      this.reference.close(copie);
    } catch (erreur) {
      if (introuvable(erreur)) {
        this.reference.close(PREPARATION_INTROUVABLE);
        return;
      }
      this.erreur.set({
        message: messageErreur(erreur),
        reessayer: erreurPassagere(erreur) ? () => void this.dupliquer() : null,
      });
    } finally {
      this.envoiEnCours.set(false);
      this.reference.disableClose = false;
    }
  }
}

/**
 * Ouvre le Dialogue « Renommer la préparation » et rend la Carte renommée, `introuvable` si la Préparation n'existe plus, ou
 * `undefined` s'il est fermé sans changement. Le focus n'est pas rendu par le dialogue : la page le place elle-même.
 */
export async function ouvrirDialogueRenommerPreparation(
  injecteur: Injector,
  carte: CartePreparationDto,
): Promise<CartePreparationDto | PreparationIntrouvable | undefined> {
  const reference = injecteur
    .get(MatDialog)
    .open<
      RenommerPreparationDialogue,
      CartePreparationDto,
      CartePreparationDto | PreparationIntrouvable
    >(RenommerPreparationDialogue, {
      data: carte,
      autoFocus: '.renommer-preparation__saisie',
      restoreFocus: false,
    });
  return firstValueFrom(reference.afterClosed());
}

/**
 * Ouvre le Dialogue « Dupliquer la préparation » et rend la Carte de la copie, `introuvable` si la Préparation n'existe plus,
 * ou `undefined` s'il est fermé sans duplication. Le focus va d'emblée à la Section présélectionnée ; la page le place elle-même à la fermeture.
 */
export async function ouvrirDialogueDupliquerPreparation(
  injecteur: Injector,
  carte: CartePreparationDto,
): Promise<CartePreparationDto | PreparationIntrouvable | undefined> {
  const reference = injecteur
    .get(MatDialog)
    .open<
      DupliquerPreparationDialogue,
      CartePreparationDto,
      CartePreparationDto | PreparationIntrouvable
    >(DupliquerPreparationDialogue, {
      data: carte,
      autoFocus: '.mat-mdc-radio-checked input',
      restoreFocus: false,
    });
  return firstValueFrom(reference.afterClosed());
}
