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
  LIBELLE_NE_PLUS_VERSER,
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
 * indisponible et indique « Versement… ». Une Image versée (`versee`) montre le message de partage, que la Carte
 * focalise par `focusMessage()` après un versement (le focus le fait lire, sans région vive qui l'annoncerait une
 * seconde fois), suivi du bouton « Ne plus verser » (story 3.5), qui émet `nePlusVerser` et reste indisponible, mais
 * focusable, pendant l'envoi.
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
      <button
        matButton="outlined"
        class="versement__ne-plus-verser"
        type="button"
        disabledInteractive
        [disabled]="enCours()"
        (click)="choisirNePlusVerser()"
      >
        {{ libelleNePlusVerser }}
      </button>
    } @else if (versabilite() !== null) {
      <button
        #bouton
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
  /** Vrai pendant l'envoi du versement ou de « Ne plus verser ». */
  readonly enCours = input(false);
  /** Vrai pour une Image versée : le message de partage et « Ne plus verser » remplacent « Verser ». */
  readonly versee = input(false);
  readonly verser = output<void>();
  readonly nePlusVerser = output<void>();

  protected readonly messageVersement = MESSAGE_VERSEMENT;
  protected readonly libelleVerser = LIBELLE_VERSER;
  protected readonly libelleEnCours = LIBELLE_VERSEMENT_EN_COURS;
  protected readonly libelleNePlusVerser = LIBELLE_NE_PLUS_VERSER;
  protected readonly idRaison = `versement-image-raison-${++compteur}`;

  private readonly message = viewChild<ElementRef<HTMLElement>>('message');
  private readonly bouton = viewChild('bouton', { read: ElementRef<HTMLElement> });

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

  /** Donne le focus au bouton « Verser », s'il est affiché. */
  focusBouton(): void {
    this.bouton()?.nativeElement.focus();
  }

  /** Pendant l'envoi, « Ne plus verser » reste focusable et cliquable : son clic n'émet rien. */
  protected choisirNePlusVerser(): void {
    if (!this.enCours()) {
      this.nePlusVerser.emit();
    }
  }

  /** Le bouton indisponible reste focusable et cliquable : son clic n'émet rien. */
  protected choisir(): void {
    if (!this.indisponible()) {
      this.verser.emit();
    }
  }
}
