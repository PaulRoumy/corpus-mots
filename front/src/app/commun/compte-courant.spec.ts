import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CompteCourant } from './compte-courant';

describe('CompteCourant', () => {
  let compteCourant: CompteCourant;
  let serveur: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    compteCourant = TestBed.inject(CompteCourant);
    serveur = TestBed.inject(HttpTestingController);
  });

  afterEach(() => serveur.verify());

  /** Laisse partir la requête du client généré, la sert, puis attend que l'état soit posé. */
  async function charger(
    reponse: (requete: ReturnType<HttpTestingController['expectOne']>) => void,
  ) {
    const chargement = compteCourant.charger();
    await new Promise((fin) => setTimeout(fin));
    reponse(serveur.expectOne('/api/mon-compte'));
    await chargement;
  }

  it('est en chargement avant la réponse', () => {
    expect(compteCourant.etat()).toEqual({ statut: 'chargement' });
    expect(compteCourant.administrateur()).toBe(false);
  });

  it("donne le nom affiché et le rôle d'administrateur lus par le back", async () => {
    await charger((requete) =>
      requete.flush({
        id: '0190f0a0-0000-7000-8000-000000000001',
        nomAffiche: 'Paul Roumy',
        administrateur: true,
      }),
    );
    expect(compteCourant.compte()?.nomAffiche).toBe('Paul Roumy');
    expect(compteCourant.administrateur()).toBe(true);
  });

  it('ne charge le compte qu’une fois', async () => {
    await charger((requete) =>
      requete.flush({
        id: '0190f0a0-0000-7000-8000-000000000001',
        nomAffiche: 'Claire',
        administrateur: false,
      }),
    );
    await compteCourant.charger();
    serveur.expectNone('/api/mon-compte');
    expect(compteCourant.administrateur()).toBe(false);
  });

  it('403 compte.inconnu_ou_inactif : compte inactif', async () => {
    await charger((requete) =>
      requete.flush(
        { status: 403, code: 'compte.inconnu_ou_inactif' },
        { status: 403, statusText: 'Forbidden' },
      ),
    );
    expect(compteCourant.etat()).toEqual({ statut: 'inactif' });
  });

  it('autre 403, 500 ou réseau : erreur', async () => {
    await charger((requete) =>
      requete.flush({ code: 'autre' }, { status: 403, statusText: 'Forbidden' }),
    );
    expect(compteCourant.etat()).toEqual({ statut: 'erreur' });

    for (const reponse of [
      (requete: ReturnType<HttpTestingController['expectOne']>) =>
        requete.flush(null, { status: 500, statusText: 'Server Error' }),
      (requete: ReturnType<HttpTestingController['expectOne']>) =>
        requete.error(new ProgressEvent('error')),
    ]) {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
      });
      compteCourant = TestBed.inject(CompteCourant);
      serveur = TestBed.inject(HttpTestingController);
      await charger(reponse);
      expect(compteCourant.etat()).toEqual({ statut: 'erreur' });
    }
  });
});
