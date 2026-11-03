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

  const tour = () => new Promise((fin) => setTimeout(fin));

  /** Ouvre `url` dans la coquille, compte d'enseignant chargé ; rend le texte de la page. */
  async function ouvrir(url: string): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(App);
    const navigation = TestBed.inject(Router).navigateByUrl(url);
    await tour();
    fixture.detectChanges();
    await tour();
    TestBed.inject(HttpTestingController).expectOne('/api/mon-compte').flush({
      id: '0190f0a0-0000-7000-8000-000000000002',
      nomAffiche: 'Claire',
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

  it('accueil : la rubrique Préparations, en État vide', async () => {
    const page = await ouvrir('/');

    expect(TestBed.inject(Router).url).toBe('/preparations');
    expect(page.querySelector('h1')?.textContent).toBe('Préparations');
    expect(page.querySelector('app-etat-vide')?.textContent).toContain(
      "Pas encore de préparation. Choisissez un album : les mots déjà illustrés par l'équipe arrivent tout seuls.",
    );
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

  it.each([
    ['/mon-compte', 'Mon compte'],
    ['/mes-donnees', 'Mes données'],
  ])('%s : « Cette page arrive bientôt. » et « Retour aux préparations »', async (url, titre) => {
    const page = await ouvrir(url);

    expect(page.querySelector('h1')?.textContent).toBe(titre);
    expect(page.querySelector('app-etat-vide')?.textContent).toContain(
      'Cette page arrive bientôt.',
    );
    const retour = page.querySelector<HTMLAnchorElement>('app-etat-vide a')!;
    expect(retour.textContent?.trim()).toBe('Retour aux préparations');
    expect(retour.getAttribute('href')).toBe('/preparations');
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

  const tour = () => new Promise((fin) => setTimeout(fin));

  it('lie le titre de la route à la page et sert les pictogrammes', async () => {
    const fixture = TestBed.createComponent(App);
    const navigation = TestBed.inject(Router).navigateByUrl('/mon-compte');
    await tour();
    fixture.detectChanges();
    await tour();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/mon-compte')
      .flush({
        id: '0190f0a0-0000-7000-8000-000000000002',
        nomAffiche: 'Claire',
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
