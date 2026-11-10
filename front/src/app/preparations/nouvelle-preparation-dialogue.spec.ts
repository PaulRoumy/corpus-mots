import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter, Router } from '@angular/router';
import { AlbumDto } from '../api/models/album-dto';
import { PreparationDto } from '../api/models/preparation-dto';
import { ThemeDto } from '../api/models/theme-dto';
import { MESSAGE_RESEAU } from '../commun/erreurs/message-erreur';
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
  async function ouvrir(
    derniereSection: 'ps' | 'ms' | 'gs' | null = null,
    themes: ThemeDto[] | 'echec' = [CUISINE],
  ) {
    declencheur.focus();
    ouverture = TestBed.inject(NouvellePreparation).ouvrir(declencheur);
    await import('./nouvelle-preparation-dialogue');
    await stabiliser();
    serveur.expectOne('/api/preparations/derniere-section').flush({ section: derniereSection });
    const requeteThemes = serveur.expectOne('/api/themes');
    if (themes === 'echec') {
      requeteThemes.error(new ProgressEvent('error'));
    } else {
      requeteThemes.flush(themes);
    }
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

  const saisieThemes = () =>
    dialogue()!.querySelector<HTMLInputElement>('app-champ-themes input')!;
  const etiquettesThemes = () =>
    [...dialogue()!.querySelectorAll('app-champ-themes mat-chip-row')].map((puce) =>
      puce.querySelector('.mdc-evolution-chip__text-label')?.textContent?.trim(),
    );

  /** Touche au clavier, avec le `keyCode` que lisent les composants Material. */
  function toucheClavier(cible: HTMLElement, key: string, keyCode: number) {
    const evenement = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    Object.defineProperty(evenement, 'keyCode', { get: () => keyCode });
    cible.dispatchEvent(evenement);
  }

  async function taperTheme(texte: string) {
    saisieThemes().focus();
    saisieThemes().value = texte;
    saisieThemes().dispatchEvent(new Event('input'));
    await stabiliser();
  }

  /** Tape `texte` dans le Champ à étiquettes et choisit au clavier la proposition mise en avant. */
  async function choisirThemeAuClavier(texte: string) {
    await taperTheme(texte);
    toucheClavier(saisieThemes(), 'Enter', 13);
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

  it('aucun Thème dans l’école : le Champ à étiquettes reste, pour en créer un', async () => {
    await ouvrir(null, []);

    expect(etiquettes()).toEqual(['Album', 'Thème par défaut (facultatif)']);
    expect(etiquettesThemes()).toEqual([]);
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

    expect(options()).toEqual(['La Roule Galette2 modules', "Créer l'album « roule gal »"]);
    expect(
      option('La Roule Galette').querySelector('.nouvelle-preparation__titre')?.textContent,
    ).toBe('La Roule Galette');
    expect(
      option('La Roule Galette').querySelector('.nouvelle-preparation__modules')?.textContent,
    ).toBe('2 modules');

    await taper('zzz');
    serveur.expectOne('/api/albums?recherche=zzz&taille=20').flush({ elements: [], total: 0 });
    await stabiliser();

    expect(options()).toEqual(['Aucun album trouvé', "Créer l'album « zzz »"]);
    bouton('Annuler').click();
    await ouverture;
  });

  it('un Album à Modules : la liste Module les donne dans leur ordre, après « Aucun module »', async () => {
    await ouvrir();
    await choisirRouleGalette();

    expect(etiquettes()).toEqual(['Album', 'Module (facultatif)', 'Thème par défaut (facultatif)']);
    await ouvrirListe('Module (facultatif)');
    expect(options()).toEqual(['Aucun module', 'Module 1', 'Module 2', 'Nouveau module']);
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
    await choisirThemeAuClavier('cuis');
    expect(etiquettesThemes()).toEqual(['cuisine']);

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

  // Story 2.1, partie 2 : « Créer l'album » et titres proches.

  const LA_MOUFLE: AlbumDto = {
    id: '0190f0a0-0000-7000-8000-00000000a002',
    titre: 'La Moufle',
    auteur: 'Jan Brett',
    editeur: "L'école des loisirs",
    nombreModules: 0,
  };

  const volet = () => dialogue()!.querySelector<HTMLElement>('.nouvelle-preparation__volet');
  const boutonVolet = (libelle: string) =>
    [...volet()!.querySelectorAll<HTMLButtonElement>('button')].find(
      (element) => element.textContent?.trim() === libelle,
    )!;
  /** Bouton des actions du dialogue (hors volet). */
  const boutonDialogue = (libelle: string) =>
    [...document.querySelectorAll<HTMLButtonElement>('mat-dialog-actions button')].find(
      (element) => element.textContent?.trim() === libelle,
    )!;
  const champ = (etiquette: string) =>
    [...dialogue()!.querySelectorAll('mat-form-field')]
      .find((element) => element.querySelector('mat-label')?.textContent?.trim() === etiquette)!
      .querySelector<HTMLInputElement>('input')!;
  const proches = () =>
    [
      ...volet()!.querySelectorAll('.nouvelle-preparation__proche .nouvelle-preparation__titre'),
    ].map((element) => element.textContent?.replace(/\s+/g, ' ').trim());
  const bandeau = (source: string) =>
    dialogue()!.querySelector<HTMLElement>(`.nouvelle-preparation__erreur--${source}`);
  const messageBandeau = (source: string) =>
    bandeau(source)?.querySelector('[role="alert"]')?.textContent?.trim();
  const reessayer = async (source: string) => {
    [...bandeau(source)!.querySelectorAll<HTMLButtonElement>('button')]
      .find((element) => element.textContent?.trim() === 'Réessayer')!
      .click();
    await stabiliser();
  };

  async function saisir(element: HTMLInputElement, texte: string) {
    element.value = texte;
    element.dispatchEvent(new Event('input'));
    await stabiliser();
  }

  const urlProches = (titre: string) =>
    `/api/albums/titres-proches?titre=${encodeURIComponent(titre)}`;

  /** Tape `texte`, sert la recherche (sans résultat par défaut) et choisit « Créer l'album « texte » ». */
  async function ouvrirVolet(texte: string, trouves: AlbumDto[] = []) {
    await taper(texte);
    serveur
      .expectOne(`/api/albums?recherche=${encodeURIComponent(texte)}&taille=20`)
      .flush({ elements: trouves, total: trouves.length });
    await stabiliser();
    option("Créer l'album").click();
    await stabiliser();
  }

  it('« Créer l’album » : dernière option, après « Aucun album trouvé », avec le pictogramme plus', async () => {
    await ouvrir();
    await taper('la moufle');
    serveur
      .expectOne('/api/albums?recherche=la%20moufle&taille=20')
      .flush({ elements: [], total: 0 });
    await stabiliser();

    expect(options()).toEqual(['Aucun album trouvé', "Créer l'album « la moufle »"]);
    const creer = option("Créer l'album");
    expect(creer.classList).toContain('nouvelle-preparation__creer');
    expect(creer.querySelector('mat-icon')?.getAttribute('data-mat-icon-name')).toBe('plus');
    bouton('Annuler').click();
    await ouverture;
  });

  it('« Créer l’album » est proposé dès 2 caractères, avant même la réponse de la recherche', async () => {
    await ouvrir();
    champAlbum().focus();
    await saisir(champAlbum(), 'mo');

    expect(options()).toEqual(["Créer l'album « mo »"]);
    await attendre(DELAI_RECHERCHE_ALBUMS_MS + 50);
    serveur.expectOne('/api/albums?recherche=mo&taille=20').flush({ elements: [], total: 0 });
    await stabiliser();
    bouton('Annuler').click();
    await ouverture;
  });

  it('le volet s’ouvre dans le dialogue, Titre prérempli et focus dans le Titre', async () => {
    await ouvrir('ms');
    await ouvrirVolet('La Moufle');
    serveur.expectOne(urlProches('La Moufle')).flush([]);
    await stabiliser();

    expect(document.querySelectorAll('mat-dialog-container')).toHaveLength(1);
    expect(volet()?.querySelector('h3')?.textContent?.trim()).toBe("Créer l'album");
    expect(etiquettes()).toEqual([
      'Titre',
      'Auteur',
      'Éditeur (facultatif)',
      'Thème par défaut (facultatif)',
    ]);
    expect(champ('Titre').value).toBe('La Moufle');
    expect(document.activeElement).toBe(champ('Titre'));
    expect(volet()!.textContent).not.toContain('Albums au titre proche');
    // Titre seul : « Créer l'album » attend l'auteur ; « Créer » reste désactivé, aucun Album n'étant choisi.
    expect(boutonVolet("Créer l'album").disabled).toBe(true);
    expect(bouton('Créer').disabled).toBe(true);
    await saisir(champ('Auteur'), 'Jan Brett');
    expect(boutonVolet("Créer l'album").disabled).toBe(false);
    await saisir(champ('Titre'), '  ');
    expect(boutonVolet("Créer l'album").disabled).toBe(true);
    await attendre(DELAI_RECHERCHE_ALBUMS_MS + 50);
    await stabiliser();
    boutonVolet('Annuler').click();
    await stabiliser();
    bouton('Annuler').click();
    await ouverture;
  });

  it('titres proches : listés sous « Albums au titre proche », rechargés quand le titre change', async () => {
    await ouvrir();
    await ouvrirVolet('La roule galette');
    serveur.expectOne(urlProches('La roule galette')).flush([ROULE_GALETTE]);
    await stabiliser();

    expect(volet()!.querySelector('h4')?.textContent?.trim()).toBe('Albums au titre proche');
    expect(proches()).toEqual(['La Roule Galette Natha Caputo']);

    await saisir(champ('Titre'), 'La roule galette 2');
    await attendre(DELAI_RECHERCHE_ALBUMS_MS + 50);
    await stabiliser();
    serveur.expectOne(urlProches('La roule galette 2')).flush([]);
    await stabiliser();

    expect(volet()!.textContent).not.toContain('Albums au titre proche');
    boutonVolet('Annuler').click();
    await stabiliser();
    bouton('Annuler').click();
    await ouverture;
  });

  it('« Choisir cet album » sélectionne l’Album proche sans rien créer', async () => {
    await ouvrir('ms');
    await ouvrirVolet('La roule galette');
    serveur.expectOne(urlProches('La roule galette')).flush([ROULE_GALETTE]);
    await stabiliser();

    boutonVolet('Choisir cet album').click();
    await stabiliser();
    serveur.expectOne(`/api/albums/${ROULE_GALETTE.id}/modules`).flush(MODULES);
    await stabiliser();

    serveur.expectNone({ method: 'POST', url: '/api/albums' });
    expect(volet()).toBeNull();
    expect(champAlbum().value).toBe('La Roule Galette');
    expect(document.activeElement).toBe(champAlbum());
    expect(etiquettes()).toContain('Module (facultatif)');
    expect(bouton('Créer').disabled).toBe(false);
    bouton('Annuler').click();
    await ouverture;
  });

  it('« Créer l’album » crée l’Album, le choisit, puis la Préparation se crée avec lui', async () => {
    await ouvrir('gs');
    await ouvrirVolet('La Moufle');
    serveur.expectOne(urlProches('La Moufle')).flush([ROULE_GALETTE]);
    await stabiliser();
    await saisir(champ('Auteur'), ' Jan Brett ');
    await saisir(champ('Éditeur (facultatif)'), "L'école des loisirs");

    boutonVolet("Créer l'album").click();
    await stabiliser();
    const creation = serveur.expectOne({ method: 'POST', url: '/api/albums' });
    expect(boutonVolet("Créer l'album").disabled).toBe(true);
    // Pendant la création, ni « Annuler », ni « Choisir cet album », ni Échap.
    expect(boutonVolet('Annuler').disabled).toBe(true);
    expect(boutonDialogue('Annuler').disabled).toBe(true);
    expect(boutonVolet('Choisir cet album').disabled).toBe(true);
    const echap = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    Object.defineProperty(echap, 'keyCode', { get: () => 27 });
    dialogue()!.dispatchEvent(echap);
    await stabiliser();
    expect(dialogue()).not.toBeNull();
    expect(volet()).not.toBeNull();
    expect(creation.request.body).toEqual({
      titre: 'La Moufle',
      auteur: 'Jan Brett',
      editeur: "L'école des loisirs",
    });
    creation.flush(LA_MOUFLE, { status: 201, statusText: 'Created' });
    await stabiliser();
    serveur.expectOne(`/api/albums/${LA_MOUFLE.id}/modules`).flush([]);
    await stabiliser();

    expect(volet()).toBeNull();
    expect(champAlbum().value).toBe('La Moufle');
    expect(document.activeElement).toBe(champAlbum());
    expect(bouton('Créer').disabled).toBe(false);
    bouton('Créer').click();
    const preparation = serveur.expectOne({ method: 'POST', url: '/api/preparations' });
    expect(preparation.request.body).toEqual({ albumId: LA_MOUFLE.id, section: 'gs' });
    preparation.flush({ ...CREEE, albumId: LA_MOUFLE.id, titreAlbum: LA_MOUFLE.titre });
    await ouverture;

    expect(TestBed.inject(Router).url).toBe(`/preparations/${CREEE.id}`);
  });

  it('Album déjà existant (409) : message traduit dans le volet et titres proches rechargés', async () => {
    await ouvrir();
    await ouvrirVolet('LA MOUFLE');
    serveur.expectOne(urlProches('LA MOUFLE')).flush([]);
    await stabiliser();
    await saisir(champ('Auteur'), 'jan brett');

    boutonVolet("Créer l'album").click();
    await stabiliser();
    serveur
      .expectOne({ method: 'POST', url: '/api/albums' })
      .flush({ status: 409, code: 'album.deja_existant' }, { status: 409, statusText: 'Conflict' });
    await stabiliser();
    serveur.expectOne(urlProches('LA MOUFLE')).flush([LA_MOUFLE]);
    await stabiliser();

    expect(
      volet()!
        .querySelector('.nouvelle-preparation__erreur--album [role="alert"]')
        ?.textContent?.trim(),
    ).toBe('Cet album existe déjà. Choisissez-le dans la liste des albums au titre proche.');
    expect(proches()).toEqual(['La Moufle Jan Brett']);
    expect(bandeau('creation')).toBeNull();

    // Un doublon échouerait à l'identique : « Réessayer » n'envoie rien et efface le message.
    await reessayer('album');
    serveur.expectNone({ method: 'POST', url: '/api/albums' });
    expect(bandeau('album')).toBeNull();
    boutonVolet('Annuler').click();
    await stabiliser();
    bouton('Annuler').click();
    await ouverture;
  });

  it('échec réseau de la création d’Album : message traduit, « Réessayer » renvoie la même création', async () => {
    await ouvrir();
    await ouvrirVolet('La Moufle');
    serveur.expectOne(urlProches('La Moufle')).flush([]);
    await stabiliser();
    await saisir(champ('Auteur'), 'Jan Brett');

    boutonVolet("Créer l'album").click();
    await stabiliser();
    const corps = { titre: 'La Moufle', auteur: 'Jan Brett' };
    const creation = serveur.expectOne({ method: 'POST', url: '/api/albums' });
    expect(creation.request.body).toEqual(corps);
    creation.error(new ProgressEvent('error'));
    await stabiliser();

    expect(messageBandeau('album')).toBe(MESSAGE_RESEAU);
    serveur.expectNone((requete) => requete.url.startsWith('/api/albums/titres-proches'));
    await reessayer('album');
    const nouvelEssai = serveur.expectOne({ method: 'POST', url: '/api/albums' });
    expect(nouvelEssai.request.body).toEqual(corps);
    nouvelEssai.flush(LA_MOUFLE, { status: 201, statusText: 'Created' });
    await stabiliser();
    serveur.expectOne(`/api/albums/${LA_MOUFLE.id}/modules`).flush([]);
    await stabiliser();

    expect(volet()).toBeNull();
    expect(champAlbum().value).toBe('La Moufle');
    bouton('Annuler').click();
    await ouverture;
  });

  it('échec des titres proches : message traduit dans le volet, « Réessayer » redemande le même titre', async () => {
    await ouvrir();
    await ouvrirVolet('La Moufle');
    serveur.expectOne(urlProches('La Moufle')).error(new ProgressEvent('error'));
    await stabiliser();

    expect(messageBandeau('titres-proches')).toBe(MESSAGE_RESEAU);
    await reessayer('titres-proches');
    serveur.expectOne(urlProches('La Moufle')).flush([LA_MOUFLE]);
    await stabiliser();

    expect(bandeau('titres-proches')).toBeNull();
    expect(proches()).toEqual(['La Moufle Jan Brett']);
    boutonVolet('Annuler').click();
    await stabiliser();
    bouton('Annuler').click();
    await ouverture;
  });

  it('« Annuler » du volet : rien n’est créé, le volet se replie, le focus revient au champ Album', async () => {
    await ouvrir();
    await ouvrirVolet('La Moufle');
    serveur.expectOne(urlProches('La Moufle')).flush([]);
    await stabiliser();
    await saisir(champ('Auteur'), 'Jan Brett');

    boutonVolet('Annuler').click();
    await stabiliser();

    serveur.expectNone({ method: 'POST', url: '/api/albums' });
    expect(volet()).toBeNull();
    expect(champAlbum().value).toBe('La Moufle');
    expect(document.activeElement).toBe(champAlbum());
    expect(bouton('Créer').disabled).toBe(true);
    bouton('Annuler').click();
    await ouverture;
  });

  // Erreurs par source (report de la revue de la partie 1).

  it('échec de la recherche : message traduit, « Réessayer » relance la même recherche', async () => {
    await ouvrir();
    await taper('roule');
    serveur.expectOne('/api/albums?recherche=roule&taille=20').error(new ProgressEvent('error'));
    await stabiliser();

    expect(messageBandeau('recherche')).toBe(MESSAGE_RESEAU);
    await reessayer('recherche');
    serveur
      .expectOne('/api/albums?recherche=roule&taille=20')
      .flush({ elements: [ROULE_GALETTE], total: 1 });
    await stabiliser();

    expect(bandeau('recherche')).toBeNull();
    bouton('Annuler').click();
    await ouverture;
  });

  it('« Réessayer » d’une recherche dont le texte a changé ne relance rien', async () => {
    await ouvrir();
    await taper('roule');
    serveur.expectOne('/api/albums?recherche=roule&taille=20').error(new ProgressEvent('error'));
    await stabiliser();
    await taper('r');

    await reessayer('recherche');

    serveur.expectNone((requete) => requete.url.startsWith('/api/albums'));
    expect(bandeau('recherche')).toBeNull();
    bouton('Annuler').click();
    await ouverture;
  });

  it('échec des Thèmes : message traduit, une recherche réussie ne l’efface pas, « Réessayer » recharge', async () => {
    await ouvrir(null, 'echec');

    expect(messageBandeau('themes')).toBe(MESSAGE_RESEAU);
    await taper('roule');
    serveur
      .expectOne('/api/albums?recherche=roule&taille=20')
      .flush({ elements: [ROULE_GALETTE], total: 1 });
    await stabiliser();
    expect(messageBandeau('themes')).toBe(MESSAGE_RESEAU);

    await reessayer('themes');
    serveur.expectOne('/api/themes').flush([CUISINE]);
    await stabiliser();

    expect(bandeau('themes')).toBeNull();
    expect(etiquettes()).toContain('Thème par défaut (facultatif)');
    bouton('Annuler').click();
    await ouverture;
  });

  it('échec des Modules : message traduit, « Réessayer » recharge les Modules du même Album', async () => {
    await ouvrir();
    await taper('la roule');
    serveur
      .expectOne('/api/albums?recherche=la%20roule&taille=20')
      .flush({ elements: [ROULE_GALETTE], total: 1 });
    await stabiliser();
    option('La Roule Galette').click();
    await stabiliser();
    serveur.expectOne(`/api/albums/${ROULE_GALETTE.id}/modules`).error(new ProgressEvent('error'));
    await stabiliser();

    expect(messageBandeau('modules')).toBe(MESSAGE_RESEAU);
    await reessayer('modules');
    serveur.expectOne(`/api/albums/${ROULE_GALETTE.id}/modules`).flush(MODULES);
    await stabiliser();

    expect(bandeau('modules')).toBeNull();
    expect(etiquettes()).toContain('Module (facultatif)');
    bouton('Annuler').click();
    await ouverture;
  });

  it('« Réessayer » des Modules après avoir quitté l’Album ne charge rien', async () => {
    await ouvrir();
    await taper('la roule');
    serveur
      .expectOne('/api/albums?recherche=la%20roule&taille=20')
      .flush({ elements: [ROULE_GALETTE], total: 1 });
    await stabiliser();
    option('La Roule Galette').click();
    await stabiliser();
    serveur.expectOne(`/api/albums/${ROULE_GALETTE.id}/modules`).error(new ProgressEvent('error'));
    await stabiliser();
    await taper('loup');
    serveur.expectOne('/api/albums?recherche=loup&taille=20').flush({ elements: [], total: 0 });
    await stabiliser();

    await reessayer('modules');

    serveur.expectNone(`/api/albums/${ROULE_GALETTE.id}/modules`);
    expect(bandeau('modules')).toBeNull();
    bouton('Annuler').click();
    await ouverture;
  });

  it('choisir un autre Album efface l’erreur des Modules du précédent', async () => {
    await ouvrir();
    await taper('la roule');
    serveur
      .expectOne('/api/albums?recherche=la%20roule&taille=20')
      .flush({ elements: [ROULE_GALETTE], total: 1 });
    await stabiliser();
    option('La Roule Galette').click();
    await stabiliser();
    serveur.expectOne(`/api/albums/${ROULE_GALETTE.id}/modules`).error(new ProgressEvent('error'));
    await stabiliser();
    expect(bandeau('modules')).not.toBeNull();

    await taper('moufle');
    serveur
      .expectOne('/api/albums?recherche=moufle&taille=20')
      .flush({ elements: [LA_MOUFLE], total: 1 });
    await stabiliser();
    option('La Moufle').click();
    await stabiliser();
    serveur.expectOne(`/api/albums/${LA_MOUFLE.id}/modules`).flush([]);
    await stabiliser();

    expect(bandeau('modules')).toBeNull();
    bouton('Annuler').click();
    await ouverture;
  });

  describe('« Nouveau module » (story 2.2, partie 2)', () => {
    const URL_MODULES = `/api/albums/${ROULE_GALETTE.id}/modules`;
    const SAISONS = {
      id: '0190f0a0-0000-7000-8000-00000000b009',
      albumId: ROULE_GALETTE.id,
      nom: 'Les saisons',
      ordre: 3,
      createurId: '0190f0a0-0000-7000-8000-00000000e001',
    };

    const champNom = () =>
      dialogue()!.querySelector<HTMLInputElement>('app-champ-nom-module input');
    const erreurChampNom = () => dialogue()!.querySelector('app-champ-nom-module [role="alert"]');
    const valeurModule = () =>
      [...dialogue()!.querySelectorAll('mat-form-field')]
        .find(
          (champ) =>
            champ.querySelector('mat-label')?.textContent?.trim() === 'Module (facultatif)',
        )
        ?.querySelector('.mat-mdc-select-value')
        ?.textContent?.trim();

    async function ouvrirChampNom() {
      await ouvrirListe('Module (facultatif)');
      option('Nouveau module').click();
      await stabiliser();
    }

    async function taperNom(nom: string) {
      champNom()!.value = nom;
      champNom()!.dispatchEvent(new Event('input'));
      await stabiliser();
    }

    /** Touche au clavier dans le champ, avec le `keyCode` que lit la surcouche du dialogue. */
    async function touche(key: 'Enter' | 'Escape') {
      const evenement = new KeyboardEvent('keydown', { key, bubbles: true });
      Object.defineProperty(evenement, 'keyCode', { get: () => (key === 'Enter' ? 13 : 27) });
      champNom()!.dispatchEvent(evenement);
      await stabiliser();
    }

    it('Album sans Module : la liste Module propose « Aucun module » puis « Nouveau module »', async () => {
      await ouvrir();
      await taper('moufle');
      serveur
        .expectOne('/api/albums?recherche=moufle&taille=20')
        .flush({
          elements: [{ ...ROULE_GALETTE, titre: 'La Moufle', nombreModules: 0 }],
          total: 1,
        });
      await stabiliser();
      option('La Moufle').click();
      await stabiliser();
      serveur.expectOne(URL_MODULES).flush([]);
      await stabiliser();

      expect(etiquettes()).toEqual([
        'Album',
        'Module (facultatif)',
        'Thème par défaut (facultatif)',
      ]);
      await ouvrirListe('Module (facultatif)');
      expect(options()).toEqual(['Aucun module', 'Nouveau module']);
      option('Aucun module').click();
      await stabiliser();
      bouton('Annuler').click();
      await ouverture;
    });

    it('Entrée crée le Module, qui est choisi puis envoyé avec la Préparation', async () => {
      await ouvrir();
      await choisirRouleGalette();
      await choisirSection('MS');
      await ouvrirChampNom();

      expect(etiquettes()).toContain('Nom du nouveau module');
      expect(document.activeElement).toBe(champNom());
      expect(bouton('Créer').disabled).toBe(true);

      await taperNom('Les saisons');
      await touche('Enter');
      const creation = serveur.expectOne({ method: 'POST', url: URL_MODULES });
      expect(creation.request.body).toEqual({ nom: 'Les saisons' });
      creation.flush(SAISONS, { status: 201, statusText: 'Created' });
      await stabiliser();

      expect(champNom()).toBeNull();
      expect(valeurModule()).toBe('Les saisons');
      await ouvrirListe('Module (facultatif)');
      expect(options()).toEqual([
        'Aucun module',
        'Module 1',
        'Module 2',
        'Les saisons',
        'Nouveau module',
      ]);
      option('Les saisons').click();
      await stabiliser();

      bouton('Créer').click();
      await stabiliser();
      const preparation = serveur.expectOne({ method: 'POST', url: '/api/preparations' });
      expect(preparation.request.body).toEqual({
        albumId: ROULE_GALETTE.id,
        section: 'ms',
        moduleId: SAISONS.id,
      });
      preparation.flush(CREEE, { status: 201, statusText: 'Created' });
      await ouverture;
    });

    it('Échap referme le champ sans rien créer ni fermer le dialogue', async () => {
      await ouvrir();
      await choisirRouleGalette();
      await ouvrirChampNom();
      await taperNom('Les saisons');

      await touche('Escape');

      serveur.expectNone(URL_MODULES);
      expect(dialogue()).not.toBeNull();
      expect(champNom()).toBeNull();
      expect(etiquettes()).toContain('Module (facultatif)');
      // Première liste du dialogue : Module, avant Thème par défaut.
      expect(document.activeElement).toBe(dialogue()!.querySelector('mat-select'));
      bouton('Annuler').click();
      await ouverture;
    });

    it('échec de la création : message traduit dans le champ, qui reste ouvert avec la saisie', async () => {
      await ouvrir();
      await choisirRouleGalette();
      await ouvrirChampNom();
      await taperNom('module 1');

      bouton('Ajouter').click();
      await stabiliser();
      serveur
        .expectOne({ method: 'POST', url: URL_MODULES })
        .flush(
          { status: 409, code: 'module.deja_existant' },
          { status: 409, statusText: 'Conflict' },
        );
      await stabiliser();

      expect(erreurChampNom()?.textContent?.trim()).toBe(
        'Un module de ce nom existe déjà pour cet album.',
      );
      expect(champNom()!.value).toBe('module 1');
      expect(dialogue()!.querySelectorAll('app-bandeau-erreur')).toHaveLength(0);

      // « Annuler » du champ, puis celui du dialogue.
      dialogue()!.querySelector<HTMLButtonElement>('app-champ-nom-module button')!.click();
      await stabiliser();
      expect(champNom()).toBeNull();
      bouton('Annuler').click();
      await ouverture;
    });

    it('ni renommage ni suppression dans le dialogue', async () => {
      await ouvrir();
      await choisirRouleGalette();

      expect(dialogue()!.querySelector('button[aria-label="Actions du module"]')).toBeNull();
      bouton('Annuler').click();
      await ouverture;
    });

    it('Module créé pour un Album quitté entre-temps : ni ajouté ni choisi pour le nouvel Album', async () => {
      await ouvrir('ms');
      await choisirRouleGalette();
      await ouvrirChampNom();
      await taperNom('Les saisons');
      await touche('Enter');
      const creation = serveur.expectOne({ method: 'POST', url: URL_MODULES });

      await taper('moufle');
      serveur
        .expectOne('/api/albums?recherche=moufle&taille=20')
        .flush({ elements: [LA_MOUFLE], total: 1 });
      await stabiliser();
      option('La Moufle').click();
      await stabiliser();
      serveur.expectOne(`/api/albums/${LA_MOUFLE.id}/modules`).flush([]);
      await stabiliser();
      creation.flush(SAISONS, { status: 201, statusText: 'Created' });
      await stabiliser();

      expect(valeurModule()).toBe('');
      await ouvrirListe('Module (facultatif)');
      expect(options()).toEqual(['Aucun module', 'Nouveau module']);
      option('Aucun module').click();
      await stabiliser();

      bouton('Créer').click();
      await stabiliser();
      const preparation = serveur.expectOne({ method: 'POST', url: '/api/preparations' });
      expect(preparation.request.body).toEqual({ albumId: LA_MOUFLE.id, section: 'ms' });
      preparation.flush(
        { ...CREEE, albumId: LA_MOUFLE.id, moduleId: undefined, nomModule: undefined },
        { status: 201, statusText: 'Created' },
      );
      await ouverture;
    });
  });

  describe('Thèmes (story 2.2, partie 3)', () => {
    const SAISONS: ThemeDto = { id: '0190f0a0-0000-7000-8000-00000000c009', nom: 'Les saisons' };
    const erreurChampThemes = () => dialogue()!.querySelector('app-champ-themes [role="alert"]');

    it('« Créer le thème « … » » : le Thème est créé, choisi, puis envoyé avec la Préparation', async () => {
      await ouvrir('ms');
      await choisirRouleGalette();

      await taperTheme('cuis');
      expect(options()).toEqual(['cuisine', 'Créer le thème « cuis »']);
      await taperTheme('Les saisons');
      expect(options()).toEqual(['Créer le thème « Les saisons »']);
      toucheClavier(saisieThemes(), 'Enter', 13);
      await stabiliser();

      const creation = serveur.expectOne({ method: 'POST', url: '/api/themes' });
      expect(creation.request.body).toEqual({ nom: 'Les saisons' });
      // Pendant la création, ni « Créer » ni « Annuler ».
      expect(bouton('Créer').disabled).toBe(true);
      expect(bouton('Annuler').disabled).toBe(true);
      creation.flush(SAISONS, { status: 201, statusText: 'Created' });
      await stabiliser();

      expect(etiquettesThemes()).toEqual(['Les saisons']);
      expect(saisieThemes().value).toBe('');
      bouton('Créer').click();
      await stabiliser();
      const preparation = serveur.expectOne({ method: 'POST', url: '/api/preparations' });
      expect(preparation.request.body).toEqual({
        albumId: ROULE_GALETTE.id,
        section: 'ms',
        themeDefautId: SAISONS.id,
      });
      preparation.flush(CREEE, { status: 201, statusText: 'Created' });
      await ouverture;
    });

    it('échec de la création : message traduit sous le champ, la saisie reste, rien n’est choisi', async () => {
      await ouvrir('ms');
      await choisirRouleGalette();

      await choisirThemeAuClavier('Les saisons');
      serveur
        .expectOne({ method: 'POST', url: '/api/themes' })
        .flush(
          { status: 409, code: 'theme.deja_existant' },
          { status: 409, statusText: 'Conflict' },
        );
      await stabiliser();

      expect(erreurChampThemes()?.textContent?.trim()).toBe('Un thème de ce nom existe déjà.');
      expect(saisieThemes().value).toBe('Les saisons');
      expect(etiquettesThemes()).toEqual([]);
      expect(bouton('Créer').disabled).toBe(false);
      bouton('Annuler').click();
      await ouverture;
    });

    it('au clavier : Entrée choisit, Retour arrière retire, la Préparation part sans Thème', async () => {
      await ouvrir('gs');
      await choisirRouleGalette();

      await choisirThemeAuClavier('cuis');
      expect(etiquettesThemes()).toEqual(['cuisine']);
      saisieThemes().focus();
      toucheClavier(saisieThemes(), 'Backspace', 8);
      await stabiliser();
      expect(etiquettesThemes()).toEqual([]);

      bouton('Créer').click();
      await stabiliser();
      const preparation = serveur.expectOne({ method: 'POST', url: '/api/preparations' });
      expect(preparation.request.body).toEqual({ albumId: ROULE_GALETTE.id, section: 'gs' });
      preparation.flush(CREEE, { status: 201, statusText: 'Created' });
      await ouverture;
    });

    it('ni renommage ni suppression dans le dialogue : aucun menu d’étiquette', async () => {
      await ouvrir();

      await choisirThemeAuClavier('cuis');
      const puce = dialogue()!.querySelector<HTMLElement>('app-champ-themes mat-chip-row')!;
      expect(puce.getAttribute('aria-haspopup')).toBeNull();
      puce.click();
      await stabiliser();
      expect(document.querySelector('.cdk-overlay-pane [mat-menu-item]')).toBeNull();
      bouton('Annuler').click();
      await ouverture;
    });
  });

  it('libellé du nombre de Modules', () => {
    expect([0, 1, 3].map(libelleModules)).toEqual(['0 modules', '1 module', '3 modules']);
  });
});
