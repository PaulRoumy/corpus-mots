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
import { MatIconModule } from '@angular/material/icon';
import { MotPreparationDto } from '../api/models/mot-preparation-dto';

/**
 * Carte de Mot de la Grille d'une Préparation (story 2.3). Tant que le Mot n'a pas d'Image (toujours le cas avant la
 * story 2.4), c'est une Carte « à illustrer » (key-preparation.html › `.todo`) : fond et bordure tirets « à illustrer »,
 * vignette vide avec « + », Mot en cursive, badge crayon « à illustrer ».
 *
 * Le bouton icône « Retirer « forme » de la préparation » (croix), toujours visible, émet `retirer` : le retrait se
 * fait sans confirmation et s'annule par le Bandeau « Annuler » (story 2.3, partie 2).
 *
 * Le Thème du Mot (story 2.3, partie 3) s'affiche en bouton texte (« cuisine », ou « Sans thème »), tronqué par une
 * ellipse ; son nom accessible porte le nom complet (« Thème de « citrouille » : cuisine »). Il émet `changerTheme` :
 * la page ouvre le Dialogue du Thème. Tant que les Thèmes de l'école ne sont pas chargés (`theme` indéfini), il n'est
 * pas affiché.
 */
@Component({
  selector: 'app-carte-mot',
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './carte-mot.scss',
  host: { '[class.carte-mot--a-illustrer]': '!mot().illustre' },
  template: `
    <button
      #boutonRetirer
      matIconButton
      class="carte-mot__retirer"
      type="button"
      [attr.aria-label]="'Retirer « ' + mot().forme + ' » de la préparation'"
      (click)="retirer.emit()"
    >
      <mat-icon svgIcon="fermer" aria-hidden="true" />
    </button>
    <span class="carte-mot__vignette" aria-hidden="true"><mat-icon svgIcon="plus" /></span>
    <span class="carte-mot__mot">{{ mot().forme }}</span>
    @if (!mot().illustre) {
      <span class="carte-mot__etat">
        <mat-icon svgIcon="crayon" aria-hidden="true" />
        à illustrer
      </span>
    }
    @if (theme() !== undefined) {
      <button
        #boutonTheme
        class="carte-mot__theme"
        type="button"
        [class.carte-mot__theme--vide]="theme() === null"
        [attr.aria-label]="nomAccessibleTheme()"
        (click)="changerTheme.emit()"
      >
        {{ theme() ?? 'Sans thème' }}
      </button>
    }
  `,
})
export class CarteMot {
  readonly mot = input.required<MotPreparationDto>();
  /** Nom du Thème du Mot, `null` sans thème, indéfini tant que les Thèmes ne sont pas chargés. */
  readonly theme = input<string | null | undefined>(undefined);
  readonly retirer = output<void>();
  readonly changerTheme = output<void>();

  protected readonly nomAccessibleTheme = computed(
    () => `Thème de « ${this.mot().forme} » : ${this.theme() ?? 'sans thème'}`,
  );

  private readonly boutonRetirer = viewChild.required('boutonRetirer', {
    read: ElementRef<HTMLButtonElement>,
  });
  private readonly boutonTheme = viewChild('boutonTheme', { read: ElementRef<HTMLButtonElement> });

  /** Donne le focus au bouton « Retirer » : après le retrait d'une Carte voisine, ou le rétablissement de celle-ci. */
  focusRetirer(): void {
    this.boutonRetirer().nativeElement.focus();
  }

  /** Bouton du Thème, auquel le focus revient à la fermeture du Dialogue du Thème. */
  elementTheme(): HTMLButtonElement | undefined {
    return this.boutonTheme()?.nativeElement;
  }
}
