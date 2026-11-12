import { LiveAnnouncer } from '@angular/cdk/a11y';
import { inject, Injectable, Injector } from '@angular/core';

/** Annonce polie faite après l'ajout d'une Image dans Mes mots. */
export function annonceImageAjoutee(forme: string): string {
  return `Image enregistrée dans Mes mots pour « ${forme} ».`;
}

/**
 * « + › Ajouter une image » (story 2.5, partie 2) : ouvre le Dialogue « Téléverser une image » en mode « Mes mots »
 * puis, si une Image est enregistrée, l'annonce poliment. Aucun écran ne montre encore Mes mots (la Banque arrive avec
 * l'Epic 3). Le dialogue est chargé à la demande, au premier appel. Le focus revient à `declencheur` à la fermeture :
 * un élément de menu, retiré du DOM entre-temps, ne pourrait pas le reprendre.
 */
@Injectable({ providedIn: 'root' })
export class AjouterImage {
  private readonly injecteur = inject(Injector);
  private readonly annonceur = inject(LiveAnnouncer);

  /** Vrai de l'appel à la fermeture : un double clic n'ouvre qu'un dialogue. */
  private ouvertureEnCours = false;

  async ouvrir(declencheur?: HTMLElement): Promise<void> {
    if (this.ouvertureEnCours) {
      return;
    }
    this.ouvertureEnCours = true;
    try {
      const { ouvrirDialogueAjouterImage } = await import('./televerser-image-dialogue');
      const image = await ouvrirDialogueAjouterImage(this.injecteur, declencheur);
      if (image) {
        void this.annonceur.announce(annonceImageAjoutee(image.forme), 'polite');
      }
    } finally {
      this.ouvertureEnCours = false;
    }
  }
}
