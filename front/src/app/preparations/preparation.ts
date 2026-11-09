import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Title } from '@angular/platform-browser';
import { Api } from '../api/api';
import { lirePreparation } from '../api/fn/preparations-resource/lire-preparation';
import { PreparationDto } from '../api/models/preparation-dto';
import { BandeauErreur } from '../commun/bandeau-erreur/bandeau-erreur';
import { messageErreur } from '../commun/erreurs/message-erreur';
import { RepereSection } from '../commun/repere-section/repere-section';
import { Squelette } from '../commun/squelette/squelette';
import { libelleMots } from './preparations';

/** « 0 déjà illustrés », « 1 déjà illustré ». */
export function libelleIllustres(nombre: number): string {
  return `${nombre} déjà illustré${nombre === 1 ? '' : 's'}`;
}

/**
 * Page d'une Préparation (`/preparations/:id`), réduite pour l'instant à son En-tête (key-preparation.html › `.hero`) :
 * titre de l'Album, Repère de Section, Module et Thème par défaut s'ils sont choisis, « N mots, M déjà illustrés ».
 * La Préparation d'un collègue est introuvable pour le back : son message traduit s'affiche dans le Bandeau d'erreur.
 * L'édition de l'En-tête arrive avec la story 2.2, la saisie des Mots avec la story 2.3.
 */
@Component({
  selector: 'app-preparation',
  imports: [BandeauErreur, MatIconModule, RepereSection, Squelette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../commun/page-rubrique.scss', './preparation.scss'],
  template: `
    <div class="page">
      @if (erreur(); as message) {
        <h1 class="cm-visuellement-masque">Préparation</h1>
        <app-bandeau-erreur
          [message]="message"
          (reessayer)="charger(id())"
          (fermer)="erreur.set(null)"
        />
      }

      @if (preparation(); as courante) {
        <section class="entete" aria-labelledby="entete-titre">
          <span class="entete__couverture" aria-hidden="true">
            <mat-icon svgIcon="livre" />
          </span>
          <div class="entete__corps">
            <p class="entete__rubrique">Préparation</p>
            <h1 id="entete-titre" class="entete__titre">{{ courante.titreAlbum }}</h1>
            <div class="entete__meta">
              <app-repere-section [section]="courante.section" />
              @if (courante.nomModule) {
                <span class="entete__module">{{ courante.nomModule }}</span>
              }
              @if (courante.nomThemeDefaut) {
                <span class="entete__theme"
                  ><span class="cm-visuellement-masque">Thème par défaut : </span
                  >{{ courante.nomThemeDefaut }}</span
                >
              }
            </div>
            <p class="entete__compteur">
              <strong>{{ libelleMots(courante.nombreMots) }}</strong
              >,
              {{ libelleIllustres(courante.nombreIllustres) }}
            </p>
          </div>
        </section>
      } @else if (chargementEnCours()) {
        <app-squelette forme="texte" [nombre]="3" />
      }
    </div>
  `,
})
export class Preparation {
  private readonly api = inject(Api);
  private readonly titre = inject(Title);

  /** Identifiant de la Préparation, lu dans l'URL (`withComponentInputBinding`). */
  readonly id = input.required<string>();

  protected readonly libelleMots = libelleMots;
  protected readonly libelleIllustres = libelleIllustres;

  protected readonly preparation = signal<PreparationDto | null>(null);
  protected readonly chargementEnCours = signal(false);
  protected readonly erreur = signal<string | null>(null);

  /** Numéro du dernier chargement : la réponse d'une Préparation quittée depuis n'écrit rien. */
  private dernierChargement = 0;

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => void this.charger(id));
    });
  }

  async charger(id: string): Promise<void> {
    const numero = ++this.dernierChargement;
    this.chargementEnCours.set(true);
    this.preparation.set(null);
    try {
      const preparation = await this.api.invoke(lirePreparation, { id });
      if (numero === this.dernierChargement) {
        this.preparation.set(preparation);
        this.erreur.set(null);
        this.titre.setTitle(`${preparation.titreAlbum} · corpus-mots`);
      }
    } catch (erreur) {
      if (numero === this.dernierChargement) {
        this.erreur.set(messageErreur(erreur));
      }
    } finally {
      if (numero === this.dernierChargement) {
        this.chargementEnCours.set(false);
      }
    }
  }
}
