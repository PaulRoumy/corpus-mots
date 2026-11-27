import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { Api } from '../../api/api';
import { utiliserImagePreparation } from '../../api/fn/preparations-resource/utiliser-image-preparation';
import { nomPreparation } from '../../preparations/nom-preparation';
import { BandeauErreur } from '../bandeau-erreur/bandeau-erreur';
import { DialogueConfirmation } from '../dialogue-confirmation/dialogue-confirmation';
import { CODES_IMAGE_INDISPONIBLE } from '../erreurs/codes-image-indisponible';
import { codeErreur, messageErreur } from '../erreurs/message-erreur';
import { DialogueChoixPreparation } from './dialogue-choix-preparation';

/** Libellé du bouton de la Carte d'identité de la Banque. */
export const LIBELLE_UTILISER = 'Utiliser dans une préparation';

/** Refus du back quand le Mot de l'Image a déjà une autre Image dans la Préparation. */
const CODE_MOT_DEJA_ILLUSTRE = 'preparation.mot_deja_illustre';

/** Image devenue indisponible (plus versée, supprimée) entre l'ouverture de la Carte et le geste. */
export const MESSAGE_IMAGE_INDISPONIBLE =
  "Cette image n'est plus disponible : elle n'a pas été ajoutée à la préparation.";

/** Message d'un échec de l'envoi : celui d'une Image indisponible, sinon le message traduit du code. */
export function messageEchecUtilisation(erreur: unknown): string {
  const code = codeErreur(erreur);
  return code !== null && CODES_IMAGE_INDISPONIBLE.has(code)
    ? MESSAGE_IMAGE_INDISPONIBLE
    : messageErreur(erreur);
}

/** « Image ajoutée à « Roule galette ». » */
export function messageImageAjoutee(nom: string): string {
  return `Image ajoutée à « ${nom} ».`;
}

/** Dialogue de confirmation avant de remplacer l'Image du Mot `forme` dans la Préparation `nom`. */
export function confirmationRemplacement(forme: string, nom: string) {
  return {
    titre: `Remplacer l'image de « ${forme} » dans « ${nom} » ?`,
    phrase:
      "L'image actuelle est seulement retirée de cette préparation : elle n'est pas modifiée.",
    libelleConfirmer: 'Remplacer',
  } as const;
}

/** Préparation où l'Image vient d'être ajoutée. */
interface Ajout {
  readonly preparationId: string;
  readonly nom: string;
}

/**
 * Section « Utiliser dans une préparation » de la Carte d'identité, dans la Banque seulement (story 3.4) : pour toute
 * Image visible, la mienne ou celle, versée, d'une collègue. Le bouton ouvre le Dialogue de choix de la Préparation ;
 * la Préparation choisie, l'Image est envoyée (`POST /preparations/{id}/utilisations`) : le back y lie l'Image au Mot
 * qu'elle illustre, ajouté au besoin. Si ce Mot a déjà une autre Image (`409 preparation.mot_deja_illustre`), le
 * Dialogue de confirmation demande « Remplacer l'image de « renard » dans « Roule galette » ? » ; « Remplacer »
 * renvoie la requête avec `remplacer: true`, « Annuler » ne change rien. Après l'ajout, l'enseignante reste dans la
 * Banque : « Image ajoutée à « Roule galette ». » s'affiche, suivi du lien « Ouvrir la préparation », et le message est
 * annoncé aux lecteurs d'écran. Tout autre échec s'affiche dans un Bandeau d'erreur (Image devenue indisponible :
 * message propre à la Banque). Changer d'Image efface message et
 * erreur ; la réponse d'une Image quittée n'affiche rien.
 */
@Component({
  selector: 'app-utiliser-dans-preparation',
  imports: [BandeauErreur, MatButtonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--cm-espace-2);
      margin: var(--cm-espace-2) var(--cm-espace-4) 0;
      padding-top: var(--cm-espace-3);
      border-top: var(--cm-epaisseur-separateur) solid var(--mat-sys-outline-variant);
    }

    .utiliser__message {
      margin: 0;
      font: var(--cm-typo-body-sm);
      color: var(--mat-sys-on-surface);
    }

    .utiliser__lien {
      color: var(--mat-sys-primary);

      &:focus-visible {
        outline: var(--cm-anneau-focus-epaisseur) solid var(--mat-sys-primary);
        outline-offset: var(--cm-anneau-focus-decalage);
      }
    }
  `,
  template: `
    <button
      matButton="tonal"
      class="utiliser__bouton"
      type="button"
      disabledInteractive
      [disabled]="enCours()"
      (click)="utiliser()"
    >
      {{ libelle }}
    </button>
    @if (ajout(); as affiche) {
      <p class="utiliser__message">
        {{ message(affiche.nom) }}
        <a class="utiliser__lien" [routerLink]="['/preparations', affiche.preparationId]"
          >Ouvrir la préparation</a
        >
      </p>
    }
    @if (erreur(); as texte) {
      <app-bandeau-erreur
        class="utiliser__erreur"
        [message]="texte"
        [reessayable]="false"
        (fermer)="erreur.set(null)"
      />
    }
  `,
})
export class UtiliserDansPreparation {
  /** Image de la Carte affichée. */
  readonly imageId = input.required<string>();
  /** Forme du Mot de l'Image, pour le Dialogue de remplacement. */
  readonly forme = input.required<string>();

  private readonly api = inject(Api);
  private readonly choix = inject(DialogueChoixPreparation);
  private readonly confirmation = inject(DialogueConfirmation);
  private readonly annonceur = inject(LiveAnnouncer);

  protected readonly libelle = LIBELLE_UTILISER;
  protected readonly message = messageImageAjoutee;

  /** Vrai du choix de la Préparation à la réponse : un second clic est sans effet. */
  protected readonly enCours = signal(false);
  /** Dernier ajout réussi pour l'Image affichée ; effacé au changement d'Image. */
  protected readonly ajout = linkedSignal<string, Ajout | null>({
    source: this.imageId,
    computation: () => null,
  });
  protected readonly erreur = linkedSignal<string, string | null>({
    source: this.imageId,
    computation: () => null,
  });

  protected async utiliser(): Promise<void> {
    if (this.enCours()) {
      return;
    }
    const imageId = this.imageId();
    const forme = this.forme();
    this.enCours.set(true);
    try {
      const preparation = await this.choix.choisir();
      if (preparation === undefined || imageId !== this.imageId()) {
        return;
      }
      const nom = nomPreparation(preparation);
      this.ajout.set(null);
      this.erreur.set(null);
      if (await this.envoyer(preparation.id, imageId, forme, nom)) {
        if (imageId === this.imageId()) {
          this.ajout.set({ preparationId: preparation.id, nom });
          void this.annonceur.announce(messageImageAjoutee(nom), 'polite');
        }
      }
    } catch (erreur) {
      if (imageId === this.imageId()) {
        this.erreur.set(messageEchecUtilisation(erreur));
      }
    } finally {
      this.enCours.set(false);
    }
  }

  /**
   * Envoie l'Image ; si le Mot est déjà illustré, demande confirmation puis renvoie avec `remplacer: true`. Rend
   * `false` si l'enseignante renonce au remplacement.
   */
  private async envoyer(id: string, imageId: string, forme: string, nom: string): Promise<boolean> {
    try {
      await this.api.invoke(utiliserImagePreparation, { id, body: { imageId } });
      return true;
    } catch (erreur) {
      if (codeErreur(erreur) !== CODE_MOT_DEJA_ILLUSTRE) {
        throw erreur;
      }
    }
    if (!(await this.confirmation.confirmer(confirmationRemplacement(forme, nom)))) {
      return false;
    }
    await this.api.invoke(utiliserImagePreparation, { id, body: { imageId, remplacer: true } });
    return true;
  }
}
