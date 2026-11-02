import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { Authentification } from './authentification';
import { jetonInterceptor } from './jeton-interceptor';

describe('jetonInterceptor', () => {
  const jeton = vi.fn<() => Promise<string>>();
  const jetonRenouvele = vi.fn<() => Promise<string>>();
  let http: HttpClient;
  let serveur: HttpTestingController;

  beforeEach(() => {
    jeton.mockReset().mockResolvedValue('jeton-1');
    jetonRenouvele.mockReset().mockResolvedValue('jeton-2');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jetonInterceptor])),
        provideHttpClientTesting(),
        { provide: Authentification, useValue: { jeton, jetonRenouvele } },
      ],
    });
    http = TestBed.inject(HttpClient);
    serveur = TestBed.inject(HttpTestingController);
  });

  afterEach(() => serveur.verify());

  /** Laisse les promesses du service d'authentification se résoudre avant d'attendre la requête. */
  const promessesResolues = () => new Promise((fin) => setTimeout(fin));

  it('joint le jeton aux appels à /api', async () => {
    const reponse = firstValueFrom(http.get('/api/mon-compte'));
    await promessesResolues();

    const requete = serveur.expectOne('/api/mon-compte');
    expect(requete.request.headers.get('Authorization')).toBe('Bearer jeton-1');
    requete.flush({ nomAffiche: 'Paul' });
    await expect(reponse).resolves.toEqual({ nomAffiche: 'Paul' });
  });

  it("ne joint aucun jeton hors de /api, ni à un autre domaine", async () => {
    const page = firstValueFrom(http.get('/assets/x.json'));
    const ailleurs = firstValueFrom(http.get('https://exemple.fr/api/x'));
    await promessesResolues();

    const locale = serveur.expectOne('/assets/x.json');
    const externe = serveur.expectOne('https://exemple.fr/api/x');
    expect(locale.request.headers.has('Authorization')).toBe(false);
    expect(externe.request.headers.has('Authorization')).toBe(false);
    locale.flush({});
    externe.flush({});
    await Promise.all([page, ailleurs]);
    expect(jeton).not.toHaveBeenCalled();
  });

  it('sur un 401, renouvelle le jeton en silence et rejoue la requête avec son corps', async () => {
    const saisie = { mot: 'lapin' };
    const reponse = firstValueFrom(http.post('/api/mots', saisie));
    await promessesResolues();

    serveur.expectOne('/api/mots').flush(null, { status: 401, statusText: 'Unauthorized' });
    await promessesResolues();
    const rejeu = serveur.expectOne('/api/mots');
    expect(rejeu.request.headers.get('Authorization')).toBe('Bearer jeton-2');
    expect(rejeu.request.body).toEqual(saisie);
    rejeu.flush({ ok: true });

    await expect(reponse).resolves.toEqual({ ok: true });
    expect(jetonRenouvele).toHaveBeenCalledOnce();
  });

  it('ne rejoue qu’une fois : un second 401 remonte à l’appelant', async () => {
    const reponse = firstValueFrom(http.get('/api/mon-compte'));
    const echec = expect(reponse).rejects.toMatchObject({ status: 401 });
    await promessesResolues();

    serveur.expectOne('/api/mon-compte').flush(null, { status: 401, statusText: 'Unauthorized' });
    await promessesResolues();
    serveur.expectOne('/api/mon-compte').flush(null, { status: 401, statusText: 'Unauthorized' });

    await echec;
    expect(jetonRenouvele).toHaveBeenCalledOnce();
  });

  it('laisse passer les autres erreurs sans renouveler le jeton', async () => {
    const reponse = firstValueFrom(http.get('/api/mon-compte'));
    const echec = expect(reponse).rejects.toMatchObject({ status: 403 });
    await promessesResolues();

    serveur.expectOne('/api/mon-compte').flush({ code: 'compte.inconnu_ou_inactif' }, { status: 403, statusText: 'Forbidden' });

    await echec;
    expect(jetonRenouvele).not.toHaveBeenCalled();
  });
});
