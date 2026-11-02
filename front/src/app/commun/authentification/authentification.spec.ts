import { TestBed } from '@angular/core/testing';
import { Authentification } from './authentification';

const keycloak = vi.hoisted(() => ({
  init: vi.fn(),
  updateToken: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  token: undefined as string | undefined,
  config: undefined as unknown,
}));

vi.mock('keycloak-js', () => ({
  default: class {
    constructor(config: unknown) {
      keycloak.config = config;
      return keycloak;
    }
  },
}));

describe('Authentification', () => {
  let authentification: Authentification;

  beforeEach(() => {
    for (const methode of [keycloak.init, keycloak.updateToken, keycloak.login, keycloak.logout]) {
      methode.mockReset().mockResolvedValue(true);
    }
    keycloak.token = 'jeton-1';
    authentification = TestBed.inject(Authentification);
  });

  it('vise le realm corpus-mots sous /auth, à la même origine', () => {
    expect(keycloak.config).toEqual({
      url: `${window.location.origin}/auth`,
      realm: 'corpus-mots',
      clientId: 'corpus-mots-front',
    });
  });

  it('exige la connexion au démarrage, par code + PKCE S256', async () => {
    await authentification.demarrer();
    expect(keycloak.init).toHaveBeenCalledWith({ onLoad: 'login-required', pkceMethod: 'S256', checkLoginIframe: false });
  });

  it('renouvelle le jeton qui expire dans moins de 30 s avant de le donner', async () => {
    await expect(authentification.jeton()).resolves.toBe('jeton-1');
    expect(keycloak.updateToken).toHaveBeenCalledWith(30);
  });

  it('force le renouvellement après un 401', async () => {
    await authentification.jetonRenouvele();
    expect(keycloak.updateToken).toHaveBeenCalledWith(-1);
  });

  it('session expirée : Connexion puis retour à la page courante, la requête reste en attente', async () => {
    keycloak.updateToken.mockRejectedValue(new Error('session expirée'));
    let reglee = false;
    void authentification.jeton().finally(() => (reglee = true));
    await new Promise((fin) => setTimeout(fin));

    expect(keycloak.login).toHaveBeenCalledWith({ redirectUri: window.location.href });
    expect(reglee).toBe(false);
  });

  it('se déconnecter ferme la session Keycloak et revient à l’application, donc à la Connexion', async () => {
    await authentification.deconnecter();
    expect(keycloak.logout).toHaveBeenCalledWith({ redirectUri: `${window.location.origin}/` });
  });
});
