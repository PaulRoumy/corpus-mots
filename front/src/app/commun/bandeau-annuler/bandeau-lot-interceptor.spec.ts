import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Subscription } from 'rxjs';
import { bandeauLotInterceptor } from './bandeau-lot-interceptor';
import { ecrituresApi } from './geste-suivant';

describe('bandeauLotInterceptor (story 3.7)', () => {
  let http: HttpClient;
  let serveur: HttpTestingController;
  let fermerLot: ReturnType<typeof vi.fn<() => void>>;
  let abonnement: Subscription;

  beforeEach(() => {
    fermerLot = vi.fn<() => void>();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([bandeauLotInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    abonnement = ecrituresApi.subscribe(() => fermerLot());
    http = TestBed.inject(HttpClient);
    serveur = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    abonnement.unsubscribe();
    serveur.verify();
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    '%s vers /api : geste suivant, le bandeau de lot se ferme',
    (methode) => {
      http.request(methode, '/api/preparations/p1/mots', { body: {} }).subscribe();
      expect(fermerLot).toHaveBeenCalledTimes(1);
      serveur.expectOne('/api/preparations/p1/mots').flush({});
    },
  );

  it('GET vers /api : lecture seule, le bandeau reste', () => {
    http.get('/api/preparations').subscribe();
    expect(fermerLot).not.toHaveBeenCalled();
    serveur.expectOne('/api/preparations').flush([]);
  });

  it('écriture de même origine hors de /api : le bandeau reste', () => {
    http.post('/apix/journal', {}).subscribe();
    expect(fermerLot).not.toHaveBeenCalled();
    serveur.expectOne('/apix/journal').flush({});
  });

  it('écriture hors de l’API (autre origine) : le bandeau reste', () => {
    http.post('https://keycloak.exemple/token', {}).subscribe();
    expect(fermerLot).not.toHaveBeenCalled();
    serveur.expectOne('https://keycloak.exemple/token').flush({});
  });
});
