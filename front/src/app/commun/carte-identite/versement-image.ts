import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { CarteIdentiteImageDto } from '../../api/models/carte-identite-image-dto';
import {
  LIBELLE_VERSEMENT_EN_COURS,
  LIBELLE_VERSER,
  MESSAGE_VERSEMENT,
  phraseVersementIndisponible,
  Versabilite,
} from '../versement/raisons-versement';

let compteur = 0;

/**
 * Section « Verser » de la Carte d'identité du propriétaire (story 3.3, partie 2 ; key-banque.html › `.cid .foot`).
 * Avec `versabilite = "versable"`, bouton tonal « Verser dans la banque de l'école », qui émet `verser`. Avec un code
 * de refus, le bouton reste visible mais indisponible (`aria-disabled`, toujours focusable), suivi de la raison
 * exacte, liée par `aria-describedby` : « Verser indisponible : source à préciser. ». Pendant l'envoi, le bouton est
 * indisponible et indique « Versement… ». Après un versement réussi (`versee`), le bouton laisse place au message de
 * partage, que la Carte focalise par `focusMessage()` : le focus le fait lire, sans région vive qui l'annoncerait une
 * seconde fois.
 */
@Component({
  selector: 'app-versement-image',
  imports: [MatButtonModule],
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

    .versement__raison {
      margin: 0;
      font: var(--cm-typo-body-sm);
      color: var(--mat-sys-on-surface-variant);
    }

    .versement__message {
      margin: 0;
      font: var(--cm-typo-body-sm);
      color: var(--mat-sys-on-surface);

      &:focus-visible {
        outline: var(--cm-anneau-focus-epaisseur) solid var(--mat-sys-primary);
        outline-offset: var(--cm-anneau-focus-decalage);
      }
    }
  `,
  template: `
    @if (versee()) {
      <p #message class="versement__message" tabindex="-1">{{ messageVersement }}</p>
    } @else if (versabilite() !== null) {
      <button
        matButton="tonal"
        class="versement__bouton"
        type="button"
        disabledInteractive
        [disabled]="indisponible()"
        [attr.aria-describedby]="raison() === null ? null : idRaison"
        (click)="choisir()"
      >
        {{ enCours() ? libelleEnCours : libelleVerser }}
      </button>
      @if (raison(); as phrase) {
        <p class="versement__raison" [id]="idRaison">{{ phrase }}</p>
      }
    }
  `,
})
export class VersementImage {
  /** Versabilité de la Carte affichée ; `null` : rien à verser (le message seul, après un versement). */
  readonly versabilite = input.required<Versabilite | null>();
  /** Licence de la Carte, qui distingue « licence à préciser » de « licence non partageable ». */
  readonly licence = input<CarteIdentiteImageDto['licence']>(null);
  /** Vrai pendant l'envoi du versement. */
  readonly enCours = input(false);
  /** Vrai après un versement réussi de l'Image affichée : le message de partage remplace le bouton. */
  readonly versee = input(false);
  readonly verser = output<void>();

  protected readonly messageVersement = MESSAGE_VERSEMENT;
  protected readonly libelleVerser = LIBELLE_VERSER;
  protected readonly libelleEnCours = LIBELLE_VERSEMENT_EN_COURS;
  protected readonly idRaison = `versement-image-raison-${++compteur}`;

  private readonly message = viewChild<ElementRef<HTMLElement>>('message');

  /** Phrase « Verser indisponible : … . » d'un refus, `null` pour une Image versable. */
  protected readonly raison = computed(() => {
    const versabilite = this.versabilite();
    return versabilite === null || versabilite === 'versable'
      ? null
      : phraseVersementIndisponible(versabilite, this.licence());
  });

  protected readonly indisponible = computed(
    () => this.versabilite() !== 'versable' || this.enCours(),
  );

  /** Donne le focus au message de partage, s'il est affiché. */
  focusMessage(): void {
    this.message()?.nativeElement.focus();
  }

  /** Le bouton indisponible reste focusable et cliquable : son clic n'émet rien. */
  protected choisir(): void {
    if (!this.indisponible()) {
      this.verser.emit();
    }
  }
}
