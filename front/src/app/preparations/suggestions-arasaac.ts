import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Api } from '../api/api';
import { pictogrammeArasaac } from '../api/fn/arasaac-resource/pictogramme-arasaac';
import { suggestionsArasaac } from '../api/fn/arasaac-resource/suggestions-arasaac';
import { choisirPictogrammeMotPreparation } from '../api/fn/preparations-resource/choisir-pictogramme-mot-preparation';
import { MotPreparationDto } from '../api/models/mot-preparation-dto';
import { ChargementImage, ImageSecurisee } from '../commun/image-securisee/image-securisee';
import { codeErreur, messageErreur } from '../commun/erreurs/message-erreur';
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

/** Échec du choix d'un pictogramme : message court, et « Réessayer » après un échec réseau seulement. */
interface EchecChoix {
  readonly idArasaac: number;
  readonly message: string;
  readonly reessayable: boolean;
}

/**
 * Codes d'un Mot changé ailleurs (autre onglet) : illustré entre-temps, ou retiré (Mot ou Préparation introuvable) ;
 * la page recharge alors la Préparation. Partagés avec le choix d'une Image existante de la Carte « à illustrer ».
 */
export const CODES_A_RECHARGER: ReadonlySet<string> = new Set([
  'preparation.mot_deja_illustre',
  'ressource.introuvable',
]);

/** Message d'une Carte quand ARASAAC ne trouve aucun pictogramme pour son Mot. */
export const MESSAGE_AUCUN_PICTOGRAMME = 'Aucun pictogramme ARASAAC pour ce mot.';

/**
 * Suggestions ARASAAC d'une Carte « à illustrer » (story 2.4, partie 1 ; key-preparation.html › `.todo .r`) : la ligne
 * « Suggestions ARASAAC · simple, claire, peu de détails » (Repère de qualité), un squelette pendant la recherche, puis
 * jusqu'à trois vignettes de 60 px, dont l'alternative est le mot-clé du pictogramme. ARASAAC sans résultat ou
 * indisponible : message court. Recherche et fichiers passent par le back (AD-9), les fichiers en `blob` par
 * `image-securisee` : le navigateur n'appelle jamais ARASAAC.
 *
 * Choisir un pictogramme (story 2.4, partie 2), sur une Carte « à illustrer » seulement (`preparationId` et
 * `motPreparationId` donnés ; dans le Panneau de détection, les vignettes restent inertes) : chaque vignette est un bouton « Illustrer « renard » avec le
 * pictogramme « renard » ». Un clic envoie le seul `idArasaac` au back, qui télécharge le pictogramme, crée l'Image et
 * la lie au Mot ; pendant l'envoi, les trois boutons sont désactivés (`aria-disabled`, le focus reste en place) et le
 * pictogramme choisi porte un indicateur. Le Mot illustré renvoyé sort par `illustre` : la page remplace la Carte.
 * ARASAAC indisponible, pictogramme introuvable ou autre refus : message court sous les suggestions, boutons de nouveau
 * actifs ; échec réseau : même message avec « Réessayer », qui renvoie la même requête. Mot illustré entre-temps
 * (`409 preparation.mot_deja_illustre`) ou retiré (`404 ressource.introuvable`) : sortie `aRecharger` avec le message
 * traduit, la page l'affiche et recharge la Préparation.
 *
 * Pictogramme déjà possédé (story 2.11, partie 3) : une suggestion dont l'identifiant figure dans `idsDejaPossedes`
 * (pictogrammes dont l'enseignant possède déjà l'Image pour ce Mot et son Sens retenu, fournis par la Carte) porte la
 * Marque « déjà utilisée », avec le rendu de `VignetteProposition`, et son nom accessible le dit. Le choix envoie la même
 * requête : c'est le back qui lie l'Image existante (`200`) ou crée l'Image (`201`), et le Mot renvoyé sort par
 * `illustre` dans les deux cas.
 */
@Component({
  selector: 'app-suggestions-arasaac',
  imports: [ImageSecurisee, MatButtonModule, MatIconModule, NgTemplateOutlet, Squelette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './suggestions-arasaac.scss',
  template: `
    <p class="suggestions__repere">Suggestions ARASAAC · simple, claire, peu de détails</p>
    @switch (etat().nom) {
      @case ('chargement') {
        <app-squelette forme="vignette" [nombre]="3" />
      }
      @case ('suggestions') {
        <ul class="suggestions__liste" [attr.aria-busy]="choixEnCours() !== null ? 'true' : null">
          @for (suggestion of suggestions(); track suggestion.idArasaac) {
            @if (choisissable()) {
              <li class="suggestions__element">
                <button
                  class="suggestions__vignette"
                  type="button"
                  [class.suggestions__vignette--choisie]="choixEnCours() === suggestion.idArasaac"
                  [attr.aria-disabled]="choixEnCours() !== null ? 'true' : null"
                  [attr.aria-label]="nomAccessible(suggestion)"
                  [attr.data-id-arasaac]="suggestion.idArasaac"
                  (click)="choisir(suggestion.idArasaac)"
                >
                  <ng-container
                    *ngTemplateOutlet="pictogramme; context: { $implicit: suggestion }"
                  />
                </button>
                @if (idsDejaPossedes().has(suggestion.idArasaac)) {
                  <span class="suggestions__marque" aria-hidden="true">
                    <mat-icon svgIcon="historique" />
                    déjà utilisée
                  </span>
                }
              </li>
            } @else {
              <li class="suggestions__vignette">
                <ng-container *ngTemplateOutlet="pictogramme; context: { $implicit: suggestion }" />
              </li>
            }
          }
        </ul>
        @if (echecChoix(); as echec) {
          <div class="suggestions__echec">
            <p class="suggestions__message" role="alert">{{ echec.message }}</p>
            @if (echec.reessayable) {
              <button
                matButton
                class="suggestions__reessayer"
                type="button"
                (click)="reessayer(echec.idArasaac)"
              >
                Réessayer
              </button>
            }
          </div>
        }
      }
      @default {
        <!-- Texte simple, sans région annoncée : avec ARASAAC indisponible, chaque Carte répéterait le message. -->
        <p class="suggestions__message">{{ message() }}</p>
      }
    }
    <ng-template #pictogramme let-suggestion>
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
    </ng-template>
  `,
})
export class SuggestionsArasaac {
  /** Forme du Mot (sans article). */
  readonly mot = input.required<string>();
  /**
   * Préparation et Mot de Préparation à illustrer : avec les deux, les suggestions sont des boutons (Carte « à
   * illustrer ») ; sans eux (Panneau de détection, Mot pas encore ajouté), de simples vignettes.
   */
  readonly preparationId = input<string | null>(null);
  readonly motPreparationId = input<string | null>(null);
  /**
   * Identifiants ARASAAC des pictogrammes dont l'enseignant possède déjà l'Image pour ce Mot et son Sens retenu :
   * leurs suggestions portent la Marque « déjà utilisée ».
   */
  readonly idsDejaPossedes = input<ReadonlySet<number>>(new Set());
  /** Mot illustré par le pictogramme choisi, renvoyé par le back. */
  readonly illustre = output<MotPreparationDto>();
  /** Mot illustré ou retiré entre-temps (autre onglet), avec le message traduit : la page recharge la Préparation. */
  readonly aRecharger = output<string>();

  private readonly api = inject(Api);
  private readonly hote = inject(ElementRef);

  protected readonly etat = signal<Etat>({ nom: 'chargement' });
  /** Pictogrammes dont le fichier n'a pas pu être chargé : leur mot-clé remplace la vignette. */
  protected readonly echecs = signal<ReadonlySet<number>>(new Set());
  /** Vrai si un clic sur une suggestion peut illustrer le Mot. */
  protected readonly choisissable = computed(
    () => this.preparationId() !== null && this.motPreparationId() !== null,
  );
  /** Pictogramme en cours d'envoi au back, `null` sinon : tous les boutons sont alors désactivés. */
  protected readonly choixEnCours = signal<number | null>(null);
  /** Dernier échec du choix d'un pictogramme, `null` sans échec. */
  protected readonly echecChoix = signal<EchecChoix | null>(null);

  constructor() {
    effect((nettoyer) => {
      const mot = this.mot();
      let abandonne = false;
      nettoyer(() => (abandonne = true));
      untracked(() => {
        this.etat.set({ nom: 'chargement' });
        this.echecs.set(new Set());
        this.echecChoix.set(null);
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

  /** « Illustrer « renard » avec le pictogramme « renard » », suivi de « , déjà utilisée » s'il est déjà possédé. */
  protected nomAccessible(suggestion: Suggestion): string {
    const marque = this.idsDejaPossedes().has(suggestion.idArasaac) ? ', déjà utilisée' : '';
    return `Illustrer « ${this.mot()} » avec le pictogramme « ${suggestion.motCle} »${marque}`;
  }

  /** Illustre le Mot avec le pictogramme `idArasaac` ; sans effet pendant un autre envoi. */
  protected async choisir(idArasaac: number): Promise<void> {
    const preparationId = this.preparationId();
    const motPreparationId = this.motPreparationId();
    if (this.choixEnCours() !== null || preparationId === null || motPreparationId === null) {
      return;
    }
    this.choixEnCours.set(idArasaac);
    this.echecChoix.set(null);
    try {
      const illustre = await this.api.invoke(choisirPictogrammeMotPreparation, {
        id: preparationId,
        motPreparationId,
        body: { idArasaac },
      });
      this.illustre.emit(illustre);
      // Si la Carte reste affichée, ses boutons redeviennent actifs.
      this.choixEnCours.set(null);
    } catch (erreur) {
      this.choixEnCours.set(null);
      const code = codeErreur(erreur);
      if (code !== null && CODES_A_RECHARGER.has(code)) {
        this.aRecharger.emit(messageErreur(erreur));
        return;
      }
      this.echecChoix.set({
        idArasaac,
        message: messageErreur(erreur),
        reessayable: erreur instanceof HttpErrorResponse && erreur.status === 0,
      });
    }
  }

  /**
   * « Réessayer » après un échec réseau : le focus passe au pictogramme choisi (le bouton « Réessayer » va disparaître),
   * puis la même requête repart.
   */
  protected reessayer(idArasaac: number): void {
    (this.hote.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>(`[data-id-arasaac="${idArasaac}"]`)
      ?.focus();
    void this.choisir(idArasaac);
  }

  protected signalerEchec(idArasaac: number): void {
    this.echecs.update((echecs) => new Set(echecs).add(idArasaac));
  }
}
