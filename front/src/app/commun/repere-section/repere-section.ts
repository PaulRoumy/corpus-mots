import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Section de maternelle, même valeur en base, dans l'API et dans le front. */
export type Section = 'ps' | 'ms' | 'gs';

export const SECTIONS: readonly Section[] = ['ps', 'ms', 'gs'];

/** Libellé affiché d'une Section. */
export const LIBELLES_SECTION: Readonly<Record<Section, string>> = {
  ps: 'PS',
  ms: 'MS',
  gs: 'GS',
};

/**
 * Repère de Section (variante « Repères » de DESIGN.md, `.sb` de key-accueil.html) : badge de 22 px bordé de la
 * couleur de la Section, avec sa forme (● PS, ▲ MS, ■ GS) et son libellé. La Section n'est jamais portée par la
 * couleur seule : forme et libellé la disent aussi ; un lecteur d'écran lit « Section MS ». Les formes viennent de
 * `_formes-section.scss`, partagé avec le choix de la Section du Dialogue « Nouvelle préparation ».
 */
@Component({
  selector: 'app-repere-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './repere-section.scss',
  template: `
    <span class="repere" [class]="'repere--' + section()">
      <span class="forme-section" [class]="'forme-section--' + section()" aria-hidden="true"></span>
      <span class="cm-visuellement-masque">Section </span>{{ libelles[section()] }}
    </span>
  `,
})
export class RepereSection {
  readonly section = input.required<Section>();

  protected readonly libelles = LIBELLES_SECTION;
}
