import { computed, signal } from '@angular/core';

/**
 * Modèle de sélection partagé (story 3.3, UX-DR-12) : un ensemble d'identifiants, lu dans l'ordre d'affichage que fournit
 * la page. Il ne connaît ni la Banque, ni la Préparation, ni l'Import : chacune le crée avec sa fonction d'ordre.
 *
 * - `basculer` coche ou décoche un élément ; il devient l'ancre de plage.
 * - `selectionnerPlage` (Maj+clic) sélectionne de l'ancre jusqu'à l'élément, dans l'ordre d'affichage, sans rien
 *   désélectionner ; sans ancre affichée, l'élément est sélectionné (jamais désélectionné) et devient l'ancre.
 * - `toutSelectionner` prend tous les éléments affichés ; `toutDeselectionner` vide la sélection.
 * - `garderSeulement` réduit la sélection aux identifiants encore affichés (rechargement), `retirer` en ôte quelques-uns
 *   (action faite), `reinitialiser` la vide (changement de contexte).
 *
 * Figée (`figer(true)`, pendant une action en lot), elle ignore les gestes de l'enseignant (bascule, plage, tout,
 * désélection) ; `garderSeulement`, `retirer` et `reinitialiser`, appelés par la page, s'appliquent toujours.
 */
export class Selection {
  private readonly ids = signal<ReadonlySet<string>>(new Set());
  private readonly estFigee = signal(false);
  /** Dernier élément basculé, départ d'une plage. */
  private ancre: string | null = null;

  /** @param ordre identifiants affichés, dans l'ordre d'affichage. */
  constructor(private readonly ordre: () => readonly string[]) {}

  /** Nombre d'éléments sélectionnés. */
  readonly nombre = computed(() => this.ids().size);
  /** Vrai dès qu'un élément est sélectionné. */
  readonly active = computed(() => this.ids().size > 0);
  /** Vrai pendant une action en lot. */
  readonly figee = this.estFigee.asReadonly();
  /** Identifiants sélectionnés et affichés, dans l'ordre d'affichage. */
  readonly identifiants = computed(() => {
    const ids = this.ids();
    return this.ordre().filter((id) => ids.has(id));
  });

  /** Vrai si `id` est sélectionné. */
  estSelectionne(id: string): boolean {
    return this.ids().has(id);
  }

  figer(figee: boolean): void {
    this.estFigee.set(figee);
  }

  basculer(id: string): void {
    if (this.estFigee()) {
      return;
    }
    const ids = new Set(this.ids());
    if (!ids.delete(id)) {
      ids.add(id);
    }
    this.ancre = id;
    this.ids.set(ids);
  }

  selectionnerPlage(id: string): void {
    if (this.estFigee()) {
      return;
    }
    const ordre = this.ordre();
    const debut = this.ancre === null ? -1 : ordre.indexOf(this.ancre);
    const fin = ordre.indexOf(id);
    if (debut < 0 || fin < 0) {
      // Sans ancre affichée, Maj+clic sélectionne l'élément (ou le garde sélectionné) et en fait l'ancre.
      this.ancre = id;
      if (!this.ids().has(id)) {
        this.ids.set(new Set([...this.ids(), id]));
      }
      return;
    }
    const ids = new Set(this.ids());
    for (let i = Math.min(debut, fin); i <= Math.max(debut, fin); i++) {
      ids.add(ordre[i]);
    }
    this.ids.set(ids);
  }

  toutSelectionner(): void {
    if (this.estFigee()) {
      return;
    }
    this.ids.set(new Set(this.ordre()));
  }

  toutDeselectionner(): void {
    if (this.estFigee()) {
      return;
    }
    this.reinitialiser();
  }

  /** Garde les seuls identifiants de `affiches` (encore affichés). */
  garderSeulement(affiches: Iterable<string>): void {
    const gardes = new Set(affiches);
    const ids = this.ids();
    if ([...ids].every((id) => gardes.has(id))) {
      return;
    }
    this.ids.set(new Set([...ids].filter((id) => gardes.has(id))));
    if (this.ancre !== null && !gardes.has(this.ancre)) {
      this.ancre = null;
    }
  }

  /** Retire `retires` de la sélection. */
  retirer(retires: Iterable<string>): void {
    const ids = new Set(this.ids());
    let change = false;
    for (const id of retires) {
      change = ids.delete(id) || change;
    }
    if (change) {
      this.ids.set(ids);
    }
  }

  /** Vide la sélection, même figée. */
  reinitialiser(): void {
    this.ancre = null;
    if (this.ids().size > 0) {
      this.ids.set(new Set());
    }
  }
}
