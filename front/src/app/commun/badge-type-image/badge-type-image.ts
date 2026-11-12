import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PreparationImageDto } from '../../api/models/preparation-image-dto';
import { Icone } from '../icones';

/** Type d'une Image, même valeur en base, dans l'API et dans le front (énumération du client généré). */
export type TypeImage = PreparationImageDto['typeImage'];

/** Types d'image, dans l'ordre du Glossaire. */
export const TYPES_IMAGE: readonly TypeImage[] = [
  'image_libre',
  'photo_personnelle',
  'image_album',
  'inconnu',
];

/** Libellé affiché d'un type d'image. */
export const LIBELLES_TYPE_IMAGE: Readonly<Record<TypeImage, string>> = {
  image_libre: 'image libre',
  photo_personnelle: 'photo personnelle',
  image_album: "image d'album",
  inconnu: 'inconnu',
};

const ICONES_TYPE_IMAGE: Readonly<Record<TypeImage, Icone>> = {
  image_libre: 'globe',
  photo_personnelle: 'appareil-photo',
  image_album: 'livre',
  inconnu: 'interrogation',
};

/**
 * Badge de type d'image (DESIGN.md › Types d'image, UX-DR-9) : badge de 22 px, icône de 14 px et libellé à l'encre sur
 * fond carte, bordure au style et à la couleur du type : globe et bordure pleine (image libre), appareil photo et
 * bordure double (photo personnelle), livre ouvert et tirets (image d'album), point d'interrogation et pointillés
 * (inconnu). Le type n'est jamais porté par la couleur seule : icône, bordure et libellé le disent aussi ; un lecteur
 * d'écran lit « Type : image libre ».
 */
@Component({
  selector: 'app-badge-type-image',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './badge-type-image.scss',
  template: `
    <span class="badge-type" [class]="'badge-type--' + type()">
      <mat-icon class="badge-type__icone" [svgIcon]="icone()" aria-hidden="true" />
      <span class="cm-visuellement-masque">Type : </span>{{ libelle() }}
    </span>
  `,
})
export class BadgeTypeImage {
  readonly type = input.required<TypeImage>();

  protected readonly libelle = computed(() => LIBELLES_TYPE_IMAGE[this.type()]);
  protected readonly icone = computed(() => ICONES_TYPE_IMAGE[this.type()]);
}
