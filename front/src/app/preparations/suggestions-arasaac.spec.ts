import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MotPreparationDto } from '../api/models/mot-preparation-dto';
import { SuggestionArasaacDto } from '../api/models/suggestion-arasaac-dto';
import { provideIcones } from '../commun/icones';
import { SuggestionsArasaac } from './suggestions-arasaac';

describe('SuggestionsArasaac', () => {
  let fixture: ComponentFixture<SuggestionsArasaac>;
  let racine: HTMLElement;
  let serveur: HttpTestingController;
  const original = { creer: URL.createObjectURL, revoquer: URL.revokeObjectURL };

  const URL_CITROUILLE = '/api/arasaac/suggestions?mot=citrouille';
  const PREPARATION = '0190f0a0-0000-7000-8000-0000000a0001';
  const MOT_PREPARATION = '0190f0a0-0000-7000-8000-0000000f0001';
  const URL_PICTOGRAMME = `/api/preparations/${PREPARATION}/mots/${MOT_PREPARATION}/pictogramme`;
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
      providers: [provideHttpClient(), provideHttpClientTesting(), provideIcones()],
    });
    serveur = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SuggestionsArasaac);
    fixture.componentRef.setInput('mot', 'citrouille');
    fixture.componentRef.setInput('preparationId', PREPARATION);
    fixture.componentRef.setInput('motPreparationId', MOT_PREPARATION);
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
    expect(racine.querySelector('a')).toBeNull();
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

  describe('choisir un pictogramme (story 2.4, partie 2)', () => {
    const ILLUSTRE: MotPreparationDto = {
      id: MOT_PREPARATION,
      motId: '0190f0a0-0000-7000-8000-0000000e0001',
      forme: 'citrouille',
      ordre: 1,
      sens: { id: '0190f0a0-0000-7000-8000-0000000d0001', libelle: 'à compléter' },
      illustre: true,
      image: {
        id: '0190f0a0-0000-7000-8000-0000000c0001',
        proprietaireId: '0190f0a0-0000-7000-8000-00000000e001',
        etat: 'privee',
        aRemplacer: null,
        reutilisable: true,
        typeImage: 'image_libre',
        aCompleter: false,
      },
    };

    const boutons = () => [
      ...racine.querySelectorAll<HTMLButtonElement>('button.suggestions__vignette'),
    ];
    const reessayer = () => racine.querySelector<HTMLButtonElement>('.suggestions__reessayer');

    beforeEach(async () => {
      serveur.expectOne(URL_CITROUILLE).flush(SUGGESTIONS);
      await stabiliser();
    });

    afterEach(() => {
      // Fichiers des pictogrammes : couverts par les tests ci-dessus.
      serveur.match((requete) => requete.url.startsWith('/api/arasaac/pictogrammes/'));
    });

    it('entrées non liées (Panneau de détection) : vignettes inertes, sans bouton', async () => {
      const inerte = TestBed.createComponent(SuggestionsArasaac);
      inerte.componentRef.setInput('mot', 'four');
      await stabiliser();
      serveur
        .expectOne('/api/arasaac/suggestions?mot=four')
        .flush([{ idArasaac: 5, motCle: 'four' }]);
      await stabiliser();
      await inerte.whenStable();

      const element = inerte.nativeElement as HTMLElement;
      expect(element.querySelectorAll('li.suggestions__vignette')).toHaveLength(1);
      expect(element.querySelector('button')).toBeNull();
      inerte.destroy();
    });

    it('chaque suggestion est un bouton nommé « Illustrer « citrouille » avec le pictogramme « … » »', () => {
      expect(boutons().map((bouton) => bouton.getAttribute('aria-label'))).toEqual([
        'Illustrer « citrouille » avec le pictogramme « citrouille »',
        'Illustrer « citrouille » avec le pictogramme « potiron »',
        'Illustrer « citrouille » avec le pictogramme « courge »',
      ]);
      expect(boutons().every((bouton) => bouton.type === 'button')).toBe(true);
    });

    it('clic : requête avec le seul `idArasaac`, boutons désactivés et indicateur, puis Mot illustré émis', async () => {
      const illustres: MotPreparationDto[] = [];
      fixture.componentInstance.illustre.subscribe((mot) => illustres.push(mot));

      boutons()[1].click();
      await stabiliser();

      const requete = serveur.expectOne(URL_PICTOGRAMME);
      expect(requete.request.method).toBe('POST');
      expect(requete.request.body).toEqual({ idArasaac: 37172 });
      expect(boutons().every((bouton) => bouton.getAttribute('aria-disabled') === 'true')).toBe(
        true,
      );
      expect(
        boutons().map((bouton) => bouton.classList.contains('suggestions__vignette--choisie')),
      ).toEqual([false, true, false]);
      expect(racine.querySelector('.suggestions__liste')?.getAttribute('aria-busy')).toBe('true');

      // Pendant l'envoi, un autre clic n'envoie rien.
      boutons()[0].click();
      await stabiliser();
      serveur.expectNone(URL_PICTOGRAMME);

      requete.flush(ILLUSTRE, { status: 201, statusText: 'Created' });
      await stabiliser();
      expect(illustres).toEqual([ILLUSTRE]);
      // Si la Carte reste affichée, ses boutons redeviennent actifs.
      expect(boutons().some((bouton) => bouton.hasAttribute('aria-disabled'))).toBe(false);
      expect(racine.querySelector('.suggestions__vignette--choisie')).toBeNull();
    });

    it('404 pictogramme introuvable chez ARASAAC : message dans la Carte, sans « Réessayer »', async () => {
      boutons()[0].click();
      await stabiliser();
      serveur
        .expectOne(URL_PICTOGRAMME)
        .flush(
          { status: 404, code: 'arasaac.pictogramme_introuvable' },
          { status: 404, statusText: 'Not Found' },
        );
      await stabiliser();

      expect(texte('.suggestions__echec .suggestions__message')).toBe(
        "Ce pictogramme n'est plus disponible chez ARASAAC.",
      );
      expect(reessayer()).toBeNull();
      expect(boutons().some((bouton) => bouton.hasAttribute('aria-disabled'))).toBe(false);
    });

    it('404 « ressource introuvable » (Mot retiré ailleurs) : sortie `aRecharger` avec le message traduit', async () => {
      const messages: string[] = [];
      fixture.componentInstance.aRecharger.subscribe((message) => messages.push(message));
      boutons()[0].click();
      await stabiliser();
      serveur
        .expectOne(URL_PICTOGRAMME)
        .flush(
          { status: 404, code: 'ressource.introuvable' },
          { status: 404, statusText: 'Not Found' },
        );
      await stabiliser();

      expect(messages).toEqual(["Cet élément n'existe plus. Rechargez la page."]);
      expect(racine.querySelector('.suggestions__echec')).toBeNull();
    });

    it('503 : message court, boutons de nouveau actifs, sans « Réessayer »', async () => {
      boutons()[0].click();
      await stabiliser();
      serveur
        .expectOne(URL_PICTOGRAMME)
        .flush(
          { status: 503, code: 'arasaac.indisponible' },
          { status: 503, statusText: 'Service Unavailable' },
        );
      await stabiliser();

      expect(texte('.suggestions__echec .suggestions__message')).toBe(
        "ARASAAC ne répond pas pour l'instant.",
      );
      expect(racine.querySelector('.suggestions__echec [role="alert"]')).not.toBeNull();
      expect(boutons().some((bouton) => bouton.hasAttribute('aria-disabled'))).toBe(false);
      expect(racine.querySelector('.suggestions__vignette--choisie')).toBeNull();
      expect(reessayer()).toBeNull();
    });

    it('échec réseau : message avec « Réessayer », qui renvoie la même requête', async () => {
      const illustres: MotPreparationDto[] = [];
      fixture.componentInstance.illustre.subscribe((mot) => illustres.push(mot));
      boutons()[2].click();
      await stabiliser();
      serveur.expectOne(URL_PICTOGRAMME).error(new ProgressEvent('error'), { status: 0 });
      await stabiliser();

      expect(texte('.suggestions__echec .suggestions__message')).toBe(
        'Connexion au serveur impossible. Vérifiez votre réseau, puis réessayez.',
      );
      reessayer()!.click();
      await stabiliser();

      const requete = serveur.expectOne(URL_PICTOGRAMME);
      expect(requete.request.body).toEqual({ idArasaac: 8 });
      expect(document.activeElement).toBe(boutons()[2]);
      expect(reessayer()).toBeNull();
      requete.flush(ILLUSTRE, { status: 201, statusText: 'Created' });
      await stabiliser();
      expect(illustres).toEqual([ILLUSTRE]);
    });

    it('pictogramme déjà possédé (story 2.11) : Marque « déjà utilisée » sous sa seule vignette, et dans son nom', async () => {
      expect(racine.querySelector('.suggestions__marque')).toBeNull();

      fixture.componentRef.setInput('idsDejaPossedes', new Set([37172]));
      await stabiliser();

      const marques = [...racine.querySelectorAll('.suggestions__element')].map(
        (element) => element.querySelector('.suggestions__marque')?.textContent?.trim() ?? null,
      );
      expect(marques).toEqual([null, 'déjà utilisée', null]);
      expect(
        racine.querySelector('.suggestions__marque mat-icon[svgIcon="historique"]'),
      ).not.toBeNull();
      expect(boutons().map((bouton) => bouton.getAttribute('aria-label'))).toEqual([
        'Illustrer « citrouille » avec le pictogramme « citrouille »',
        'Illustrer « citrouille » avec le pictogramme « potiron », déjà utilisée',
        'Illustrer « citrouille » avec le pictogramme « courge »',
      ]);
      // La recherche ARASAAC n'est pas relancée.
      serveur.expectNone(URL_CITROUILLE);
    });

    it('pictogramme déjà possédé : même requête, le `200` du back (Image réutilisée) sort par `illustre`', async () => {
      const illustres: MotPreparationDto[] = [];
      fixture.componentInstance.illustre.subscribe((mot) => illustres.push(mot));
      fixture.componentRef.setInput('idsDejaPossedes', new Set([2459]));
      await stabiliser();

      boutons()[0].click();
      await stabiliser();
      const requete = serveur.expectOne(URL_PICTOGRAMME);
      expect(requete.request.body).toEqual({ idArasaac: 2459 });
      requete.flush(ILLUSTRE, { status: 200, statusText: 'OK' });
      await stabiliser();

      expect(illustres).toEqual([ILLUSTRE]);
      expect(boutons().some((bouton) => bouton.hasAttribute('aria-disabled'))).toBe(false);
    });

    it('409 « mot déjà illustré » : sortie `aRecharger` avec le message traduit, aucun message dans la Carte', async () => {
      const messages: string[] = [];
      fixture.componentInstance.aRecharger.subscribe((message) => messages.push(message));
      boutons()[0].click();
      await stabiliser();
      serveur
        .expectOne(URL_PICTOGRAMME)
        .flush(
          { status: 409, code: 'preparation.mot_deja_illustre' },
          { status: 409, statusText: 'Conflict' },
        );
      await stabiliser();

      expect(messages).toEqual(['Ce mot a déjà une image dans la préparation.']);
      expect(racine.querySelector('.suggestions__echec')).toBeNull();
    });
  });
});
