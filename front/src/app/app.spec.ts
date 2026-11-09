import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { App } from './app';
import { appConfig } from './app.config';
import { routes } from './app.routes';
import { Authentification } from './commun/authentification/authentification';
import { provideIcones } from './commun/icones';

const tour = () => new Promise((fin) => setTimeout(fin));

/**
 * Préparations, Mon compte et les pages « Données personnelles » sont chargées à la demande : les importer d'avance
 * pour que la navigation, donc la coquille et sa requête du compte, ne prennent pas plus de tours qu'une route
 * ordinaire.
 */
const precharger = () =>
  Promise.all([
    import('./preparations/preparations'),
    import('./preparations/preparation'),
    import('./compte/mon-compte'),
    import('./compte/donnees-personnelles'),
  ]);

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideIcones(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
        { provide: Authentification, useValue: { deconnecter: vi.fn() } },
      ],
    });
  });

  /** Ouvre `url` dans la coquille, compte d'enseignant chargé ; rend le texte de la page. */
  async function ouvrir(url: string): Promise<HTMLElement> {
    await precharger();
    const fixture = TestBed.createComponent(App);
    const navigation = TestBed.inject(Router).navigateByUrl(url);
    await tour();
    fixture.detectChanges();
    await tour();
    TestBed.inject(HttpTestingController).expectOne('/api/mon-compte').flush({
      id: '0190f0a0-0000-7000-8000-000000000002',
      nomAffiche: 'Claire',
      email: 'claire@ecole.fr',
      administrateur: false,
    });
    await navigation;
    await tour();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('se crée', () => {
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });

  it('accueil : la rubrique Préparations, en État vide avec « Nouvelle préparation »', async () => {
    const page = await ouvrir('/');
    TestBed.inject(HttpTestingController)
      .expectOne('/api/preparations?page=0&taille=100')
      .flush({ elements: [], total: 0 });
    await tour();
    await tour();

    expect(TestBed.inject(Router).url).toBe('/preparations');
    expect(page.querySelector('h1')?.textContent).toBe('Préparations');
    expect(page.querySelector('app-etat-vide')?.textContent).toContain(
      "Pas encore de préparation. Choisissez un album : les mots déjà illustrés par l'équipe arrivent tout seuls.",
    );
    expect(page.querySelector('app-etat-vide button')?.textContent?.trim()).toBe(
      'Nouvelle préparation',
    );
  });

  it('/preparations/:id : la route lie l’identifiant et l’En-tête affiche l’Album', async () => {
    const id = '0190f0a0-0000-7000-8000-00000000d001';
    const page = await ouvrir(`/preparations/${id}`);
    TestBed.inject(HttpTestingController).expectOne(`/api/preparations/${id}`).flush({
      id,
      albumId: '0190f0a0-0000-7000-8000-00000000a001',
      titreAlbum: 'La Roule Galette',
      section: 'ms',
      nombreMots: 0,
      nombreIllustres: 0,
      creeLe: '2026-11-09T10:00:00Z',
    });
    await tour();
    await tour();

    expect(TestBed.inject(Router).url).toBe(`/preparations/${id}`);
    expect(page.querySelector('h1')?.textContent?.trim()).toBe('La Roule Galette');
  });

  it('URL inconnue : retour à l’accueil', async () => {
    await ouvrir('/nulle-part');

    expect(TestBed.inject(Router).url).toBe('/preparations');
  });

  it.each([
    ['/banque', 'Banque', 'Aucune image.'],
    ['/fiches', 'Fiches', 'Pas encore de fiche.'],
  ])('%s : État vide, la phrase seule', async (url, titre, phrase) => {
    const page = await ouvrir(url);

    expect(page.querySelector('h1')?.textContent).toBe(titre);
    expect(page.querySelector('app-etat-vide')?.textContent?.trim()).toBe(phrase);
    expect(page.querySelector('app-etat-vide a, app-etat-vide button')).toBeNull();
  });

  it('/mon-compte : nom affiché modifiable, e-mail et rôle', async () => {
    const page = await ouvrir('/mon-compte');

    expect(page.querySelector('h1')?.textContent).toBe('Mon compte');
    expect(page.querySelector<HTMLInputElement>('app-mon-compte input')?.value).toBe('Claire');
    expect(page.querySelector('app-mon-compte dl')?.textContent).toContain('claire@ecole.fr');
    expect(page.querySelector('app-mon-compte dl')?.textContent).toContain('Enseignant');
  });

  it('/mes-donnees : le texte « Données personnelles », dans la coquille, sous le titre « Mes données »', async () => {
    const page = await ouvrir('/mes-donnees');

    expect(page.querySelector('app-coquille')).not.toBeNull();
    expect(page.querySelector('h1')?.textContent).toBe('Mes données');
    expect(page.querySelector('app-texte-donnees-personnelles')?.textContent).toContain(
      "Demandez-le à l'administrateur de l'école.",
    );
    expect(page.querySelector('app-page-donnees-personnelles')).toBeNull();
  });

  it('/donnees-personnelles : page publique, hors de la coquille, sans requête à /api', async () => {
    await precharger();
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/donnees-personnelles');
    fixture.detectChanges();
    await tour();
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    TestBed.inject(HttpTestingController).verify();
    expect(page.querySelector('app-coquille')).toBeNull();
    expect(page.querySelector('h1')?.textContent).toBe('Données personnelles');
    expect(page.querySelector('app-texte-donnees-personnelles')).not.toBeNull();
    const ouvrirApplication = page.querySelector<HTMLAnchorElement>('header a')!;
    expect(ouvrirApplication.textContent?.trim()).toBe('Ouvrir corpus-mots');
    // Lien ordinaire, sans routerLink : il recharge l'application, qui démarre alors la Connexion.
    expect(ouvrirApplication.getAttribute('href')).toBe('/');
  });
});

describe('App avec la configuration de production', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        ...appConfig.providers,
        provideHttpClientTesting(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
        {
          provide: Authentification,
          useValue: {
            demarrer: vi.fn(() => Promise.resolve()),
            deconnecter: vi.fn(),
            jeton: vi.fn(() => Promise.resolve('jeton')),
          },
        },
      ],
    });
  });

  it('lie le titre de la route à la page et sert les pictogrammes', async () => {
    await precharger();
    const fixture = TestBed.createComponent(App);
    const navigation = TestBed.inject(Router).navigateByUrl('/mon-compte');
    await tour();
    fixture.detectChanges();
    await tour();
    TestBed.inject(HttpTestingController).expectOne('/api/mon-compte').flush({
      id: '0190f0a0-0000-7000-8000-000000000002',
      nomAffiche: 'Claire',
      email: 'claire@ecole.fr',
      administrateur: false,
    });
    await navigation;
    await tour();
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('h1')?.textContent).toBe('Mon compte');
    expect(page.querySelector('mat-icon svg')).not.toBeNull();
  });
});
