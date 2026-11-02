import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { Authentification } from './commun/authentification/authentification';

describe('App', () => {
  const deconnecter = vi.fn(() => Promise.resolve());

  beforeEach(async () => {
    deconnecter.mockClear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Authentification, useValue: { deconnecter } },
      ],
    }).compileComponents();
  });

  async function accueil(reponse: (requete: ReturnType<HttpTestingController['expectOne']>) => void) {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    reponse(TestBed.inject(HttpTestingController).expectOne('/api/mon-compte'));
    // La promesse du client généré se résout après la réponse : laisser passer un tour avant de rendre.
    await new Promise((fin) => setTimeout(fin));
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('se crée', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("salue l'enseignant connecté par son nom affiché", async () => {
    const page = await accueil((requete) =>
      requete.flush({ id: '0190f0a0-0000-7000-8000-000000000001', nomAffiche: 'Paul Roumy', administrateur: true }),
    );
    expect(page.querySelector('h1')?.textContent).toContain('corpus-mots');
    expect(page.textContent).toContain('Bonjour, Paul Roumy');
  });

  it("signale un compte inactif d'après le code d'erreur du back", async () => {
    const page = await accueil((requete) =>
      requete.flush(
        { status: 403, code: 'compte.inconnu_ou_inactif' },
        { status: 403, statusText: 'Forbidden' },
      ),
    );
    expect(page.querySelector('[role="alert"]')?.textContent).toContain("Votre compte n'est pas actif");
  });

  it('se déconnecte par le bouton « Se déconnecter »', async () => {
    const page = await accueil((requete) =>
      requete.flush({ id: '0190f0a0-0000-7000-8000-000000000001', nomAffiche: 'Paul Roumy', administrateur: false }),
    );
    const bouton = [...page.querySelectorAll('button')].find((b) => b.textContent?.includes('Se déconnecter'));
    bouton?.click();
    expect(deconnecter).toHaveBeenCalledOnce();
  });
});
