import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Api } from '../api/api';
import { fichierImage } from '../api/fn/images-resource/fichier-image';
import { ImageBanqueDto } from '../api/models/image-banque-dto';
import { BadgeTypeImage } from '../commun/badge-type-image/badge-type-image';
import { ChargementImage, ImageSecurisee } from '../commun/image-securisee/image-securisee';
import { RepereSection } from '../commun/repere-section/repere-section';

/**
 * Vignette d'Image de la Banque (key-banque.html › `.vg`, story 3.1) : la miniature, chargée par le client généré
 * (`taille=miniature`), puis les Repères de Section, le Badge de type d'image, le Badge d'état « versée » s'il y a lieu
 * et le propriétaire, déjà résolu par la page (« vous », un nom, « ancien compte »). Pas encore cliquable : la Carte
 * d'identité arrive avec la partie 2.
 */
@Component({
  selector: 'app-vignette-banque',
  imports: [BadgeTypeImage, ImageSecurisee, MatIconModule, RepereSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './vignette-banque.scss',
  template: `
    <div class="vignette__photo">
      @if (echec()) {
        <mat-icon class="vignette__repli" svgIcon="image" aria-hidden="true" />
        <span class="cm-visuellement-masque">{{ alternative() }}</span>
      } @else {
        <img
          class="vignette__image"
          [appImageSecurisee]="charger()"
          [alt]="alternative()"
          (echec)="echec.set(true)"
        />
      }
    </div>
    <div class="vignette__meta">
      @for (section of image().sections; track section) {
        <app-repere-section [section]="section" />
      }
      <app-badge-type-image [type]="image().typeImage" />
      @if (image().versee) {
        <span class="vignette__versee">
          <mat-icon class="vignette__versee-icone" svgIcon="coche" aria-hidden="true" />versée
        </span>
      }
    </div>
    @if (proprietaire()) {
      <p class="vignette__proprietaire">
        <span class="cm-visuellement-masque">Propriétaire : </span>{{ proprietaire() }}
      </p>
    }
  `,
})
export class VignetteBanque {
  readonly image = input.required<ImageBanqueDto>();
  /** Nom affiché du propriétaire ; vide tant que l'annuaire n'est pas chargé. */
  readonly proprietaire = input('');

  private readonly api = inject(Api);
  private readonly imageId = computed(() => this.image().id);

  /** Chargement de la miniature, d'identité stable tant que l'Image ne change pas. */
  protected readonly charger = computed<ChargementImage>(() => {
    const id = this.imageId();
    return () => this.api.invoke(fichierImage, { id, taille: 'miniature' });
  });
  /** Vrai si la miniature n'a pas pu être chargée ; revient à faux quand l'Image change. */
  protected readonly echec = linkedSignal({ source: this.imageId, computation: () => false });
  /** Alternative de la miniature : « citrouille, légume ». */
  protected readonly alternative = computed(
    () => `${this.image().forme}, ${this.image().sensLibelle}`,
  );
}
