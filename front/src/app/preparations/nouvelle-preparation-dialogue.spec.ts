import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter, Router } from '@angular/router';
import { AlbumDto } from '../api/models/album-dto';
import { PreparationDto } from '../api/models/preparation-dto';
import { provideIcones } from '../commun/icones';
import { NouvellePreparation } from './nouvelle-preparation';
import { DELAI_RECHERCHE_ALBUMS_MS, libelleModules } from './nouvelle-preparation-dialogue';

@Component({ template: '' })
class PageVide {}

const ROULE_GALETTE: AlbumDto = {
  id: '0190f0a0-0000-7000-8000-00000000a001',
  titre: 'La Roule Galette',
  auteur: 'Natha Caputo',
  nombreModules: 2,
};
const MODULES = [
  {
    id: '0190f0a0-0000-7000-8000-00000000b001',
    albumId: ROULE_GALETTE.id,
    nom: 'Module 1',
    ordre: 1,
  },
  {
    id: '0190f0a0-0000-7000-8000-00000000b002',
    albumId: ROULE_GALETTE.id,
    nom: 'Module 2',
    ordre: 2,
  },
];
const CUISINE = { id: '0190f0a0-0000-7000-8000-00000000c001', nom: 'cuisine' };
const CREEE: PreparationDto = {
  id: '0190f0a0-0000-7000-8000-00000000d001',
  albumId: ROULE_GALETTE.id,
  titreAlbum: ROULE_GALETTE.titre,
  section: 'ms',
  moduleId: MODULES[0].id,
  nomModule: 'Module 1',
  nombreMots: 0,
  nombreIllustres: 0,
  creeLe: '2026-11-09T10:00:00Z',
};

describe('Dialogue « Nouvelle préparation »', () => {
  let serveur: HttpTestingController;
  let declencheur: HTMLButtonElement;
  let ouverture: Promise<void>;

  const tour = () => new Promise((fin) => setTimeout(fin));
  const attendre = (ms: number) => new Promise((fin) => setTimeout(fin, ms));

  async function stabiliser() {
    await tour();
    await TestBed.inject(ApplicationRef).whenStable();
    await tour();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'preparations/:id', component: PageVide }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideIcones(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
    serveur = TestBed.inject(HttpTestingController);
    declencheur = document.createElement('button');
    declencheur.textContent = 'Ajouter';
    document.body.appendChild(declencheur);
  });

  afterEach(() => {
    serveur.verify();
    declencheur.remove();
    document.querySelectorAll('.cdk-overlay-container').forEach((surcouche) => surcouche.remove());
  });

  /** Ouvre le dialogue et sert la dernière Section et les Thèmes. */
  async function ouvrir(derniereSection: 'ps' | 'ms' | 'gs' | null = null, themes = [CUISINE]) {
    declencheur.focus();
    ouverture = TestBed.inject(NouvellePreparation).ouvrir(declencheur);
    await import('./nouvelle-preparation-dialogue');
    await stabiliser();
    serveur.expectOne('/api/preparations/derniere-section').flush({ section: derniereSection });
    serveur.expectOne('/api/themes').flush(themes);
    await stabiliser();
  }

  const dialogue = () => document.querySelector<HTMLElement>('mat-dialog-container');
  const bouton = (libelle: string) =>
    [...document.querySelectorAll<HTMLButtonElement>('mat-dialog-container button')].find(
      (element) => element.textContent?.trim() === libelle,
    )!;
  const champAlbum = () => dialogue()!.querySelector<HTMLInputElement>('input[matinput]')!;
  const sectionChoisie = () =>
    [...dialogue()!.querySelectorAll('mat-button-toggle')]
      .filter((choix) => choix.classList.contains('mat-button-toggle-checked'))
      .map((choix) => choix.textContent?.trim());
  const etiquettes = () =>
    [...dialogue()!.querySelectorAll('mat-form-field mat-label')].map((label) =>
      label.textContent?.trim(),
    );
  const options = () =>
    [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option')].map((option) =>
      option.textContent?.replace(/\s+/g, ' ').trim(),
    );
  const option = (texte: string) =>
    [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option')].find((element) =>
      element.textContent?.includes(texte),
    )!;

  /** Tape `texte` dans le champ Album et attend la fin du délai de frappe. */
  async function taper(texte: string) {
    champAlbum().focus();
    champAlbum().value = texte;
    champAlbum().dispatchEvent(new Event('input'));
    await attendre(DELAI_RECHERCHE_ALBUMS_MS + 50);
    await stabiliser();
  }

  async function choisirRouleGalette() {
    await taper('la roule');
    serveur
      .expectOne('/api/albums?recherche=la%20roule&taille=20')
      .flush({ elements: [ROULE_GALETTE], total: 1 });
    await stabiliser();
    option('La Roule Galette').click();
    await stabiliser();
    serveur.expectOne(`/api/albums/${ROULE_GALETTE.id}/modules`).flush(MODULES);
    await stabiliser();
  }

  async function choisirSection(libelle: string) {
    [...dialogue()!.querySelectorAll<HTMLElement>('mat-button-toggle button')]
      .find((choix) => choix.textContent?.trim() === libelle)!
      .click();
    await stabiliser();
  }

  async function ouvrirListe(etiquette: string) {
    const champ = [...dialogue()!.querySelectorAll('mat-form-field')].find(
      (element) => element.querySelector('mat-label')?.textContent?.trim() === etiquette,
    )!;
    champ.querySelector<HTMLElement>('.mat-mdc-select-trigger')!.click();
    await stabiliser();
  }

  it('sans Préparation : Section vide, « Créer » désactivé, Album et Thème par défaut proposés', async () => {
    await ouvrir(null);

    expect(dialogue()?.querySelector('h2')?.textContent?.trim()).toBe('Nouvelle préparation');
    expect(sectionChoisie()).toEqual([]);
    expect(etiquettes()).toEqual(['Album', 'Thème par défaut (facultatif)']);
    expect(bouton('Créer').disabled).toBe(true);
    bouton('Annuler').click();
    await ouverture;
  });

  it('dernière Préparation en MS : MS présélectionné', async () => {
    await ouvrir('ms');

    expect(sectionChoisie()).toEqual(['MS']);
    bouton('Annuler').click();
    await ouverture;
  });

  it('aucun Thème dans l’école : le champ Thème par défaut est masqué', async () => {
    await ouvrir(null, []);

    expect(etiquettes()).toEqual(['Album']);
    bouton('Annuler').click();
    await ouverture;
  });

  it('moins de 2 caractères : aucune recherche', async () => {
    await ouvrir();
    await taper('r');

    serveur.expectNone((requete) => requete.url.startsWith('/api/albums'));
    bouton('Annuler').click();
    await ouverture;
  });

  it('recherche pendant la frappe : titre et « n modules » ; sinon « Aucun album trouvé »', async () => {
    await ouvrir();
    await taper('roule gal');
    serveur
      .expectOne('/api/albums?recherche=roule%20gal&taille=20')
      .flush({ elements: [ROULE_GALETTE], total: 1 });
    await stabiliser();

    expect(options()).toHaveLength(1);
    expect(
      option('La Roule Galette').querySelector('.nouvelle-preparation__titre')?.textContent,
    ).toBe('La Roule Galette');
    expect(
      option('La Roule Galette').querySelector('.nouvelle-preparation__modules')?.textContent,
    ).toBe('2 modules');

    await taper('zzz');
    serveur.expectOne('/api/albums?recherche=zzz&taille=20').flush({ elements: [], total: 0 });
    await stabiliser();

    expect(options()).toEqual(['Aucun album trouvé']);
    bouton('Annuler').click();
    await ouverture;
  });

  it('un Album à Modules : la liste Module les donne dans leur ordre, après « Aucun module »', async () => {
    await ouvrir();
    await choisirRouleGalette();

    expect(etiquettes()).toEqual(['Album', 'Module (facultatif)', 'Thème par défaut (facultatif)']);
    await ouvrirListe('Module (facultatif)');
    expect(options()).toEqual(['Aucun module', 'Module 1', 'Module 2']);
    option('Module 2').click();
    await stabiliser();
    bouton('Annuler').click();
    await ouverture;
  });

  it('« Créer » : crée la Préparation, ouvre sa page et rend le focus au déclencheur', async () => {
    await ouvrir();
    await choisirRouleGalette();
    expect(bouton('Créer').disabled).toBe(true);
    await choisirSection('MS');
    await ouvrirListe('Module (facultatif)');
    option('Module 1').click();
    await stabiliser();
    await ouvrirListe('Thème par défaut (facultatif)');
    option('cuisine').click();
    await stabiliser();

    expect(bouton('Créer').disabled).toBe(false);
    bouton('Créer').click();
    await stabiliser();
    const creation = serveur.expectOne({ method: 'POST', url: '/api/preparations' });
    // Pendant la création, « Annuler » est désactivé et Échap ne ferme pas le dialogue.
    expect(bouton('Annuler').disabled).toBe(true);
    const echap = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    Object.defineProperty(echap, 'keyCode', { get: () => 27 });
    dialogue()!.dispatchEvent(echap);
    await stabiliser();
    expect(dialogue()).not.toBeNull();
    expect(creation.request.body).toEqual({
      albumId: ROULE_GALETTE.id,
      section: 'ms',
      moduleId: MODULES[0].id,
      themeDefautId: CUISINE.id,
    });
    creation.flush(CREEE, { status: 201, statusText: 'Created' });
    await ouverture;
    await stabiliser();

    expect(dialogue()).toBeNull();
    expect(TestBed.inject(Router).url).toBe(`/preparations/${CREEE.id}`);
    expect(document.activeElement).toBe(declencheur);
  });

  it('échec de la création : message traduit dans le dialogue, « Réessayer » recrée', async () => {
    await ouvrir('gs');
    await choisirRouleGalette();
    bouton('Créer').click();
    serveur
      .expectOne({ method: 'POST', url: '/api/preparations' })
      .flush(
        { status: 400, code: 'preparation.album_introuvable' },
        { status: 400, statusText: 'Bad Request' },
      );
    await stabiliser();

    expect(
      dialogue()?.querySelector('app-bandeau-erreur [role="alert"]')?.textContent?.trim(),
    ).toBe("Cet album n'existe plus. Choisissez-en un autre.");
    bouton('Réessayer').click();
    const nouvelEssai = serveur.expectOne({ method: 'POST', url: '/api/preparations' });
    expect(nouvelEssai.request.body).toEqual({ albumId: ROULE_GALETTE.id, section: 'gs' });
    nouvelEssai.flush({ ...CREEE, section: 'gs', moduleId: undefined, nomModule: undefined });
    await ouverture;

    expect(TestBed.inject(Router).url).toBe(`/preparations/${CREEE.id}`);
  });

  it('taper dans le champ Album après un choix défait ce choix', async () => {
    await ouvrir('ms');
    await choisirRouleGalette();
    expect(bouton('Créer').disabled).toBe(false);

    await taper('loup');
    serveur.expectOne('/api/albums?recherche=loup&taille=20').flush({ elements: [], total: 0 });
    await stabiliser();

    expect(bouton('Créer').disabled).toBe(true);
    expect(etiquettes()).not.toContain('Module (facultatif)');
    bouton('Annuler').click();
    await ouverture;
  });

  it('deux appels rapprochés n’ouvrent qu’un dialogue', async () => {
    const service = TestBed.inject(NouvellePreparation);
    ouverture = service.ouvrir(declencheur);
    // Second appel avant la fin du chargement du dialogue : ignoré, il rend la main aussitôt.
    await service.ouvrir(declencheur);
    await import('./nouvelle-preparation-dialogue');
    await stabiliser();
    serveur.expectOne('/api/preparations/derniere-section').flush({ section: null });
    serveur.expectOne('/api/themes').flush([]);
    await stabiliser();

    expect(document.querySelectorAll('mat-dialog-container')).toHaveLength(1);
    bouton('Annuler').click();
    await ouverture;
  });

  it('« Annuler » : rien n’est créé, le focus revient au déclencheur', async () => {
    await ouvrir();
    bouton('Annuler').click();
    await ouverture;
    await stabiliser();

    expect(dialogue()).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/');
    expect(document.activeElement).toBe(declencheur);
  });

  it('libellé du nombre de Modules', () => {
    expect([0, 1, 3].map(libelleModules)).toEqual(['0 modules', '1 module', '3 modules']);
  });
});
