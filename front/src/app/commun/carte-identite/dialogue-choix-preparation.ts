import { ChangeDetectionStrategy, Component, inject, Injectable, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { Api } from '../../api/api';
import { listerMesPreparations } from '../../api/fn/preparations-resource/lister-mes-preparations';
import { CartePreparationDto } from '../../api/models/carte-preparation-dto';
import { nomPreparation } from '../../preparations/nom-preparation';
import { BandeauErreur } from '../bandeau-erreur/bandeau-erreur';
import { erreurPassagere, messageErreur } from '../erreurs/message-erreur';
import { LIBELLES_SECTION } from '../repere-section/repere-section';
import { Squelette } from '../squelette/squelette';

/** Liste vide du Dialogue de choix. */
export const MESSAGE_AUCUNE_PREPARATION = "Vous n'avez encore aucune préparation.";

/** Nombre de Préparations lues : la plus grande page que le back accepte. */
export const TAILLE_LISTE_PREPARATIONS = 100;

interface EchecLecture {
  readonly message: string;
  readonly reessayable: boolean;
}

/**
 * Dialogue « Utiliser dans une préparation » (story 3.4), ouvert depuis la Carte d'identité de la Banque : les
 * Préparations de l'enseignant (`GET /preparations?taille=100`), la plus récente d'abord, chacune en bouton nommé par
 * son nom affiché, avec son Album et sa Section. Choisir une Préparation ferme le dialogue avec sa Carte ; « Annuler »,
 * Échap ou un clic hors du dialogue le ferment sans choix. Squelette pendant la lecture ; liste vide : « Vous n'avez
 * encore aucune préparation. » ; échec : Bandeau d'erreur, avec « Réessayer » pour une erreur réseau ou serveur.
 */
@Component({
  selector: 'app-dialogue-choix-preparation',
  imports: [BandeauErreur, MatButtonModule, MatDialogModule, Squelette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
      width: var(--cm-largeur-dialogue);
      max-width: 100%;
    }

    .choix-preparation__liste {
      display: flex;
      flex-direction: column;
      gap: var(--cm-espace-1);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .choix-preparation__bouton {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--cm-espace-1);
      width: 100%;
      padding: var(--cm-espace-2) var(--cm-espace-3);
      border: none;
      border-radius: var(--cm-arrondi-sm);
      background: transparent;
      color: var(--mat-sys-on-surface);
      text-align: start;
      cursor: pointer;

      &:hover {
        background: var(--mat-sys-surface-container-high);
      }

      &:focus-visible {
        outline: var(--cm-anneau-focus-epaisseur) solid var(--mat-sys-primary);
        outline-offset: var(--cm-anneau-focus-decalage);
      }
    }

    .choix-preparation__nom {
      font: var(--cm-typo-label);
    }

    .choix-preparation__album {
      font: var(--cm-typo-body-sm);
      color: var(--mat-sys-on-surface-variant);
    }

    .choix-preparation__vide {
      margin: 0;
      font: var(--cm-typo-body);
    }
  `,
  template: `
    <h2 mat-dialog-title>Utiliser dans une préparation</h2>
    <mat-dialog-content>
      @if (echec(); as affiche) {
        <app-bandeau-erreur
          [message]="affiche.message"
          [reessayable]="affiche.reessayable"
          (reessayer)="lire()"
          (fermer)="echec.set(null)"
        />
      } @else if (preparations(); as liste) {
        @if (liste.length === 0) {
          <p class="choix-preparation__vide">{{ messageAucune }}</p>
        } @else {
          <ul class="choix-preparation__liste" aria-label="Mes préparations">
            @for (preparation of liste; track preparation.id) {
              <li>
                <button
                  class="choix-preparation__bouton"
                  type="button"
                  (click)="choisir(preparation)"
                >
                  <span class="choix-preparation__nom">{{ nom(preparation) }}</span
                  ><span class="cm-visuellement-masque">, </span>
                  <span class="choix-preparation__album"
                    ><cite>{{ preparation.titreAlbum }}</cite> ·
                    {{ libellesSection[preparation.section] }}</span
                  >
                </button>
              </li>
            }
          </ul>
        }
      } @else {
        <app-squelette forme="texte" [nombre]="4" />
      }
    </mat-dialog-content>
    <mat-dialog-actions>
      <button
        matButton
        class="choix-preparation__annuler"
        type="button"
        [mat-dialog-close]="undefined"
      >
        Annuler
      </button>
    </mat-dialog-actions>
  `,
})
export class DialogueChoixPreparationContenu {
  private readonly api = inject(Api);
  private readonly reference =
    inject<MatDialogRef<DialogueChoixPreparationContenu, CartePreparationDto>>(MatDialogRef);

  protected readonly messageAucune = MESSAGE_AUCUNE_PREPARATION;
  protected readonly libellesSection = LIBELLES_SECTION;
  protected readonly nom = nomPreparation;

  /** Préparations lues, la plus récente d'abord ; `null` pendant la lecture. */
  protected readonly preparations = signal<readonly CartePreparationDto[] | null>(null);
  protected readonly echec = signal<EchecLecture | null>(null);

  constructor() {
    void this.lire();
  }

  protected async lire(): Promise<void> {
    this.echec.set(null);
    this.preparations.set(null);
    try {
      const page = await this.api.invoke(listerMesPreparations, {
        taille: TAILLE_LISTE_PREPARATIONS,
      });
      this.preparations.set(page.elements);
    } catch (erreur) {
      this.echec.set({ message: messageErreur(erreur), reessayable: erreurPassagere(erreur) });
    }
  }

  protected choisir(preparation: CartePreparationDto): void {
    this.reference.close(preparation);
  }
}

/** Ouvre le Dialogue de choix d'une Préparation ; rend la Préparation choisie, `undefined` sans choix. */
@Injectable({ providedIn: 'root' })
export class DialogueChoixPreparation {
  private readonly dialogue = inject(MatDialog);

  async choisir(): Promise<CartePreparationDto | undefined> {
    const reference = this.dialogue.open<
      DialogueChoixPreparationContenu,
      void,
      CartePreparationDto
    >(DialogueChoixPreparationContenu, { restoreFocus: true });
    return firstValueFrom(reference.afterClosed());
  }
}
