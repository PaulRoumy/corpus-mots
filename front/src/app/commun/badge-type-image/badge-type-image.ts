import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Icone } from '../icones';
import { LIBELLES_TYPE_IMAGE, TypeImage } from '../libelles-images';

export type { TypeImage } from '../libelles-images';

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
