import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SuggestionArasaacDto } from '../api/models/suggestion-arasaac-dto';
import { SuggestionsArasaac } from './suggestions-arasaac';

describe('SuggestionsArasaac', () => {
  let fixture: ComponentFixture<SuggestionsArasaac>;
  let racine: HTMLElement;
  let serveur: HttpTestingController;
  const original = { creer: URL.createObjectURL, revoquer: URL.revokeObjectURL };

  const URL_CITROUILLE = '/api/arasaac/suggestions?mot=citrouille';
  const SUGGESTIONS: SuggestionArasaacDto[] = [
    { idArasaac: 2459, motCle: 'citrouille' },
    { idArasaac: 37172, motCle: 'potiron' },
    { idArasaac: 8, motCle: 'courge' },
  ];

  const tour = () => new Promise((fin) => setTimeout(fin));
  async function stabiliser() {
    await tour();
    await fixture.whenStable();
    await tour();
    await fixture.whenStable();
  }
  const texte = (selecteur: string) =>
    racine.querySelector(selecteur)?.textContent?.replace(/\s+/g, ' ').trim();
  const images = () => [...racine.querySelectorAll<HTMLImageElement>('.suggestions__vignette img')];

  beforeEach(async () => {
    URL.createObjectURL = vi.fn((fichier: Blob) => `blob:http://localhost/${fichier.size}`);
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    serveur = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SuggestionsArasaac);
    fixture.componentRef.setInput('mot', 'citrouille');
    racine = fixture.nativeElement as HTMLElement;
    await stabiliser();
  });

  afterEach(() => {
    serveur.verify();
    URL.createObjectURL = original.creer;
    URL.revokeObjectURL = original.revoquer;
  });

  it('ligne « Suggestions ARASAAC · simple, claire, peu de détails » et squelette pendant la recherche', () => {
    expect(texte('.suggestions__repere')).toBe(
      'Suggestions ARASAAC · simple, claire, peu de détails',
    );
    expect(racine.querySelector('app-squelette .squelette--vignette')).not.toBeNull();
    expect(racine.querySelectorAll('app-squelette .squelette__bloc')).toHaveLength(3);
    serveur.expectOne(URL_CITROUILLE);
  });

  it('trois vignettes dans l’ordre, alternative : le mot-clé ; fichiers chargés par le back en `blob:`', async () => {
    serveur.expectOne(URL_CITROUILLE).flush(SUGGESTIONS);
    await stabiliser();

    expect(racine.querySelector('app-squelette')).toBeNull();
    expect(images().map((image) => image.alt)).toEqual(['citrouille', 'potiron', 'courge']);
    expect(images().every((image) => !image.hasAttribute('src'))).toBe(true);

    for (const [rang, { idArasaac }] of SUGGESTIONS.entries()) {
      const requete = serveur.expectOne(`/api/arasaac/pictogrammes/${idArasaac}`);
      expect(requete.request.responseType).toBe('blob');
      requete.flush(new Blob(['x'.repeat(rang + 1)], { type: 'image/png' }));
    }
    await stabiliser();

    expect(images().map((image) => image.getAttribute('src'))).toEqual([
      'blob:http://localhost/1',
      'blob:http://localhost/2',
      'blob:http://localhost/3',
    ]);
    expect(racine.querySelector('a, button')).toBeNull();
  });

  it('fichier d’un pictogramme non chargé : son mot-clé à la place de la vignette', async () => {
    serveur.expectOne(URL_CITROUILLE).flush([SUGGESTIONS[0]]);
    await stabiliser();

    serveur
      .expectOne('/api/arasaac/pictogrammes/2459')
      .flush(new Blob(), { status: 503, statusText: 'Service Unavailable' });
    await stabiliser();

    expect(images()).toHaveLength(0);
    expect(texte('.suggestions__repli')).toBe('citrouille');
  });

  it('sans résultat : « Aucun pictogramme ARASAAC pour ce mot. »', async () => {
    serveur.expectOne(URL_CITROUILLE).flush([]);
    await stabiliser();

    expect(texte('.suggestions__message')).toBe('Aucun pictogramme ARASAAC pour ce mot.');
    expect(images()).toHaveLength(0);
  });

  it('ARASAAC indisponible : « ARASAAC ne répond pas pour l’instant. »', async () => {
    serveur
      .expectOne(URL_CITROUILLE)
      .flush(
        { status: 503, code: 'arasaac.indisponible' },
        { status: 503, statusText: 'Service Unavailable' },
      );
    await stabiliser();

    expect(texte('.suggestions__message')).toBe("ARASAAC ne répond pas pour l'instant.");
    expect(racine.querySelector('.suggestions__message')?.hasAttribute('role')).toBe(false);
    expect(racine.querySelector('.suggestions__message')?.hasAttribute('aria-live')).toBe(false);
  });

  it('autre Mot : nouvelle recherche, la réponse de l’ancienne est ignorée', async () => {
    const ancienne = serveur.expectOne(URL_CITROUILLE);
    fixture.componentRef.setInput('mot', 'four');
    await stabiliser();

    ancienne.flush(SUGGESTIONS);
    await stabiliser();
    expect(racine.querySelector('app-squelette')).not.toBeNull();

    serveur.expectOne('/api/arasaac/suggestions?mot=four').flush([]);
    await stabiliser();
    expect(texte('.suggestions__message')).toBe('Aucun pictogramme ARASAAC pour ce mot.');
  });
});
