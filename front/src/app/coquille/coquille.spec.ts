import { LiveAnnouncer } from '@angular/cdk/a11y';
import { BreakpointObserver } from '@angular/cdk/layout';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { of } from 'rxjs';
import { App } from '../app';
import { routes } from '../app.routes';
import { Authentification } from '../commun/authentification/authentification';
import { CompteCourant } from '../commun/compte-courant';
import { provideIcones } from '../commun/icones';

const ENSEIGNANTE = {
  id: '0190f0a0-0000-7000-8000-000000000002',
  nomAffiche: 'Claire Martin',
  email: 'claire@ecole.fr',
  administrateur: false,
};
const ADMINISTRATEUR = {
  id: '0190f0a0-0000-7000-8000-000000000001',
  nomAffiche: 'Paul Roumy',
  email: 'paul@ecole.fr',
  administrateur: true,
};

describe('Coquille', () => {
  const deconnecter = vi.fn(() => Promise.resolve());

  function configurer(...autres: Provider[]) {
    deconnecter.mockClear();
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideIcones(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
        { provide: Authentification, useValue: { deconnecter } },
        ...autres,
      ],
    });
  }

  const tour = () => new Promise((fin) => setTimeout(fin));

  /** Ouvre l'application sur `url` et sert `GET /api/mon-compte` (la navigation peut l'attendre : garde admin). */
  async function ouvrir(
    url: string,
    reponse: (requete: TestRequest) => void,
  ): Promise<ComponentFixture<App>> {
    // Préparations et Mon compte sont chargées à la demande : les importer d'avance garde à la navigation son nombre
    // de tours habituel.
    await Promise.all([import('../preparations/preparations'), import('../compte/mon-compte')]);
    const fixture = TestBed.createComponent(App);
    const navigation = TestBed.inject(Router).navigateByUrl(url);
    await tour();
    fixture.detectChanges();
    await tour();
    reponse(TestBed.inject(HttpTestingController).expectOne('/api/mon-compte'));
    await navigation;
    // La promesse du client généré se résout après la réponse : laisser passer un tour avant de rendre.
    await tour();
    await fixture.whenStable();
    return fixture;
  }

  const enCompte = (compte: typeof ENSEIGNANTE) => (requete: TestRequest) => requete.flush(compte);
  const page = (fixture: ComponentFixture<App>) => fixture.nativeElement as HTMLElement;
  const bouton = (racine: ParentNode, libelle: string) =>
    [...racine.querySelectorAll<HTMLElement>('button, a')].find(
      (element) =>
        element.getAttribute('aria-label')?.startsWith(libelle) ||
        element.textContent?.trim() === libelle,
    );
  const entreesDuMenu = () =>
    [...document.querySelectorAll('.mat-mdc-menu-panel .mat-mdc-menu-item')].map((entree) =>
      entree.textContent?.trim(),
    );

  async function ouvrirMenuDeProfil(fixture: ComponentFixture<App>): Promise<HTMLElement> {
    const declencheur = bouton(page(fixture), 'Menu de profil')!;
    declencheur.click();
    await fixture.whenStable();
    return declencheur;
  }

  afterEach(() =>
    document.querySelectorAll('.cdk-overlay-container').forEach((surcouche) => surcouche.remove()),
  );

  describe('sur ordinateur', () => {
    beforeEach(() => configurer());

    it('Enseignant : Menu de profil avec Mon compte, Mes données, Se déconnecter, sans Administration', async () => {
      const fixture = await ouvrir('/', enCompte(ENSEIGNANTE));
      const declencheur = await ouvrirMenuDeProfil(fixture);

      expect(declencheur.getAttribute('aria-label')).toBe('Menu de profil, Claire Martin');
      expect(declencheur.textContent?.trim()).toBe('C');
      expect(document.querySelector('.coquille__menu-nom')?.textContent?.trim()).toBe(
        'Claire Martin',
      );
      expect(entreesDuMenu()).toEqual(['Mon compte', 'Mes données', 'Se déconnecter']);
    });

    it('Administrateur : Administration avant Se déconnecter', async () => {
      const fixture = await ouvrir('/', enCompte(ADMINISTRATEUR));
      await ouvrirMenuDeProfil(fixture);

      expect(entreesDuMenu()).toEqual([
        'Mon compte',
        'Mes données',
        'Administration',
        'Se déconnecter',
      ]);
    });

    it('Se déconnecter ferme la session', async () => {
      const fixture = await ouvrir('/', enCompte(ENSEIGNANTE));
      await ouvrirMenuDeProfil(fixture);
      bouton(document, 'Se déconnecter')!.click();

      expect(deconnecter).toHaveBeenCalledOnce();
    });

    it('URL directe /administration sans le rôle : retour aux préparations', async () => {
      await ouvrir('/administration', enCompte(ENSEIGNANTE));

      expect(TestBed.inject(Router).url).toBe('/preparations');
    });

    it('URL directe /administration pour un administrateur : Administration › Comptes s’ouvre', async () => {
      const fixture = await ouvrir('/administration', enCompte(ADMINISTRATEUR));
      TestBed.inject(HttpTestingController).expectOne('/api/comptes').flush([]);
      await tour();
      await fixture.whenStable();

      expect(TestBed.inject(Router).url).toBe('/administration/comptes');
      expect(page(fixture).querySelector('h1')?.textContent).toContain('Comptes');
    });

    it('Recherche : Entrée ouvre la Banque filtrée sur le Mot, entrée Banque mise en évidence', async () => {
      const fixture = await ouvrir('/', enCompte(ENSEIGNANTE));
      const champ = page(fixture).querySelector<HTMLInputElement>('input[type="search"]')!;
      champ.value = '  galette ';
      champ.form!.requestSubmit();
      await tour();
      await fixture.whenStable();

      expect(TestBed.inject(Router).url).toBe('/banque?mot=galette');
      const banque = bouton(page(fixture), 'Banque')!;
      expect(banque.classList).toContain('coquille__rubrique--active');
      expect(banque.getAttribute('aria-current')).toBe('page');
      expect(bouton(page(fixture), 'Préparations')!.classList).not.toContain(
        'coquille__rubrique--active',
      );
    });

    it('Recherche vide : rien', async () => {
      const fixture = await ouvrir('/', enCompte(ENSEIGNANTE));
      const champ = page(fixture).querySelector<HTMLInputElement>('input[type="search"]')!;
      champ.value = '   ';
      champ.form!.requestSubmit();
      await tour();

      expect(TestBed.inject(Router).url).toBe('/preparations');
    });

    it('entrée courante en évidence, navigation de 248 px permanente, État vide de la rubrique', async () => {
      const fixture = await ouvrir('/', enCompte(ENSEIGNANTE));

      expect(TestBed.inject(Router).url).toBe('/preparations');
      expect(bouton(page(fixture), 'Préparations')!.classList).toContain(
        'coquille__rubrique--active',
      );
      expect(page(fixture).querySelector('mat-sidenav')?.classList).toContain('mat-drawer-side');
      TestBed.inject(HttpTestingController)
        .expectOne('/api/preparations?page=0&taille=100')
        .flush({ elements: [], total: 0 });
      await tour();
      await fixture.whenStable();
      expect(page(fixture).textContent).toContain('Pas encore de préparation.');
      expect(bouton(page(fixture), 'Rubriques')).toBeUndefined();
    });

    it('Bouton « + » : « Nouvelle préparation », puis « Ajouter une image » ; la première ouvre son dialogue', async () => {
      const fixture = await ouvrir('/', enCompte(ENSEIGNANTE));
      const plus = bouton(page(fixture), 'Ajouter')!;
      plus.click();
      await fixture.whenStable();

      expect(plus.getAttribute('aria-expanded')).toBe('true');
      expect(entreesDuMenu()).toEqual(['Nouvelle préparation', 'Ajouter une image']);
      expect(
        bouton(document, 'Ajouter une image')!
          .querySelector('mat-icon')
          ?.getAttribute('data-mat-icon-name'),
      ).toBe('image');

      bouton(document, 'Nouvelle préparation')!.click();
      // Le dialogue est chargé à la demande.
      await import('../preparations/nouvelle-preparation-dialogue');
      await tour();
      await fixture.whenStable();

      expect(document.querySelector('mat-dialog-container h2')?.textContent?.trim()).toBe(
        'Nouvelle préparation',
      );

      // « Annuler » : le focus revient au « + », pas à l'entrée de menu retirée du DOM.
      [...document.querySelectorAll<HTMLButtonElement>('mat-dialog-container button')]
        .find((element) => element.textContent?.trim() === 'Annuler')!
        .click();
      await tour();
      await fixture.whenStable();
      await tour();

      expect(document.querySelector('mat-dialog-container')).toBeNull();
      expect(document.activeElement).toBe(plus);
    });

    it('« Ajouter une image » : saisir « citrouille », enregistrer une image libre ; annonce, focus sur le « + »', async () => {
      const annonce = vi.spyOn(TestBed.inject(LiveAnnouncer), 'announce');
      const fixture = await ouvrir('/', enCompte(ENSEIGNANTE));
      const plus = bouton(page(fixture), 'Ajouter')!;
      plus.click();
      await fixture.whenStable();

      bouton(document, 'Ajouter une image')!.click();
      // Le dialogue est chargé à la demande.
      await import('../preparations/televerser-image-dialogue');
      await tour();
      await fixture.whenStable();
      const dialogue = document.querySelector<HTMLElement>('mat-dialog-container')!;
      expect(dialogue.querySelector('h2')?.textContent?.trim()).toBe('Téléverser une image');

      const mot = dialogue.querySelector<HTMLInputElement>('.televerser__saisie-mot')!;
      mot.value = 'citrouille';
      mot.dispatchEvent(new Event('input'));
      const selecteur = dialogue.querySelector<HTMLInputElement>('input[type="file"]')!;
      Object.defineProperty(selecteur, 'files', {
        value: [new File([new Uint8Array(4)], 'citrouille.png', { type: 'image/png' })],
      });
      const creer = URL.createObjectURL;
      const revoquer = URL.revokeObjectURL;
      URL.createObjectURL = vi.fn(() => 'blob:http://localhost/apercu');
      URL.revokeObjectURL = vi.fn();
      try {
        selecteur.dispatchEvent(new Event('change'));
        await fixture.whenStable();
        dialogue.querySelector<HTMLElement>('.televerser__type .mat-mdc-select-trigger')!.click();
        await tour();
        await fixture.whenStable();
        [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option')]
          .find((option) => option.textContent?.trim() === 'image libre')!
          .click();
        await tour();
        await fixture.whenStable();
        [...dialogue.querySelectorAll<HTMLButtonElement>('button')]
          .find((element) => element.textContent?.trim() === 'Enregistrer')!
          .click();
        await tour();

        const requete = TestBed.inject(HttpTestingController).expectOne('/api/images');
        expect((requete.request.body as FormData).get('mot')).toBe('citrouille');
        requete.flush(
          {
            id: '0190f0a0-0000-7000-8000-0000000c0002',
            proprietaireId: ENSEIGNANTE.id,
            etat: 'privee',
            aRemplacer: null,
            reutilisable: true,
            typeImage: 'image_libre',
            aCompleter: true,
            motId: '0190f0a0-0000-7000-8000-0000000e0001',
            forme: 'citrouille',
            sens: { id: '0190f0a0-0000-7000-8000-0000000d0001', libelle: 'à compléter' },
          },
          { status: 201, statusText: 'Created' },
        );
        await tour();
        await fixture.whenStable();
        await tour();
      } finally {
        URL.createObjectURL = creer;
        URL.revokeObjectURL = revoquer;
      }

      expect(document.querySelector('mat-dialog-container')).toBeNull();
      expect(annonce).toHaveBeenCalledWith(
        'Image enregistrée dans Mes mots pour « citrouille ».',
        'polite',
      );
      expect(document.activeElement).toBe(plus);
    });

    it('Notifications : « Aucune notification »', async () => {
      const fixture = await ouvrir('/', enCompte(ENSEIGNANTE));
      bouton(page(fixture), 'Notifications')!.click();
      await fixture.whenStable();

      expect(document.querySelector('.mat-mdc-menu-panel')?.textContent).toContain(
        'Aucune notification',
      );
    });

    it('Échap ferme le Menu de profil et rend le focus à son bouton', async () => {
      const fixture = await ouvrir('/', enCompte(ENSEIGNANTE));
      const declencheur = await ouvrirMenuDeProfil(fixture);
      const panneau = document.querySelector<HTMLElement>('.mat-mdc-menu-panel')!;

      const echap = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      Object.defineProperty(echap, 'keyCode', { get: () => 27 });
      panneau.dispatchEvent(echap);
      await tour();
      await fixture.whenStable();

      expect(document.querySelector('.mat-mdc-menu-panel')).toBeNull();
      expect(declencheur.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(declencheur);
    });

    it('ordre du DOM = ordre de lecture : évitement, marque, barre supérieure, rubriques, contenu', async () => {
      const fixture = await ouvrir('/mon-compte', enCompte(ENSEIGNANTE));
      const focalisables = [
        ...page(fixture).querySelectorAll<HTMLElement>(
          'a[href], button, input, [tabindex]:not([tabindex="-1"])',
        ),
      ].map(
        (element) =>
          element.getAttribute('aria-label') ??
          element.getAttribute('placeholder') ??
          (element instanceof HTMLInputElement
            ? element.labels?.[0]?.textContent?.trim()
            : element.textContent?.trim()),
      );

      expect(focalisables).toEqual([
        'Aller au contenu',
        'corpus-mots, accueil',
        'Chercher un mot',
        'Ajouter',
        'Notifications',
        'Menu de profil, Claire Martin',
        'Préparations',
        'Banque',
        'Fiches',
        'Nom affiché',
        'Enregistrer',
      ]);
    });

    it('après un renommage, le Menu de profil et l’avatar portent le nouveau nom sans recharger', async () => {
      const fixture = await ouvrir('/mon-compte', enCompte(ENSEIGNANTE));
      TestBed.inject(CompteCourant).mettreAJour({ ...ENSEIGNANTE, nomAffiche: 'Bruno Petit' });
      await tour();
      await fixture.whenStable();

      const declencheur = bouton(page(fixture), 'Menu de profil')!;
      expect(declencheur.getAttribute('aria-label')).toBe('Menu de profil, Bruno Petit');
      expect(page(fixture).querySelector('.coquille__avatar')?.textContent?.trim()).toBe('B');
      TestBed.inject(HttpTestingController).expectNone('/api/mon-compte');
    });

    it('le lien d’évitement donne le focus au contenu', async () => {
      const fixture = await ouvrir('/', enCompte(ENSEIGNANTE));
      bouton(page(fixture), 'Aller au contenu')!.click();

      expect(document.activeElement?.id).toBe('contenu');
      expect(TestBed.inject(Router).url).toBe('/preparations');
    });

    it('Compte inactif : page sans coquille, message et Se déconnecter', async () => {
      const fixture = await ouvrir('/', (requete) =>
        requete.flush(
          { status: 403, code: 'compte.inconnu_ou_inactif' },
          { status: 403, statusText: 'Forbidden' },
        ),
      );

      expect(page(fixture).querySelector('.coquille')).toBeNull();
      expect(page(fixture).querySelector('[role="alert"]')?.textContent?.trim()).toBe(
        "Votre compte n'est pas actif. Adressez-vous à l'administrateur de l'école.",
      );
      bouton(page(fixture), 'Se déconnecter')!.click();
      expect(deconnecter).toHaveBeenCalledOnce();
    });

    it('Autre échec de mon-compte : page sans coquille, « Rechargez la page »', async () => {
      const fixture = await ouvrir('/', (requete) =>
        requete.flush(null, { status: 500, statusText: 'Server Error' }),
      );

      expect(page(fixture).querySelector('.coquille')).toBeNull();
      expect(page(fixture).querySelector('[role="alert"]')?.textContent?.trim()).toBe(
        "Votre compte n'a pas pu être chargé. Rechargez la page.",
      );
      bouton(page(fixture), 'Se déconnecter')!.click();
      expect(deconnecter).toHaveBeenCalledOnce();
    });

    it('Échec réseau de mon-compte : même page', async () => {
      const fixture = await ouvrir('/', (requete) => requete.error(new ProgressEvent('error')));

      expect(page(fixture).querySelector('[role="alert"]')?.textContent).toContain(
        'Rechargez la page.',
      );
    });
  });

  describe('sur téléphone (< 600 px)', () => {
    beforeEach(() =>
      configurer({
        provide: BreakpointObserver,
        useValue: { observe: () => of({ matches: true, breakpoints: {} }) },
      }),
    );

    it('navigation repliée, ouverte par le bouton « Rubriques »', async () => {
      const fixture = await ouvrir('/', enCompte(ENSEIGNANTE));
      const navigation = page(fixture).querySelector('mat-sidenav')!;
      const rubriques = bouton(page(fixture), 'Rubriques')!;

      expect(navigation.classList).toContain('mat-drawer-over');
      expect(navigation.classList).not.toContain('mat-drawer-opened');
      expect(rubriques.getAttribute('aria-expanded')).toBe('false');

      rubriques.click();
      await tour();
      await fixture.whenStable();

      expect(navigation.classList).toContain('mat-drawer-opened');
      expect(rubriques.getAttribute('aria-expanded')).toBe('true');
    });

    it('choisir une rubrique referme la navigation', async () => {
      const fixture = await ouvrir('/', enCompte(ENSEIGNANTE));
      const navigation = page(fixture).querySelector('mat-sidenav')!;
      const rubriques = bouton(page(fixture), 'Rubriques')!;
      rubriques.click();
      await tour();
      await fixture.whenStable();

      bouton(page(fixture), 'Banque')!.click();
      await tour();
      await fixture.whenStable();

      expect(navigation.classList).not.toContain('mat-drawer-opened');
      expect(rubriques.getAttribute('aria-expanded')).toBe('false');
      expect(TestBed.inject(Router).url).toBe('/banque');
    });
  });
});
