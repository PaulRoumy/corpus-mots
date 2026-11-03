import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Api } from '../api/api';
import { lireMonCompte } from '../api/fn/mon-compte-resource/lire-mon-compte';
import { MonCompteDto } from '../api/models/mon-compte-dto';

/** Compte de l'enseignant connecté : en chargement, chargé, inactif (403 du back) ou en échec. */
export type EtatCompte =
  | { statut: 'chargement' }
  | { statut: 'compte'; compte: MonCompteDto }
  | { statut: 'inactif' }
  | { statut: 'erreur' };

/**
 * Source du nom affiché et du rôle administrateur, lus une seule fois par `GET /api/mon-compte` (le back tire le
 * rôle du jeton). Un compte sans `Enseignant` actif reçoit `403 compte.inconnu_ou_inactif`.
 */
@Injectable({ providedIn: 'root' })
export class CompteCourant {
  private readonly api = inject(Api);
  private chargement?: Promise<void>;

  private readonly etatCourant = signal<EtatCompte>({ statut: 'chargement' });
  readonly etat = this.etatCourant.asReadonly();
  readonly compte = computed(() => {
    const etat = this.etatCourant();
    return etat.statut === 'compte' ? etat.compte : null;
  });
  readonly administrateur = computed(() => this.compte()?.administrateur === true);

  /** Charge le compte au premier appel ; les appels suivants attendent ce même chargement. */
  charger(): Promise<void> {
    this.chargement ??= this.api.invoke(lireMonCompte).then(
      (compte) => this.etatCourant.set({ statut: 'compte', compte }),
      (erreur: unknown) =>
        this.etatCourant.set({ statut: estCompteInactif(erreur) ? 'inactif' : 'erreur' }),
    );
    return this.chargement;
  }
}

function estCompteInactif(erreur: unknown): boolean {
  if (!(erreur instanceof HttpErrorResponse) || erreur.status !== 403) {
    return false;
  }
  const corps: unknown = erreur.error;
  return (
    typeof corps === 'object' &&
    corps !== null &&
    'code' in corps &&
    corps.code === 'compte.inconnu_ou_inactif'
  );
}
