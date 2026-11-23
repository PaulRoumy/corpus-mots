import { LiveAnnouncer } from '@angular/cdk/a11y';
import { inject, Injectable, Injector, signal } from '@angular/core';
import { MesMotsImageDto } from '../api/models/mes-mots-image-dto';

/** Annonce polie faite après l'ajout d'une Image dans Mes mots. */
export function annonceImageAjoutee(forme: string): string {
  return `Image enregistrée dans Mes mots pour « ${forme} ».`;
}

/**
 * « + › Ajouter une image » (story 2.5, partie 2) : ouvre le Dialogue « Téléverser une image » en mode « Mes mots »
 * puis, si une Image est enregistrée, l'annonce poliment, incrémente `imagesAjoutees` (la Banque se recharge alors, quel
 * que soit le bouton qui a ouvert le dialogue) et la rend ; `undefined` si rien n'est enregistré, ou si un dialogue est
 * déjà ouvert. Le dialogue est chargé à la demande, au premier appel. Le focus revient à `declencheur` à la fermeture :
 * un élément de menu, retiré du DOM entre-temps, ne pourrait pas le reprendre.
 */
@Injectable({ providedIn: 'root' })
export class AjouterImage {
  private readonly injecteur = inject(Injector);
  private readonly annonceur = inject(LiveAnnouncer);

  private readonly compteurAjouts = signal(0);
  /** Nombre d'Images enregistrées par ce dialogue depuis le chargement de l'application. */
  readonly imagesAjoutees = this.compteurAjouts.asReadonly();

  /** Vrai de l'appel à la fermeture : un double clic n'ouvre qu'un dialogue. */
  private ouvertureEnCours = false;

  async ouvrir(declencheur?: HTMLElement): Promise<MesMotsImageDto | undefined> {
    if (this.ouvertureEnCours) {
      return undefined;
    }
    this.ouvertureEnCours = true;
    try {
      const { ouvrirDialogueAjouterImage } = await import('./televerser-image-dialogue');
      const image = await ouvrirDialogueAjouterImage(this.injecteur, declencheur);
      if (image) {
        this.compteurAjouts.update((nombre) => nombre + 1);
        void this.annonceur.announce(annonceImageAjoutee(image.forme), 'polite');
      }
      return image;
    } finally {
      this.ouvertureEnCours = false;
    }
  }
}
