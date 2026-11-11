import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Api } from '../api/api';
import { pictogrammeArasaac } from '../api/fn/arasaac-resource/pictogramme-arasaac';
import { suggestionsArasaac } from '../api/fn/arasaac-resource/suggestions-arasaac';
import { ChargementImage, ImageSecurisee } from '../commun/image-securisee/image-securisee';
import { messageErreur } from '../commun/erreurs/message-erreur';
import { Squelette } from '../commun/squelette/squelette';

/** Suggestion affichée : pictogramme, alternative de sa vignette et chargement de son fichier par le back. */
interface Suggestion {
  readonly idArasaac: number;
  readonly motCle: string;
  readonly charger: ChargementImage;
}

type Etat =
  | { readonly nom: 'chargement' }
  | { readonly nom: 'suggestions'; readonly suggestions: readonly Suggestion[] }
  | { readonly nom: 'vide' }
  | { readonly nom: 'erreur'; readonly message: string };

/** Message d'une Carte quand ARASAAC ne trouve aucun pictogramme pour son Mot. */
export const MESSAGE_AUCUN_PICTOGRAMME = 'Aucun pictogramme ARASAAC pour ce mot.';

/**
 * Suggestions ARASAAC d'une Carte « à illustrer » (story 2.4, partie 1 ; key-preparation.html › `.todo .r`) : la ligne
 * « Suggestions ARASAAC · simple, claire, peu de détails » (Repère de qualité), un squelette pendant la recherche, puis
 * jusqu'à trois vignettes de 60 px, dont l'alternative est le mot-clé du pictogramme. ARASAAC sans résultat ou
 * indisponible : message court. Recherche et fichiers passent par le back (AD-9), les fichiers en `blob` par
 * `image-securisee` : le navigateur n'appelle jamais ARASAAC. Les suggestions ne sont pas encore cliquables (partie 2).
 */
@Component({
  selector: 'app-suggestions-arasaac',
  imports: [ImageSecurisee, Squelette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './suggestions-arasaac.scss',
  template: `
    <p class="suggestions__repere">Suggestions ARASAAC · simple, claire, peu de détails</p>
    @switch (etat().nom) {
      @case ('chargement') {
        <app-squelette forme="vignette" [nombre]="3" />
      }
      @case ('suggestions') {
        <ul class="suggestions__liste">
          @for (suggestion of suggestions(); track suggestion.idArasaac) {
            <li class="suggestions__vignette">
              @if (echecs().has(suggestion.idArasaac)) {
                <span class="suggestions__repli">{{ suggestion.motCle }}</span>
              } @else {
                <img
                  class="suggestions__pictogramme"
                  [appImageSecurisee]="suggestion.charger"
                  [alt]="suggestion.motCle"
                  (echec)="signalerEchec(suggestion.idArasaac)"
                />
              }
            </li>
          }
        </ul>
      }
      @default {
        <!-- Texte simple, sans région annoncée : avec ARASAAC indisponible, chaque Carte répéterait le message. -->
        <p class="suggestions__message">{{ message() }}</p>
      }
    }
  `,
})
export class SuggestionsArasaac {
  /** Forme du Mot (sans article). */
  readonly mot = input.required<string>();

  private readonly api = inject(Api);

  protected readonly etat = signal<Etat>({ nom: 'chargement' });
  /** Pictogrammes dont le fichier n'a pas pu être chargé : leur mot-clé remplace la vignette. */
  protected readonly echecs = signal<ReadonlySet<number>>(new Set());

  constructor() {
    effect((nettoyer) => {
      const mot = this.mot();
      let abandonne = false;
      nettoyer(() => (abandonne = true));
      untracked(() => {
        this.etat.set({ nom: 'chargement' });
        this.echecs.set(new Set());
      });
      this.api.invoke(suggestionsArasaac, { mot }).then(
        (trouvees) => {
          if (abandonne) {
            return;
          }
          this.etat.set(
            trouvees.length === 0
              ? { nom: 'vide' }
              : {
                  nom: 'suggestions',
                  suggestions: trouvees.map(({ idArasaac, motCle }) => ({
                    idArasaac,
                    motCle,
                    charger: () => this.api.invoke(pictogrammeArasaac, { idArasaac }),
                  })),
                },
          );
        },
        (erreur: unknown) => {
          if (!abandonne) {
            this.etat.set({ nom: 'erreur', message: messageErreur(erreur) });
          }
        },
      );
    });
  }

  protected suggestions(): readonly Suggestion[] {
    const etat = this.etat();
    return etat.nom === 'suggestions' ? etat.suggestions : [];
  }

  protected message(): string {
    const etat = this.etat();
    return etat.nom === 'erreur' ? etat.message : MESSAGE_AUCUN_PICTOGRAMME;
  }

  protected signalerEchec(idArasaac: number): void {
    this.echecs.update((echecs) => new Set(echecs).add(idArasaac));
  }
}
