import { inject, Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Ouvre le Dialogue « Nouvelle préparation » (Bouton « + », État vide de l'accueil) puis, si une Préparation est
 * créée, la page de cette Préparation. Le dialogue est chargé à la demande, au premier appel. Le focus revient à
 * `declencheur` à la fermeture : un élément de menu, retiré du DOM entre-temps, ne pourrait pas le reprendre.
 */
@Injectable({ providedIn: 'root' })
export class NouvellePreparation {
  private readonly injecteur = inject(Injector);
  private readonly router = inject(Router);

  /** Vrai de l'appel à la fermeture : un double clic, ou le « + » puis l'État vide, n'ouvre qu'un dialogue. */
  private ouvertureEnCours = false;

  async ouvrir(declencheur?: HTMLElement): Promise<void> {
    if (this.ouvertureEnCours) {
      return;
    }
    this.ouvertureEnCours = true;
    try {
      const { ouvrirDialogueNouvellePreparation } = await import('./nouvelle-preparation-dialogue');
      const preparation = await ouvrirDialogueNouvellePreparation(this.injecteur, declencheur);
      if (preparation) {
        await this.router.navigate(['/preparations', preparation.id]);
      }
    } finally {
      this.ouvertureEnCours = false;
    }
  }
}
