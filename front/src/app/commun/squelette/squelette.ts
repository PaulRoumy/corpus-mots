import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Forme des blocs : carte (grille de cartes), ligne (liste), texte (paragraphe), vignette (rangée de vignettes). */
export type FormeSquelette = 'carte' | 'ligne' | 'texte' | 'vignette';

/**
 * Squelettes de chargement (UX-DR-22) : blocs `surface-container-high` arrondis, à la forme du contenu attendu,
 * pulsation coupée sous `prefers-reduced-motion`. Les blocs sont masqués aux lecteurs d'écran ; le conteneur
 * (`role="status"`) annonce « Chargement ».
 */
@Component({
  selector: 'app-squelette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './squelette.scss',
  template: `
    <div class="squelette" [class]="'squelette--' + forme()" role="status">
      <span class="cm-visuellement-masque">Chargement</span>
      @for (bloc of blocs(); track bloc) {
        <span class="squelette__bloc" aria-hidden="true"></span>
      }
    </div>
  `,
})
export class Squelette {
  readonly forme = input<FormeSquelette>('ligne');
  readonly nombre = input(3);

  protected readonly blocs = computed(() =>
    Array.from({ length: Math.max(0, Math.floor(this.nombre())) }, (_, index) => index),
  );
}
