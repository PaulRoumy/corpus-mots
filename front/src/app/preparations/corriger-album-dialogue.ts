import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { firstValueFrom } from 'rxjs';
import { Api } from '../api/api';
import { corrigerAlbum } from '../api/fn/albums-resource/corriger-album';
import { AlbumDto } from '../api/models/album-dto';
import { BandeauErreur } from '../commun/bandeau-erreur/bandeau-erreur';
import { codeErreur, messageErreur } from '../commun/erreurs/message-erreur';

interface ErreurAffichee {
  readonly message: string;
  readonly reessayer: () => void;
}

/**
 * Longueur maximale du titre, de l'auteur et de l'éditeur (le back applique la même). Non importée du Dialogue
 * « Nouvelle préparation », chargé à la demande, pour ne pas l'embarquer avec la page de la Préparation.
 */
const LONGUEUR_MAX_CHAMP_ALBUM = 200;

/**
 * Doublon (`409 album.deja_existant`) : le message général renvoie aux titres proches du Dialogue « Nouvelle
 * préparation », absents ici.
 */
export const MESSAGE_ALBUM_DEJA_EXISTANT = 'Un autre album porte déjà ce titre et cet auteur.';

/** Erreur posée sur un champ par la réponse du back, effacée dès que sa valeur change. */
const ERREUR_SERVEUR = 'serveur';

/**
 * Dialogue « Corriger l'album » (story 2.2, partie 4), ouvert depuis le menu « Actions de l'album » de l'En-tête de
 * Préparation : Titre, Auteur et Éditeur (facultatif), préremplis avec l'Album. « Enregistrer » envoie la correction et
 * ferme le dialogue avec l'Album renvoyé ; « Annuler », Échap ou un clic hors du dialogue le ferment sans rien envoyer.
 * Pendant l'envoi, le dialogue ne se ferme pas. En échec, il reste ouvert avec la saisie : le message d'un champ
 * invalide s'affiche sous ce champ, tout autre message dans un Bandeau d'erreur.
 */
@Component({
  selector: 'app-corriger-album',
  imports: [
    BandeauErreur,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './corriger-album-dialogue.scss',
  template: `
    <h2 mat-dialog-title>Corriger l'album</h2>
    <mat-dialog-content class="corriger-album">
      @if (erreur(); as affichee) {
        <app-bandeau-erreur
          [message]="affichee.message"
          (reessayer)="affichee.reessayer()"
          (fermer)="erreur.set(null)"
        />
      }
      <p class="corriger-album__phrase">
        La correction se voit aussitôt dans la recherche et dans les préparations de toute l'école.
      </p>
      <mat-form-field class="corriger-album__champ">
        <mat-label>Titre</mat-label>
        <input
          matInput
          type="text"
          autocomplete="off"
          [maxlength]="longueurMax"
          [formControl]="titre"
        />
        @if (titre.hasError(erreurServeur)) {
          <mat-error>{{ titre.getError(erreurServeur) }}</mat-error>
        }
      </mat-form-field>
      <mat-form-field class="corriger-album__champ">
        <mat-label>Auteur</mat-label>
        <input
          matInput
          type="text"
          autocomplete="off"
          [maxlength]="longueurMax"
          [formControl]="auteur"
        />
        @if (auteur.hasError(erreurServeur)) {
          <mat-error>{{ auteur.getError(erreurServeur) }}</mat-error>
        }
      </mat-form-field>
      <mat-form-field class="corriger-album__champ">
        <mat-label>Éditeur (facultatif)</mat-label>
        <input
          matInput
          type="text"
          autocomplete="off"
          [maxlength]="longueurMax"
          [formControl]="editeur"
        />
        @if (editeur.hasError(erreurServeur)) {
          <mat-error>{{ editeur.getError(erreurServeur) }}</mat-error>
        }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button matButton type="button" [mat-dialog-close]="undefined" [disabled]="envoiEnCours()">
        Annuler
      </button>
      <button
        matButton="filled"
        type="button"
        [disabled]="!complet() || envoiEnCours()"
        (click)="enregistrer()"
      >
        Enregistrer
      </button>
    </mat-dialog-actions>
  `,
})
export class CorrigerAlbumDialogue {
  private readonly api = inject(Api);
  private readonly reference = inject<MatDialogRef<CorrigerAlbumDialogue, AlbumDto>>(MatDialogRef);
  private readonly album = inject<AlbumDto>(MAT_DIALOG_DATA);

  protected readonly longueurMax = LONGUEUR_MAX_CHAMP_ALBUM;
  protected readonly erreurServeur = ERREUR_SERVEUR;

  protected readonly titre = new FormControl(this.album.titre, { nonNullable: true });
  protected readonly auteur = new FormControl(this.album.auteur, { nonNullable: true });
  protected readonly editeur = new FormControl(this.album.editeur ?? '', { nonNullable: true });

  private readonly titreSaisi = toSignal(this.titre.valueChanges, {
    initialValue: this.titre.value,
  });
  private readonly auteurSaisi = toSignal(this.auteur.valueChanges, {
    initialValue: this.auteur.value,
  });
  /** Titre et auteur non vides : « Enregistrer » s'active (le back revérifie). */
  protected readonly complet = computed(
    () => this.titreSaisi().trim() !== '' && this.auteurSaisi().trim() !== '',
  );

  protected readonly envoiEnCours = signal(false);
  /** Échec qui ne porte pas sur un champ : Bandeau d'erreur en tête du dialogue. */
  protected readonly erreur = signal<ErreurAffichee | null>(null);

  /** Envoie la correction et ferme avec l'Album renvoyé ; en échec, le dialogue reste ouvert avec la saisie. */
  async enregistrer(): Promise<void> {
    if (!this.complet() || this.envoiEnCours()) {
      return;
    }
    const editeur = this.editeur.value.trim();
    this.envoiEnCours.set(true);
    this.reference.disableClose = true;
    // Un nouvel échec réaffiche son message, même identique au précédent.
    this.erreur.set(null);
    try {
      const corrige = await this.api.invoke(corrigerAlbum, {
        id: this.album.id,
        body: {
          titre: this.titre.value.trim(),
          auteur: this.auteur.value.trim(),
          editeur: editeur === '' ? undefined : editeur,
        },
      });
      this.reference.disableClose = false;
      this.reference.close(corrige);
    } catch (erreur) {
      this.reference.disableClose = false;
      this.afficherEchec(erreur);
    } finally {
      this.envoiEnCours.set(false);
    }
  }

  private afficherEchec(erreur: unknown): void {
    const code = codeErreur(erreur);
    const message =
      code === 'album.deja_existant' ? MESSAGE_ALBUM_DEJA_EXISTANT : messageErreur(erreur);
    const champ =
      code === 'album.titre_invalide'
        ? this.titre
        : code === 'album.auteur_invalide'
          ? this.auteur
          : code === 'album.editeur_invalide'
            ? this.editeur
            : null;
    if (champ !== null) {
      champ.setErrors({ [ERREUR_SERVEUR]: message });
      champ.markAsTouched();
      return;
    }
    // Un doublon ou un refus échouerait à l'identique : « Réessayer » efface seulement le message.
    const refus =
      code === 'album.deja_existant' ||
      code === 'album.reserve_au_createur' ||
      code === 'ressource.introuvable';
    this.erreur.set({
      message,
      reessayer: () => (refus ? this.erreur.set(null) : void this.enregistrer()),
    });
  }
}

/**
 * Ouvre le dialogue pour `album` et rend l'Album corrigé, ou `undefined` s'il est fermé sans correction. Le focus
 * revient à `declencheur` à la fermeture : l'élément de menu qui l'a ouvert n'existe plus.
 */
export async function ouvrirDialogueCorrigerAlbum(
  injecteur: Injector,
  album: AlbumDto,
  declencheur?: HTMLElement,
): Promise<AlbumDto | undefined> {
  const reference = injecteur
    .get(MatDialog)
    .open<CorrigerAlbumDialogue, AlbumDto, AlbumDto>(CorrigerAlbumDialogue, {
      data: album,
      // Focus d'emblée sur le Titre, premier champ.
      autoFocus: '.corriger-album__champ input',
      restoreFocus: declencheur ?? true,
    });
  return firstValueFrom(reference.afterClosed());
}
