import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Api } from '../api/api';
import { fichierImage } from '../api/fn/images-resource/fichier-image';
import { MotPreparationDto } from '../api/models/mot-preparation-dto';
import { BadgeTypeImage } from '../commun/badge-type-image/badge-type-image';
import { ChargementImage, ImageSecurisee } from '../commun/image-securisee/image-securisee';
import { SuggestionsArasaac } from './suggestions-arasaac';

/**
 * Carte de Mot de la Grille d'une Préparation (story 2.3). Tant que le Mot n'a pas d'Image, c'est une Carte « à
 * illustrer » (key-preparation.html › `.todo`) : fond et bordure tirets « à illustrer » ; à gauche, vignette vide avec
 * « + », Mot en cursive, badge crayon « à illustrer » ; à droite, les suggestions ARASAAC (story 2.4, partie 1). La page
 * lui fait occuper trois colonnes de la Grille. Sous les suggestions, le bouton texte « Téléverser » émet `televerser` :
 * la page ouvre le Dialogue « Téléverser une image » (story 2.5, partie 1).
 *
 * Une fois illustrée, la Carte occupe une colonne (key-preparation.html › `.wc`) : vignette de la miniature de l'Image,
 * chargée en `blob` par le client généré (`?taille=miniature`, AD-23), d'alternative « Mot, Sens » ; Badge de type
 * d'image ; Mot en cursive. Une miniature qui ne se charge pas laisse voir l'icône d'image.
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
  imports: [BadgeTypeImage, ImageSecurisee, MatButtonModule, MatIconModule, SuggestionsArasaac],
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
    <div class="carte-mot__gauche">
      @if (chargerVignette(); as charger) {
        <span class="carte-mot__image">
          @if (echecVignette()) {
            <mat-icon class="carte-mot__repli" svgIcon="image" aria-hidden="true" />
            <span class="cm-visuellement-masque">{{ alternative() }}</span>
          } @else {
            <img
              class="carte-mot__miniature"
              [appImageSecurisee]="charger"
              [alt]="alternative()"
              (echec)="echecVignette.set(true)"
            />
          }
        </span>
      } @else {
        <span class="carte-mot__vignette" aria-hidden="true"><mat-icon svgIcon="plus" /></span>
      }
      <span class="carte-mot__mot">{{ mot().forme }}</span>
      @if (mot().image; as image) {
        <app-badge-type-image class="carte-mot__type" [type]="image.typeImage" />
      }
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
    </div>
    @if (!mot().illustre) {
      <div class="carte-mot__droite">
        <app-suggestions-arasaac [mot]="mot().forme" />
        <button
          #boutonTeleverser
          matButton
          class="carte-mot__televerser"
          type="button"
          [attr.aria-label]="'Téléverser une image pour « ' + mot().forme + ' »'"
          (click)="televerser.emit()"
        >
          Téléverser
        </button>
      </div>
    }
  `,
})
export class CarteMot {
  readonly mot = input.required<MotPreparationDto>();
  /** Nom du Thème du Mot, `null` sans thème, indéfini tant que les Thèmes ne sont pas chargés. */
  readonly theme = input<string | null | undefined>(undefined);
  readonly retirer = output<void>();
  readonly changerTheme = output<void>();
  readonly televerser = output<void>();

  private readonly api = inject(Api);

  /** Image liée, par son seul identifiant : la vignette ne se recharge que si l'Image change. */
  private readonly imageId = computed(() => this.mot().image?.id ?? null);
  /** Chargement de la miniature, d'identité stable tant que l'Image ne change pas ; `null` sans Image. */
  protected readonly chargerVignette = computed<ChargementImage | null>(() => {
    const id = this.imageId();
    return id === null ? null : () => this.api.invoke(fichierImage, { id, taille: 'miniature' });
  });
  /** Vrai si la miniature n'a pas pu être chargée ; revient à faux quand l'Image change. */
  protected readonly echecVignette = linkedSignal({
    source: this.imageId,
    computation: () => false,
  });
  /** Alternative de la vignette : « citrouille, légume ». */
  protected readonly alternative = computed(
    () => `${this.mot().forme}, ${this.mot().sens.libelle}`,
  );

  protected readonly nomAccessibleTheme = computed(
    () => `Thème de « ${this.mot().forme} » : ${this.theme() ?? 'sans thème'}`,
  );

  private readonly boutonRetirer = viewChild.required('boutonRetirer', {
    read: ElementRef<HTMLButtonElement>,
  });
  private readonly boutonTheme = viewChild('boutonTheme', { read: ElementRef<HTMLButtonElement> });
  private readonly boutonTeleverser = viewChild('boutonTeleverser', {
    read: ElementRef<HTMLButtonElement>,
  });

  /** Donne le focus au bouton « Retirer » : après le retrait d'une Carte voisine, ou le rétablissement de celle-ci. */
  focusRetirer(): void {
    this.boutonRetirer().nativeElement.focus();
  }

  /** Bouton du Thème, auquel le focus revient à la fermeture du Dialogue du Thème. */
  elementTheme(): HTMLButtonElement | undefined {
    return this.boutonTheme()?.nativeElement;
  }

  /** Bouton « Téléverser », auquel le focus revient à la fermeture du Dialogue sans enregistrement. */
  elementTeleverser(): HTMLButtonElement | undefined {
    return this.boutonTeleverser()?.nativeElement;
  }
}
