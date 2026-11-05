import { Injectable } from '@angular/core';
import Keycloak from 'keycloak-js';

/** Validité minimale (secondes) du jeton joint à une requête : renouvelé avant s'il expire plus tôt. */
const VALIDITE_MINIMALE = 30;

/**
 * Seule page ouverte sans connexion : « Données personnelles » (FR-3, UX-DR-39), liée depuis les pages Keycloak.
 * Elle ne démarre pas Keycloak et reste hors de la coquille, donc n'appelle pas /api.
 */
export const PAGE_PUBLIQUE = 'donnees-personnelles';

/**
 * Session de l'enseignant, tenue par Keycloak (AD-6) : connexion par code + PKCE, jeton court renouvelé en silence,
 * déconnexion. Keycloak est servi sous /auth, à la même origine que l'application.
 */
@Injectable({ providedIn: 'root' })
export class Authentification {
  private readonly keycloak = new Keycloak({
    url: `${window.location.origin}/auth`,
    realm: 'corpus-mots',
    clientId: 'corpus-mots-front',
  });

  /**
   * Au démarrage : sans session, passe par la page de Connexion, qui ramène à l'URL demandée. Sur la page publique,
   * rien : ni Connexion ni appel à Keycloak ; son lien « Ouvrir corpus-mots » recharge l'application.
   */
  async demarrer(): Promise<void> {
    if (window.location.pathname.replace(/\/?$/, '') === `/${PAGE_PUBLIQUE}`) {
      return;
    }
    await this.keycloak.init({
      onLoad: 'login-required',
      pkceMethod: 'S256',
      checkLoginIframe: false,
    });
  }

  /** Jeton valide pour un appel à /api ; session expirée : Connexion puis retour à la page courante. */
  async jeton(): Promise<string> {
    return this.renouvelerOuSeConnecter(VALIDITE_MINIMALE);
  }

  /** Après un 401 : renouvelle le jeton même s'il paraît encore valide. */
  async jetonRenouvele(): Promise<string> {
    return this.renouvelerOuSeConnecter(-1);
  }

  async deconnecter(): Promise<void> {
    await this.keycloak.logout({ redirectUri: `${window.location.origin}/` });
  }

  private async renouvelerOuSeConnecter(validiteMinimale: number): Promise<string> {
    try {
      await this.keycloak.updateToken(validiteMinimale);
    } catch {
      await this.keycloak.login({ redirectUri: window.location.href });
      // La page part vers Keycloak : la requête en cours ne doit ni partir ni échouer.
      return new Promise<string>(() => undefined);
    }
    return this.keycloak.token ?? '';
  }
}
