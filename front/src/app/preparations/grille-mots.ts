import { computed, Injectable, signal } from '@angular/core';
import { MotPreparationDto } from '../api/models/mot-preparation-dto';

/** Mots dans l'ordre de leur place, `mot` inséré à la sienne (sans doublon). */
function inserer(mots: readonly MotPreparationDto[], mot: MotPreparationDto): MotPreparationDto[] {
  return [...mots.filter((autre) => autre.id !== mot.id), mot].sort((a, b) => a.ordre - b.ordre);
}

/**
 * État de la Grille des Mots d'une Préparation : la liste des Mots et sa révision locale. Ses méthodes sont les seules
 * écritures de la liste dans le front. Fourni par le composant `Preparation` (`providers`), pas en `root` : chaque page
 * repart d'une Grille vide.
 *
 * Toute écriture locale (`ajouter`, `remplacer`, `retirer`) augmente la révision ; une relecture des Mots partie avant
 * (`charger` avec la révision lue au départ) est alors ignorée : le changement local, plus récent, est gardé, sans
 * fusion (B-1, rétrospective de l'Epic 2). `vider` remet la Grille à zéro pour une autre Préparation ; la page ignore
 * elle-même les réponses d'une Préparation quittée.
 */
@Injectable()
export class GrilleMots {
  private readonly liste = signal<readonly MotPreparationDto[] | null>(null);
  private readonly numeroRevision = signal(0);

  /** Mots de la Préparation dans l'ordre de leur place ; `null` tant qu'ils ne sont pas chargés. */
  readonly mots = this.liste.asReadonly();
  /** Nombre d'écritures locales depuis le dernier `vider`. */
  readonly revision = this.numeroRevision.asReadonly();
  /** Mots du Lexique de la Grille. */
  readonly motsPresents = computed(
    () => new Set((this.liste() ?? []).map((mot) => mot.motId)) as ReadonlySet<string>,
  );
  /** Nombre de Mots illustrés ; `null` tant que la Grille n'est pas chargée. */
  readonly nombreIllustres = computed(
    () => this.liste()?.filter((mot) => mot.illustre).length ?? null,
  );

  /**
   * Liste lue sur le back ; elle n'est écrite que si aucune écriture locale n'a eu lieu depuis `revisionAuDepart`
   * (révision lue au départ de la lecture). Vrai si elle a été écrite.
   */
  charger(liste: readonly MotPreparationDto[], revisionAuDepart: number): boolean {
    if (revisionAuDepart !== this.numeroRevision()) {
      return false;
    }
    this.liste.set([...liste]);
    return true;
  }

  /** Ajoute `mot` à sa place selon `ordre`, sans doublon (un Mot déjà présent est remplacé). */
  ajouter(mot: MotPreparationDto): void {
    this.ecrire((mots) => inserer(mots, mot));
  }

  /** Remplace le Mot de même identifiant ; faux, sans rien écrire, s'il n'est plus dans la Grille. */
  remplacer(mot: MotPreparationDto): boolean {
    if (!this.liste()?.some((autre) => autre.id === mot.id)) {
      return false;
    }
    this.ecrire((mots) => mots.map((autre) => (autre.id === mot.id ? mot : autre)));
    return true;
  }

  /** Retire le Mot `id` de la Grille ; sans effet, ni révision, s'il n'y est pas. */
  retirer(id: string): void {
    if (!this.liste()?.some((autre) => autre.id === id)) {
      return;
    }
    this.ecrire((mots) => mots.filter((autre) => autre.id !== id));
  }

  /** Grille vide et révision à zéro : une autre Préparation s'ouvre. */
  vider(): void {
    this.liste.set(null);
    this.numeroRevision.set(0);
  }

  private ecrire(
    changer: (mots: readonly MotPreparationDto[]) => readonly MotPreparationDto[],
  ): void {
    const mots = this.liste();
    if (mots === null) {
      return;
    }
    this.numeroRevision.update((revision) => revision + 1);
    this.liste.set(changer(mots));
  }
}
