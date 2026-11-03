import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

/**
 * Pictogrammes de l'interface, repris de la maquette fidèle de l'accueil (`.working/key-accueil.html`) : SVG au
 * trait, sans police d'icônes ni ressource externe. Le trait suit la couleur du texte (`currentColor`).
 */
const TRACES = {
  preparation:
    '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M8.5 10h7M8.5 14h7M8.5 18h4"/>',
  banque: '<path d="M3 10 12 4l9 6"/><path d="M5 10v9h14v-9"/><path d="M10 19v-5h4v5"/>',
  fiche:
    '<rect x="4" y="3" width="16" height="18" rx="2"/><rect x="7" y="6" width="4" height="4" rx="1"/>' +
    '<rect x="13" y="6" width="4" height="4" rx="1"/><path d="M7 14h10M7 17h6"/>',
  recherche: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  cloche: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  image:
    '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/>' +
    '<path d="m4 18 5.5-5 4 3.5 2.5-2 4.5 4"/>',
  importer: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4 15v4h16v-4"/>',
} as const satisfies Record<string, string>;

/** Nom des pictogrammes enregistrés, pour `<mat-icon svgIcon="…">`. */
export type Icone = keyof typeof TRACES;

function svg(trace: string): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">${trace}</svg>`
  );
}

/** Enregistre les pictogrammes dans `MatIconRegistry` au démarrage de l'application. */
export function provideIcones(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      const registre = inject(MatIconRegistry);
      const assainisseur = inject(DomSanitizer);
      for (const [nom, trace] of Object.entries(TRACES)) {
        registre.addSvgIconLiteral(nom, assainisseur.bypassSecurityTrustHtml(svg(trace)));
      }
    }),
  ]);
}
