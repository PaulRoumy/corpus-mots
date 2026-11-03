import { computed, inject, Injectable, signal } from '@angular/core';
import { Api } from '../api/api';
import { listerEnseignants } from '../api/fn/enseignants-resource/lister-enseignants';
import { EnseignantDto } from '../api/models/enseignant-dto';

/** Annuaire de l'équipe : en chargement, chargé ou en échec. */
export type EtatAnnuaire =
  | { statut: 'chargement' }
  | { statut: 'charge'; enseignants: EnseignantDto[] }
  | { statut: 'erreur' };

/**
 * Noms affichés de l'équipe, lus par `GET /api/enseignants` et gardés en cache : le nom n'est stocké que dans le
 * module `comptes` (AD-20), les autres écrans le résolvent ici à partir de l'identifiant. Les invités n'y figurent
 * pas.
 */
@Injectable({ providedIn: 'root' })
export class Annuaire {
  private readonly api = inject(Api);
  private chargement?: Promise<void>;

  private readonly etatCourant = signal<EtatAnnuaire>({ statut: 'chargement' });
  readonly etat = this.etatCourant.asReadonly();
  private readonly parId = computed(() => {
    const etat = this.etatCourant();
    return new Map(
      etat.statut === 'charge'
        ? etat.enseignants.map((enseignant) => [enseignant.id, enseignant])
        : [],
    );
  });

  /**
   * Charge l'annuaire au premier appel ; les appels suivants attendent ce même chargement tant qu'il réussit. Après
   * un échec, l'appel suivant relit ; un annuaire déjà chargé reste en place, l'état ne passe en erreur que s'il
   * n'y en a pas.
   */
  charger(): Promise<void> {
    this.chargement ??= this.lire();
    return this.chargement;
  }

  /**
   * Relit l'annuaire, même déjà chargé ; les appels concurrents à `charger()` attendent cette lecture. En cas
   * d'échec, les noms déjà chargés restent disponibles et le `charger()` suivant relit.
   */
  recharger(): Promise<void> {
    this.chargement = this.lire();
    return this.chargement;
  }

  /** Entrée de l'annuaire pour cet identifiant, ou `null` s'il n'y figure pas (ou pas encore). */
  enseignant(id: string): EnseignantDto | null {
    return this.parId().get(id) ?? null;
  }

  private lire(): Promise<void> {
    const lecture: Promise<void> = this.api.invoke(listerEnseignants).then(
      (enseignants) => {
        if (this.chargement === lecture) {
          this.etatCourant.set({ statut: 'charge', enseignants });
        }
      },
      () => {
        if (this.chargement === lecture) {
          this.chargement = undefined;
          if (this.etatCourant().statut !== 'charge') {
            this.etatCourant.set({ statut: 'erreur' });
          }
        }
      },
    );
    return lecture;
  }
}
