import { afterNextRender, inject, Injectable, Injector, signal } from '@angular/core';

/**
 * Seul moyen d'écrire la région `aria-live` de la page Préparation. Fourni par le composant `Preparation`
 * (`providers`), pas en `root`.
 *
 * `annoncer` vide la région, puis la remplit après le rendu : un même message (deuxième changement d'Image du même Mot)
 * est ainsi annoncé de nouveau. Plusieurs annonces avant ce rendu donnent la dernière, entière (B-7, rétrospective de
 * l'Epic 2).
 */
@Injectable()
export class Annonces {
  private readonly injecteur = inject(Injector);
  private readonly region = signal('');
  /** Message à écrire au prochain rendu ; `null` si aucun n'attend. */
  private enAttente: string | null = null;

  /** Texte de la région `aria-live`. */
  readonly texte = this.region.asReadonly();

  annoncer(message: string): void {
    this.region.set('');
    const dejaPrevue = this.enAttente !== null;
    this.enAttente = message;
    if (dejaPrevue) {
      return;
    }
    afterNextRender(
      () => {
        const attendu = this.enAttente;
        this.enAttente = null;
        if (attendu !== null) {
          this.region.set(attendu);
        }
      },
      { injector: this.injecteur },
    );
  }

  /** Région vidée, annonce en attente abandonnée : une autre Préparation s'ouvre. */
  effacer(): void {
    this.enAttente = null;
    this.region.set('');
  }
}
