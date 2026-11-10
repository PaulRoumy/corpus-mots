import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { Title } from '@angular/platform-browser';
import { ModuleDto } from '../api/models/module-dto';
import { PreparationDto } from '../api/models/preparation-dto';
import { ThemeDto } from '../api/models/theme-dto';
import { CompteCourant } from '../commun/compte-courant';
import { MESSAGE_RESEAU } from '../commun/erreurs/message-erreur';
import { provideIcones } from '../commun/icones';
import {
  heuresEnMinutes,
  libelleIllustres,
  MESSAGE_TEMPS_PASSE_INVALIDE,
  minutesEnHeures,
  Preparation,
} from './preparation';

const ID = '0190f0a0-0000-7000-8000-00000000d001';
const ALBUM = '0190f0a0-0000-7000-8000-00000000a001';
const MODULE_1 = '0190f0a0-0000-7000-8000-00000000b001';
const MODULE_2 = '0190f0a0-0000-7000-8000-00000000b002';
const CUISINE = '0190f0a0-0000-7000-8000-00000000c001';
const ANIMAUX = '0190f0a0-0000-7000-8000-00000000c002';

const PREPARATION: PreparationDto = {
  id: ID,
  albumId: ALBUM,
  titreAlbum: 'La Roule Galette',
  section: 'ms',
  moduleId: MODULE_1,
  nomModule: 'Module 1',
  themeDefautId: CUISINE,
  nomThemeDefaut: 'cuisine',
  nombreMots: 0,
  nombreIllustres: 0,
  creeLe: '2026-11-09T10:00:00Z',
};

/** Enseignant connecté, créateur de Module 1 ; Module 2 est d'un collègue. */
const MOI = '0190f0a0-0000-7000-8000-00000000e001';
const COLLEGUE = '0190f0a0-0000-7000-8000-00000000e002';
const MODULES: ModuleDto[] = [
  { id: MODULE_1, albumId: ALBUM, nom: 'Module 1', ordre: 1, createurId: MOI },
  { id: MODULE_2, albumId: ALBUM, nom: 'Module 2', ordre: 2, createurId: COLLEGUE },
];
/** cuisine est de l'enseignant connecté, animaux d'un collègue. */
const THEMES: ThemeDto[] = [
  { id: ANIMAUX, nom: 'animaux', createurId: COLLEGUE },
  { id: CUISINE, nom: 'cuisine', createurId: MOI },
];

const AUTRE_ID = '0190f0a0-0000-7000-8000-00000000d002';
const LOUP: PreparationDto = {
  id: AUTRE_ID,
  albumId: '0190f0a0-0000-7000-8000-00000000a002',
  titreAlbum: 'Le loup qui voulait changer de couleur',
  section: 'gs',
  nombreMots: 0,
  nombreIllustres: 0,
  creeLe: '2026-11-08T10:00:00Z',
};

const MODULE_LOUP = '0190f0a0-0000-7000-8000-00000000b003';
const MODULES_LOUP: ModuleDto[] = [
  { id: MODULE_LOUP, albumId: LOUP.albumId, nom: 'Couleurs', ordre: 1 },
];

const URL_REGLAGES = `/api/preparations/${ID}/reglages`;

describe('Preparation (En-tête)', () => {
  let fixture: ComponentFixture<Preparation>;
  let racine: HTMLElement;
  let serveur: HttpTestingController;

  const tour = () => new Promise((fin) => setTimeout(fin));

  async function stabiliser() {
    await tour();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Preparation],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideIcones(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
    serveur = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Preparation);
    fixture.componentRef.setInput('id', ID);
    racine = fixture.nativeElement as HTMLElement;
    await stabiliser();
  });

  afterEach(() => serveur.verify());

  const texte = (selecteur: string) =>
    racine.querySelector(selecteur)?.textContent?.replace(/\s+/g, ' ').trim();

  /** Répond à la lecture de la Préparation, puis aux listes de Modules de son Album et de Thèmes. */
  async function ouvrir(
    preparation: PreparationDto = PREPARATION,
    modules: ModuleDto[] = MODULES,
    themes: ThemeDto[] = THEMES,
  ) {
    serveur.expectOne(`/api/preparations/${preparation.id}`).flush(preparation);
    await stabiliser();
    serveur.expectOne(`/api/albums/${preparation.albumId}/modules`).flush(modules);
    serveur.expectOne('/api/themes').flush(themes);
    await stabiliser();
  }

  const champ = (etiquette: string) =>
    [...racine.querySelectorAll<HTMLElement>('mat-form-field')].find(
      (element) => element.querySelector('mat-label')?.textContent?.trim() === etiquette,
    );
  const valeurListe = (etiquette: string) =>
    champ(etiquette)?.querySelector('.mat-mdc-select-value')?.textContent?.trim();
  const champTemps = () =>
    champ('Temps passé (facultatif)')!.querySelector<HTMLInputElement>('input')!;
  const etiquettesThemes = () =>
    [...racine.querySelectorAll('app-champ-themes mat-chip-row')].map((puce) =>
      puce.querySelector('.mdc-evolution-chip__text-label')?.textContent?.trim(),
    );
  const saisieThemes = () => racine.querySelector<HTMLInputElement>('app-champ-themes input')!;

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
    // L'autocomplete remet en avant la première proposition au tour suivant un changement de propositions.
    await tour();
  }

  /** Tape `texte` dans le Champ à étiquettes et choisit au clavier la proposition mise en avant. */
  async function choisirThemeAuClavier(texte: string) {
    await taperTheme(texte);
    toucheClavier(saisieThemes(), 'Enter', 13);
    await stabiliser();
  }

  const bandeau = (classe: string) =>
    racine.querySelector(`app-bandeau-erreur.${classe} [role="alert"]`)?.textContent?.trim();

  async function choisir(etiquette: string, libelle: string) {
    champ(etiquette)!.querySelector<HTMLElement>('.mat-mdc-select-trigger')!.click();
    await stabiliser();
    [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option')]
      .find((option) => option.textContent?.trim() === libelle)!
      .click();
    await stabiliser();
  }

  async function saisirTemps(saisie: string) {
    champTemps().focus();
    champTemps().value = saisie;
    champTemps().dispatchEvent(new Event('input'));
    champTemps().dispatchEvent(new Event('blur'));
    await stabiliser();
  }

  async function reessayer(classe: string) {
    [...racine.querySelectorAll<HTMLButtonElement>(`app-bandeau-erreur.${classe} button`)]
      .find((bouton) => bouton.textContent?.trim() === 'Réessayer')!
      .click();
    await stabiliser();
  }

  function reglage(): TestRequest {
    const requete = serveur.expectOne(URL_REGLAGES);
    expect(requete.request.method).toBe('PUT');
    return requete;
  }

  it('En-tête : titre de l’Album, Repère de Section, Module, Thème par défaut, compteur, Temps passé', async () => {
    expect(racine.querySelector('app-squelette')).not.toBeNull();

    await ouvrir({ ...PREPARATION, tempsPasseMinutes: 90 });

    expect(texte('h1')).toBe('La Roule Galette');
    expect(texte('app-repere-section')).toBe('Section MS');
    expect(valeurListe('Module')).toBe('Module 1');
    expect(etiquettesThemes()).toEqual(['cuisine']);
    expect(texte('.entete__compteur')).toBe('0 mots, 0 déjà illustrés');
    expect(champTemps().value).toBe('1,5');
    expect(
      champ('Temps passé (facultatif)')!.querySelector('mat-icon')!.getAttribute('svgicon'),
    ).toBe('horloge');
    expect(texte('.entete__temps .mat-mdc-form-field-text-suffix')).toBe('h');
    expect(TestBed.inject(Title).getTitle()).toBe('La Roule Galette · corpus-mots');
    expect(racine.querySelector('app-squelette')).toBeNull();
  });

  it('les listes proposent « Aucun … » puis les Modules dans leur ordre et les Thèmes', async () => {
    await ouvrir();

    champ('Module')!.querySelector<HTMLElement>('.mat-mdc-select-trigger')!.click();
    await stabiliser();
    expect(
      [...document.querySelectorAll('.cdk-overlay-pane mat-option')].map((o) =>
        o.textContent?.trim(),
      ),
    ).toEqual(['Aucun module', 'Module 1', 'Module 2', 'Nouveau module']);
  });

  it('chaque champ a une étiquette et se rejoint au clavier', async () => {
    await ouvrir();

    const liste = champ('Module')!.querySelector<HTMLElement>('mat-select')!;
    expect(liste.getAttribute('tabindex')).toBe('0');
    const libelle = liste.getAttribute('aria-labelledby')!.split(' ')[0];
    expect(racine.querySelector(`#${libelle}`)?.textContent?.trim()).toBe('Module');
    expect(saisieThemes().labels?.[0]?.textContent?.trim()).toBe('Thème par défaut');
    expect(
      racine.querySelector('app-champ-themes [matchipremove]')?.getAttribute('aria-label'),
    ).toBe('Retirer cuisine');
    const temps = champTemps();
    expect(temps.labels?.[0]?.textContent?.trim()).toBe('Temps passé (facultatif)');
    expect(temps.getAttribute('inputmode')).toBe('decimal');
  });

  it('Module choisi : enregistré aussitôt avec les trois valeurs, l’En-tête prend la Préparation renvoyée', async () => {
    await ouvrir({ ...PREPARATION, tempsPasseMinutes: 60 });

    await choisir('Module', 'Module 2');
    const requete = reglage();
    expect(requete.request.body).toEqual({
      moduleId: MODULE_2,
      themeDefautId: CUISINE,
      tempsPasseMinutes: 60,
    });
    requete.flush({
      ...PREPARATION,
      moduleId: MODULE_2,
      nomModule: 'Module 2',
      tempsPasseMinutes: 60,
    });
    await stabiliser();

    expect(valeurListe('Module')).toBe('Module 2');
    expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
  });

  it('« Retirer cuisine » : le Thème par défaut est retiré (null)', async () => {
    await ouvrir();

    racine.querySelector<HTMLButtonElement>('app-champ-themes [matchipremove]')!.click();
    await stabiliser();
    const requete = reglage();
    expect(requete.request.body).toEqual({
      moduleId: MODULE_1,
      themeDefautId: null,
      tempsPasseMinutes: null,
    });
    requete.flush({ ...PREPARATION, themeDefautId: undefined, nomThemeDefaut: undefined });
    await stabiliser();
  });

  it('Temps passé : enregistré à la sortie du champ, converti d’heures en minutes, virgule ou point', async () => {
    await ouvrir();

    await saisirTemps('3,5');
    let requete = reglage();
    expect(requete.request.body).toEqual({
      moduleId: MODULE_1,
      themeDefautId: CUISINE,
      tempsPasseMinutes: 210,
    });
    requete.flush({ ...PREPARATION, tempsPasseMinutes: 210 });
    await stabiliser();
    expect(champTemps().value).toBe('3,5');

    await saisirTemps('0.5');
    requete = reglage();
    expect(requete.request.body.tempsPasseMinutes).toBe(30);
    requete.flush({ ...PREPARATION, tempsPasseMinutes: 30 });
    await stabiliser();

    await saisirTemps('');
    requete = reglage();
    expect(requete.request.body.tempsPasseMinutes).toBeNull();
    requete.flush(PREPARATION);
    await stabiliser();
  });

  it('Temps passé inchangé à la sortie du champ : rien n’est envoyé', async () => {
    await ouvrir({ ...PREPARATION, tempsPasseMinutes: 90 });

    await saisirTemps('1,5');
    await saisirTemps('1.50');

    serveur.expectNone(URL_REGLAGES);
  });

  it.each(['3,2', '101', '-1', 'deux', '1,5h'])(
    'Temps passé « %s » invalide : rien n’est envoyé, le champ l’explique',
    async (saisie) => {
      await ouvrir();

      await saisirTemps(saisie);

      serveur.expectNone(URL_REGLAGES);
      expect(champTemps().value).toBe(saisie);
      expect(texte('.entete__temps mat-error')).toBe(MESSAGE_TEMPS_PASSE_INVALIDE);
      expect(MESSAGE_TEMPS_PASSE_INVALIDE).toBe(
        "Saisissez un nombre d'heures entre 0 et 100, par demi-heure.",
      );
    },
  );

  it('Temps passé invalide puis Module changé : le Temps passé enregistré est renvoyé', async () => {
    await ouvrir({ ...PREPARATION, tempsPasseMinutes: 60 });

    await saisirTemps('3,2');
    await choisir('Module', 'Aucun module');

    const requete = reglage();
    expect(requete.request.body).toEqual({
      moduleId: null,
      themeDefautId: CUISINE,
      tempsPasseMinutes: 60,
    });
    requete.flush({
      ...PREPARATION,
      moduleId: undefined,
      nomModule: undefined,
      tempsPasseMinutes: 60,
    });
    await stabiliser();
  });

  it('échec du Temps passé : la saisie reste, Bandeau d’erreur, « Réessayer » renvoie la même valeur', async () => {
    await ouvrir();

    await saisirTemps('2');
    reglage().error(new ProgressEvent('error'));
    await stabiliser();

    expect(champTemps().value).toBe('2');
    expect(bandeau('erreur-enregistrement')).toBe(MESSAGE_RESEAU);
    expect(texte('h1')).toBe('La Roule Galette');

    await reessayer('erreur-enregistrement');
    const requete = reglage();
    expect(requete.request.body).toEqual({
      moduleId: MODULE_1,
      themeDefautId: CUISINE,
      tempsPasseMinutes: 120,
    });
    requete.flush({ ...PREPARATION, tempsPasseMinutes: 120 });
    await stabiliser();

    expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
    expect(champTemps().value).toBe('2');
  });

  it('échec du Module : le choix reste affiché, « Réessayer » le renvoie', async () => {
    await ouvrir();

    await choisir('Module', 'Module 2');
    reglage().error(new ProgressEvent('error'));
    await stabiliser();

    expect(valeurListe('Module')).toBe('Module 2');
    expect(bandeau('erreur-enregistrement')).toBe(MESSAGE_RESEAU);

    await reessayer('erreur-enregistrement');
    const requete = reglage();
    expect(requete.request.body.moduleId).toBe(MODULE_2);
    requete.flush({ ...PREPARATION, moduleId: MODULE_2, nomModule: 'Module 2' });
    await stabiliser();
    expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
  });

  it('échec du Thème par défaut : le choix reste affiché, « Réessayer » le renvoie', async () => {
    await ouvrir();

    await choisirThemeAuClavier('anim');
    reglage().error(new ProgressEvent('error'));
    await stabiliser();

    expect(etiquettesThemes()).toEqual(['animaux']);
    expect(bandeau('erreur-enregistrement')).toBe(MESSAGE_RESEAU);

    await reessayer('erreur-enregistrement');
    const requete = reglage();
    expect(requete.request.body.themeDefautId).toBe(ANIMAUX);
    requete.flush({ ...PREPARATION, themeDefautId: ANIMAUX, nomThemeDefaut: 'animaux' });
    await stabiliser();
  });

  it('un enregistrement à la fois : un changement pendant l’envoi part ensuite, avec toutes les valeurs', async () => {
    await ouvrir();

    await choisir('Module', 'Module 2');
    const premier = reglage();
    await saisirTemps('1');
    serveur.expectNone(URL_REGLAGES);

    premier.flush({ ...PREPARATION, moduleId: MODULE_2, nomModule: 'Module 2' });
    await stabiliser();
    const second = reglage();
    expect(second.request.body).toEqual({
      moduleId: MODULE_2,
      themeDefautId: CUISINE,
      tempsPasseMinutes: 60,
    });
    second.flush({
      ...PREPARATION,
      moduleId: MODULE_2,
      nomModule: 'Module 2',
      tempsPasseMinutes: 60,
    });
    await stabiliser();
  });

  it('listes vides : Module avec « Nouveau module » seulement, Thème par défaut sans étiquette, le Temps passé reste', async () => {
    await ouvrir(
      {
        ...PREPARATION,
        section: 'ps',
        moduleId: undefined,
        nomModule: undefined,
        themeDefautId: undefined,
        nomThemeDefaut: undefined,
      },
      [],
      [],
    );

    expect(texte('app-repere-section')).toBe('Section PS');
    champ('Module')!.querySelector<HTMLElement>('.mat-mdc-select-trigger')!.click();
    await stabiliser();
    expect(
      [...document.querySelectorAll('.cdk-overlay-pane mat-option')].map((o) =>
        o.textContent?.trim(),
      ),
    ).toEqual(['Aucun module', 'Nouveau module']);
    expect(racine.querySelector('.entete__actions-module')).toBeNull();
    expect(champ('Thème par défaut')).toBeDefined();
    expect(etiquettesThemes()).toEqual([]);
    expect(racine.querySelector('.entete__nom-module')).toBeNull();
    expect(racine.querySelector('.entete__nom-theme')).toBeNull();
    expect(champ('Temps passé (facultatif)')).toBeDefined();
  });

  it('échec des listes : leur propre Bandeau, l’En-tête reste avec ses valeurs, « Réessayer » recharge', async () => {
    serveur.expectOne(`/api/preparations/${ID}`).flush(PREPARATION);
    await stabiliser();
    serveur.expectOne(`/api/albums/${ALBUM}/modules`).error(new ProgressEvent('error'));
    serveur.expectOne('/api/themes').flush(THEMES);
    await stabiliser();

    expect(bandeau('erreur-listes')).toBe(MESSAGE_RESEAU);
    expect(texte('h1')).toBe('La Roule Galette');
    expect(texte('.entete__nom-module')).toBe('Module 1');
    expect(texte('.entete__nom-theme')).toBe('Thème par défaut : cuisine');

    await reessayer('erreur-listes');
    serveur.expectOne(`/api/albums/${ALBUM}/modules`).flush(MODULES);
    serveur.expectOne('/api/themes').flush(THEMES);
    await stabiliser();

    expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
    expect(valeurListe('Module')).toBe('Module 1');
  });

  it('autre identifiant après un premier chargement : la nouvelle Préparation est lue', async () => {
    await ouvrir();

    fixture.componentRef.setInput('id', AUTRE_ID);
    await stabiliser();
    await ouvrir(LOUP, [], THEMES);

    expect(texte('h1')).toBe(LOUP.titreAlbum);
    expect(etiquettesThemes()).toEqual([]);
    // Album sans Module : la liste reste, avec « Nouveau module ».
    expect(valeurListe('Module')).toBe('');
    expect(TestBed.inject(Title).getTitle()).toBe(`${LOUP.titreAlbum} · corpus-mots`);
  });

  it('un enregistrement de la Préparation quittée, répondu après l’ouverture de la nouvelle, n’écrit rien', async () => {
    await ouvrir();
    await choisir('Module', 'Module 2');
    const enregistrementA = reglage();

    fixture.componentRef.setInput('id', AUTRE_ID);
    await stabiliser();
    await ouvrir(LOUP, MODULES_LOUP, THEMES);
    enregistrementA.flush({ ...PREPARATION, moduleId: MODULE_2, nomModule: 'Module 2' });
    await stabiliser();

    expect(texte('h1')).toBe(LOUP.titreAlbum);
    expect(valeurListe('Module')).toBe('');
    expect(racine.querySelector('app-bandeau-erreur')).toBeNull();

    await choisir('Module', 'Couleurs');
    const enregistrementB = serveur.expectOne(`/api/preparations/${AUTRE_ID}/reglages`);
    expect(enregistrementB.request.body).toEqual({
      moduleId: MODULE_LOUP,
      themeDefautId: null,
      tempsPasseMinutes: null,
    });
    enregistrementB.flush({ ...LOUP, moduleId: MODULE_LOUP, nomModule: 'Couleurs' });
    await stabiliser();
    expect(valeurListe('Module')).toBe('Couleurs');
  });

  it('les listes de la Préparation quittée, répondues après celles de la nouvelle, n’écrivent rien', async () => {
    serveur.expectOne(`/api/preparations/${ID}`).flush(PREPARATION);
    await stabiliser();
    const modulesA = serveur.expectOne(`/api/albums/${ALBUM}/modules`);
    const [themesA] = serveur.match('/api/themes');

    fixture.componentRef.setInput('id', AUTRE_ID);
    await stabiliser();
    await ouvrir(LOUP, MODULES_LOUP, THEMES);
    modulesA.flush(MODULES);
    themesA.flush(THEMES);
    await stabiliser();

    champ('Module')!.querySelector<HTMLElement>('.mat-mdc-select-trigger')!.click();
    await stabiliser();
    expect(
      [...document.querySelectorAll('.cdk-overlay-pane mat-option')].map((o) =>
        o.textContent?.trim(),
      ),
    ).toEqual(['Aucun module', 'Couleurs', 'Nouveau module']);
  });

  it('après un échec, quitter le Temps passé inchangé renvoie les valeurs affichées', async () => {
    await ouvrir({ ...PREPARATION, tempsPasseMinutes: 60 });

    await choisir('Module', 'Module 2');
    reglage().error(new ProgressEvent('error'));
    await stabiliser();
    expect(bandeau('erreur-enregistrement')).toBe(MESSAGE_RESEAU);

    await saisirTemps('1');
    const requete = reglage();
    expect(requete.request.body).toEqual({
      moduleId: MODULE_2,
      themeDefautId: CUISINE,
      tempsPasseMinutes: 60,
    });
    requete.flush({
      ...PREPARATION,
      moduleId: MODULE_2,
      nomModule: 'Module 2',
      tempsPasseMinutes: 60,
    });
    await stabiliser();
    expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
  });

  it('la réponse d’une Préparation quittée, arrivée après la nouvelle, n’écrit rien', async () => {
    const ancienne = serveur.expectOne(`/api/preparations/${ID}`);
    fixture.componentRef.setInput('id', AUTRE_ID);
    await stabiliser();
    await ouvrir(LOUP, [], []);
    ancienne.flush(PREPARATION);
    await stabiliser();

    expect(texte('h1')).toBe(LOUP.titreAlbum);
    expect(TestBed.inject(Title).getTitle()).toBe(`${LOUP.titreAlbum} · corpus-mots`);
  });

  it('Préparation d’un collègue (404) : message traduit, « Réessayer » relit', async () => {
    serveur
      .expectOne(`/api/preparations/${ID}`)
      .flush(
        { status: 404, code: 'ressource.introuvable' },
        { status: 404, statusText: 'Not Found' },
      );
    await stabiliser();

    expect(texte('app-bandeau-erreur [role="alert"]')).toBe(
      "Cet élément n'existe plus. Rechargez la page.",
    );
    expect(racine.querySelector('.entete')).toBeNull();
    [...racine.querySelectorAll<HTMLButtonElement>('app-bandeau-erreur button')]
      .find((bouton) => bouton.textContent?.trim() === 'Réessayer')!
      .click();
    await stabiliser();
    await ouvrir();

    expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
    expect(texte('h1')).toBe('La Roule Galette');
  });

  describe('Modules (story 2.2, partie 2)', () => {
    const URL_MODULES = `/api/albums/${ALBUM}/modules`;
    const MODULE_3 = '0190f0a0-0000-7000-8000-00000000b009';
    const SAISONS: ModuleDto = {
      id: MODULE_3,
      albumId: ALBUM,
      nom: 'Les saisons',
      ordre: 3,
      createurId: MOI,
    };

    afterEach(() =>
      document
        .querySelectorAll('.cdk-overlay-container')
        .forEach((surcouche) => surcouche.remove()),
    );

    /** L'enseignant connecté est `MOI`, administrateur ou non. */
    function connecter(administrateur = false) {
      TestBed.inject(CompteCourant).mettreAJour({
        id: MOI,
        administrateur,
        email: 'moi@ecole.fr',
        nomAffiche: 'Moi',
      });
    }

    const champNom = () => racine.querySelector<HTMLInputElement>('app-champ-nom-module input');
    const etiquetteChampNom = () =>
      racine.querySelector('app-champ-nom-module mat-label')?.textContent?.trim();
    const erreurChampNom = () => racine.querySelector('app-champ-nom-module [role="alert"]');
    const boutonActions = () =>
      racine.querySelector<HTMLButtonElement>('button[aria-label="Actions du module"]');
    const listeModule = () => champ('Module')!.querySelector<HTMLElement>('mat-select')!;
    const boutonDuChamp = (libelle: string) =>
      [...racine.querySelectorAll<HTMLButtonElement>('app-champ-nom-module button')].find(
        (bouton) => bouton.textContent?.trim() === libelle,
      )!;
    const optionsOuvertes = () =>
      [...document.querySelectorAll('.cdk-overlay-pane mat-option')].map((option) =>
        option.textContent?.trim(),
      );

    async function taperNom(nom: string) {
      champNom()!.value = nom;
      champNom()!.dispatchEvent(new Event('input'));
      await stabiliser();
    }

    async function touche(key: 'Enter' | 'Escape') {
      champNom()!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      await stabiliser();
    }

    async function actionDuMenu(libelle: 'Renommer' | 'Supprimer') {
      boutonActions()!.click();
      await stabiliser();
      [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane [mat-menu-item]')]
        .find((item) => item.textContent?.trim() === libelle)!
        .click();
      await stabiliser();
    }

    async function repondreConfirmation(bouton: 'confirmer' | 'annuler') {
      document.querySelector<HTMLButtonElement>(`.dialogue-confirmation__${bouton}`)!.click();
      await stabiliser();
    }

    /** Répond à la relecture qui suit une suppression : Préparation sans Module, puis listes. */
    async function relire(modules: ModuleDto[]) {
      serveur
        .expectOne(`/api/preparations/${ID}`)
        .flush({ ...PREPARATION, moduleId: undefined, nomModule: undefined });
      await stabiliser();
      serveur.expectOne(URL_MODULES).flush(modules);
      serveur.expectOne('/api/themes').flush(THEMES);
      await stabiliser();
    }

    it('« Nouveau module », dernière option : champ en ligne étiqueté, qui prend le focus', async () => {
      await ouvrir();

      await choisir('Module', 'Nouveau module');

      expect(champ('Module')).toBeUndefined();
      expect(etiquetteChampNom()).toBe('Nom du nouveau module');
      expect(champNom()!.labels?.[0]?.textContent?.trim()).toBe('Nom du nouveau module');
      expect(document.activeElement).toBe(champNom());
      expect(boutonDuChamp('Ajouter').disabled).toBe(true);
    });

    it('Entrée crée le Module, l’ajoute en fin de liste, le choisit et l’enregistre', async () => {
      await ouvrir({ ...PREPARATION, tempsPasseMinutes: 60 });

      await choisir('Module', 'Nouveau module');
      await taperNom('Les saisons');
      await touche('Enter');
      const creation = serveur.expectOne(URL_MODULES);
      expect(creation.request.method).toBe('POST');
      expect(creation.request.body).toEqual({ nom: 'Les saisons' });
      creation.flush(SAISONS);
      await stabiliser();

      const requete = reglage();
      expect(requete.request.body).toEqual({
        moduleId: MODULE_3,
        themeDefautId: CUISINE,
        tempsPasseMinutes: 60,
      });
      requete.flush({
        ...PREPARATION,
        moduleId: MODULE_3,
        nomModule: 'Les saisons',
        tempsPasseMinutes: 60,
      });
      await stabiliser();

      expect(champNom()).toBeNull();
      expect(valeurListe('Module')).toBe('Les saisons');
      expect(document.activeElement).toBe(listeModule());
      listeModule().querySelector<HTMLElement>('.mat-mdc-select-trigger')!.click();
      await stabiliser();
      expect(optionsOuvertes()).toEqual([
        'Aucun module',
        'Module 1',
        'Module 2',
        'Les saisons',
        'Nouveau module',
      ]);
    });

    it('« Ajouter » crée aussi le Module', async () => {
      await ouvrir();

      await choisir('Module', 'Nouveau module');
      await taperNom('Les saisons');
      boutonDuChamp('Ajouter').click();
      await stabiliser();
      serveur.expectOne(URL_MODULES).flush(SAISONS);
      await stabiliser();
      reglage().flush({ ...PREPARATION, moduleId: MODULE_3, nomModule: 'Les saisons' });
      await stabiliser();

      expect(valeurListe('Module')).toBe('Les saisons');
    });

    it('Échap referme le champ sans rien créer, le focus revient à la liste Module', async () => {
      await ouvrir();

      await choisir('Module', 'Nouveau module');
      await taperNom('Les saisons');
      await touche('Escape');

      serveur.expectNone(URL_MODULES);
      expect(champNom()).toBeNull();
      expect(valeurListe('Module')).toBe('Module 1');
      expect(document.activeElement).toBe(listeModule());
    });

    it('« Annuler » referme le champ sans rien créer', async () => {
      await ouvrir();

      await choisir('Module', 'Nouveau module');
      boutonDuChamp('Annuler').click();
      await stabiliser();

      serveur.expectNone(URL_MODULES);
      expect(champNom()).toBeNull();
      expect(valeurListe('Module')).toBe('Module 1');
    });

    it('échec de la création : message traduit sous le champ, la saisie reste, rien n’est enregistré', async () => {
      await ouvrir();

      await choisir('Module', 'Nouveau module');
      await taperNom('module 2');
      await touche('Enter');
      serveur
        .expectOne(URL_MODULES)
        .flush(
          { status: 409, code: 'module.deja_existant' },
          { status: 409, statusText: 'Conflict' },
        );
      await stabiliser();

      expect(erreurChampNom()?.textContent?.trim()).toBe(
        'Un module de ce nom existe déjà pour cet album.',
      );
      expect(champNom()!.getAttribute('aria-describedby')).toBe(erreurChampNom()!.id);
      expect(champNom()!.value).toBe('module 2');
      serveur.expectNone(URL_REGLAGES);
    });

    it('après un échec, modifier le nom masque le message, qu’un nouvel échec identique réaffiche', async () => {
      await ouvrir();

      await choisir('Module', 'Nouveau module');
      await taperNom('module 2');
      await touche('Enter');
      const conflit = () =>
        serveur
          .expectOne(URL_MODULES)
          .flush(
            { status: 409, code: 'module.deja_existant' },
            { status: 409, statusText: 'Conflict' },
          );
      conflit();
      await stabiliser();
      expect(erreurChampNom()).not.toBeNull();

      await taperNom('Module 2');
      expect(erreurChampNom()).toBeNull();
      expect(champNom()!.hasAttribute('aria-describedby')).toBe(false);

      await touche('Enter');
      conflit();
      await stabiliser();
      expect(erreurChampNom()?.textContent?.trim()).toBe(
        'Un module de ce nom existe déjà pour cet album.',
      );
      expect(champNom()!.getAttribute('aria-describedby')).toBe(erreurChampNom()!.id);
    });

    it('menu « Actions du module » : affiché pour le créateur du Module choisi, étiqueté, au clavier', async () => {
      connecter();
      await ouvrir();

      expect(boutonActions()).not.toBeNull();
      expect(boutonActions()!.tabIndex).toBe(0);
    });

    it('menu « Actions du module » : absent pour le Module d’un collègue et sans Module choisi', async () => {
      connecter();
      await ouvrir({ ...PREPARATION, moduleId: MODULE_2, nomModule: 'Module 2' });
      expect(boutonActions()).toBeNull();

      await choisir('Module', 'Aucun module');
      reglage().flush({ ...PREPARATION, moduleId: undefined, nomModule: undefined });
      await stabiliser();
      expect(boutonActions()).toBeNull();
    });

    it('menu « Actions du module » : affiché pour l’administrateur sur le Module d’un collègue', async () => {
      connecter(true);
      await ouvrir({ ...PREPARATION, moduleId: MODULE_2, nomModule: 'Module 2' });

      expect(boutonActions()).not.toBeNull();
    });

    it('« Renommer » : champ prérempli, Entrée renomme, la liste montre le nouveau nom', async () => {
      connecter();
      await ouvrir();

      await actionDuMenu('Renommer');
      expect(etiquetteChampNom()).toBe('Nouveau nom du module');
      expect(champNom()!.value).toBe('Module 1');
      expect(document.activeElement).toBe(champNom());

      await taperNom('Les saisons');
      await touche('Enter');
      const renommage = serveur.expectOne(`/api/modules/${MODULE_1}/nom`);
      expect(renommage.request.method).toBe('PUT');
      expect(renommage.request.body).toEqual({ nom: 'Les saisons' });
      renommage.flush({ ...MODULES[0], nom: 'Les saisons' });
      await stabiliser();

      serveur.expectNone(URL_REGLAGES);
      expect(champNom()).toBeNull();
      expect(valeurListe('Module')).toBe('Les saisons');
    });

    it('échec du renommage : message traduit sous le champ, qui reste ouvert', async () => {
      connecter();
      await ouvrir();

      await actionDuMenu('Renommer');
      await taperNom('Module 2');
      await touche('Enter');
      serveur
        .expectOne(`/api/modules/${MODULE_1}/nom`)
        .flush(
          { status: 403, code: 'module.reserve_au_createur' },
          { status: 403, statusText: 'Forbidden' },
        );
      await stabiliser();

      expect(erreurChampNom()?.textContent?.trim()).toBe(
        "Seuls le créateur du module et l'administrateur peuvent le modifier.",
      );
      expect(champNom()!.value).toBe('Module 2');
    });

    it('« Supprimer » confirmé : suppression, puis la Préparation et les Modules sont relus', async () => {
      connecter();
      await ouvrir();

      await actionDuMenu('Supprimer');
      expect(document.querySelector('app-dialogue-confirmation h2')?.textContent?.trim()).toBe(
        'Supprimer le module ?',
      );
      expect(document.querySelector('.dialogue-confirmation__phrase')?.textContent).toContain(
        '« Module 1 »',
      );
      await repondreConfirmation('confirmer');

      const suppression = serveur.expectOne(`/api/modules/${MODULE_1}`);
      expect(suppression.request.method).toBe('DELETE');
      suppression.flush('');
      await stabiliser();
      await relire([MODULES[1]]);

      expect(valeurListe('Module')).toBe('');
      expect(boutonActions()).toBeNull();
      expect(document.activeElement).toBe(listeModule());
      serveur.expectNone(URL_REGLAGES);
    });

    it('« Supprimer » annulé : rien n’est envoyé', async () => {
      connecter();
      await ouvrir();

      await actionDuMenu('Supprimer');
      await repondreConfirmation('annuler');

      serveur.expectNone(`/api/modules/${MODULE_1}`);
      expect(valeurListe('Module')).toBe('Module 1');
    });

    it('échec de la suppression : Bandeau d’erreur, « Réessayer » renvoie la suppression', async () => {
      connecter();
      await ouvrir();

      await actionDuMenu('Supprimer');
      await repondreConfirmation('confirmer');
      serveur.expectOne(`/api/modules/${MODULE_1}`).error(new ProgressEvent('error'));
      await stabiliser();

      expect(bandeau('erreur-module')).toBe(MESSAGE_RESEAU);
      expect(valeurListe('Module')).toBe('Module 1');

      await reessayer('erreur-module');
      serveur.expectOne(`/api/modules/${MODULE_1}`).flush('');
      await stabiliser();
      await relire([MODULES[1]]);

      expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
    });

    it('suppression répondue 404 (déjà supprimé) : la Préparation et les Modules sont relus, sans Bandeau', async () => {
      connecter();
      await ouvrir();

      await actionDuMenu('Supprimer');
      await repondreConfirmation('confirmer');
      // Opération sans corps de réponse : le client généré lit l'erreur RFC 9457 en texte.
      serveur
        .expectOne(`/api/modules/${MODULE_1}`)
        .flush(JSON.stringify({ status: 404, code: 'ressource.introuvable' }), {
          status: 404,
          statusText: 'Not Found',
        });
      await stabiliser();
      await relire([MODULES[1]]);

      expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
      expect(valeurListe('Module')).toBe('');
    });

    it('suppression refusée 403 : Bandeau d’erreur, « Réessayer » ne renvoie pas la suppression', async () => {
      connecter();
      await ouvrir();

      await actionDuMenu('Supprimer');
      await repondreConfirmation('confirmer');
      serveur
        .expectOne(`/api/modules/${MODULE_1}`)
        .flush(JSON.stringify({ status: 403, code: 'module.reserve_au_createur' }), {
          status: 403,
          statusText: 'Forbidden',
        });
      await stabiliser();

      expect(bandeau('erreur-module')).toBe(
        "Seuls le créateur du module et l'administrateur peuvent le modifier.",
      );
      await reessayer('erreur-module');

      serveur.expectNone(`/api/modules/${MODULE_1}`);
      expect(racine.querySelector('app-bandeau-erreur.erreur-module')).toBeNull();
      expect(valeurListe('Module')).toBe('Module 1');
    });

    it('échec de la relecture après suppression : Bandeau d’erreur, « Réessayer » relit la Préparation', async () => {
      connecter();
      await ouvrir();

      await actionDuMenu('Supprimer');
      await repondreConfirmation('confirmer');
      serveur.expectOne(`/api/modules/${MODULE_1}`).flush('');
      await stabiliser();
      serveur.expectOne(`/api/preparations/${ID}`).error(new ProgressEvent('error'));
      await stabiliser();

      expect(bandeau('erreur-module')).toBe(MESSAGE_RESEAU);

      await reessayer('erreur-module');
      serveur.expectNone(`/api/modules/${MODULE_1}`);
      await relire([MODULES[1]]);

      expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
      expect(valeurListe('Module')).toBe('');
    });

    it('après `preparation.module_invalide`, les Modules sont relus et le Module disparu n’est plus choisi', async () => {
      await ouvrir();

      await choisir('Module', 'Module 2');
      reglage().flush(
        { status: 400, code: 'preparation.module_invalide' },
        { status: 400, statusText: 'Bad Request' },
      );
      await stabiliser();
      serveur.expectOne(URL_MODULES).flush([MODULES[0]]);
      serveur.expectOne('/api/themes').flush(THEMES);
      await stabiliser();

      expect(bandeau('erreur-enregistrement')).toBe(
        "Ce module n'appartient plus à l'album. Choisissez-en un autre.",
      );
      expect(valeurListe('Module')).toBe('');

      await reessayer('erreur-enregistrement');
      const requete = reglage();
      expect(requete.request.body.moduleId).toBeNull();
      requete.flush({ ...PREPARATION, moduleId: undefined, nomModule: undefined });
      await stabiliser();
      expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
    });
  });

  describe('Thèmes (story 2.2, partie 3)', () => {
    const URL_THEMES = '/api/themes';
    const SAISONS: ThemeDto = {
      id: '0190f0a0-0000-7000-8000-00000000c009',
      nom: 'Les saisons',
      createurId: MOI,
    };
    const SANS_THEME: PreparationDto = {
      ...PREPARATION,
      themeDefautId: undefined,
      nomThemeDefaut: undefined,
    };

    afterEach(() =>
      document
        .querySelectorAll('.cdk-overlay-container')
        .forEach((surcouche) => surcouche.remove()),
    );

    /** L'enseignant connecté est `MOI`, administrateur ou non. */
    function connecter(administrateur = false) {
      TestBed.inject(CompteCourant).mettreAJour({
        id: MOI,
        administrateur,
        email: 'moi@ecole.fr',
        nomAffiche: 'Moi',
      });
    }

    const champNom = () => racine.querySelector<HTMLInputElement>('app-champ-nom-module input');
    const etiquetteChampNom = () =>
      racine.querySelector('app-champ-nom-module mat-label')?.textContent?.trim();
    const erreurChampNom = () => racine.querySelector('app-champ-nom-module [role="alert"]');
    const erreurChampThemes = () => racine.querySelector('app-champ-themes [role="alert"]');
    const puce = () => racine.querySelector<HTMLElement>('app-champ-themes mat-chip-row');
    const propositions = () =>
      [...document.querySelectorAll('.cdk-overlay-pane mat-option')].map((option) =>
        option.textContent?.replace(/\s+/g, ' ').trim(),
      );

    async function taperNom(nom: string) {
      champNom()!.value = nom;
      champNom()!.dispatchEvent(new Event('input'));
      await stabiliser();
      champNom()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await stabiliser();
    }

    async function actionDeLEtiquette(libelle: 'Renommer' | 'Supprimer') {
      puce()!.click();
      await stabiliser();
      [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane [mat-menu-item]')]
        .find((item) => item.textContent?.trim() === libelle)!
        .click();
      await stabiliser();
    }

    async function repondreConfirmation(bouton: 'confirmer' | 'annuler') {
      document.querySelector<HTMLButtonElement>(`.dialogue-confirmation__${bouton}`)!.click();
      await stabiliser();
    }

    /** Répond à la relecture qui suit une suppression : Préparation sans Thème par défaut, puis listes. */
    async function relire(themes: ThemeDto[], relue: PreparationDto = SANS_THEME) {
      serveur.expectOne(`/api/preparations/${ID}`).flush(relue);
      await stabiliser();
      serveur.expectOne(`/api/albums/${ALBUM}/modules`).flush(MODULES);
      serveur.expectOne(URL_THEMES).flush(themes);
      await stabiliser();
    }

    it('frappe : Thèmes proposés, puis « Créer le thème « … » » ; Entrée crée, choisit et enregistre', async () => {
      await ouvrir({ ...SANS_THEME, tempsPasseMinutes: 60 });

      await taperTheme('cuis');
      expect(propositions()).toEqual(['cuisine', 'Créer le thème « cuis »']);
      await taperTheme('Les saisons');
      expect(propositions()).toEqual(['Créer le thème « Les saisons »']);

      toucheClavier(saisieThemes(), 'Enter', 13);
      await stabiliser();
      const creation = serveur.expectOne(URL_THEMES);
      expect(creation.request.method).toBe('POST');
      expect(creation.request.body).toEqual({ nom: 'Les saisons' });
      creation.flush(SAISONS);
      await stabiliser();

      const requete = reglage();
      expect(requete.request.body).toEqual({
        moduleId: MODULE_1,
        themeDefautId: SAISONS.id,
        tempsPasseMinutes: 60,
      });
      requete.flush({
        ...PREPARATION,
        themeDefautId: SAISONS.id,
        nomThemeDefaut: 'Les saisons',
        tempsPasseMinutes: 60,
      });
      await stabiliser();

      expect(etiquettesThemes()).toEqual(['Les saisons']);
      expect(saisieThemes().value).toBe('');
    });

    it('au clavier : un autre Thème remplace l’étiquette, Retour arrière la retire, chaque fois enregistré', async () => {
      await ouvrir();

      await choisirThemeAuClavier('anim');
      const choix = reglage();
      expect(choix.request.body.themeDefautId).toBe(ANIMAUX);
      choix.flush({ ...PREPARATION, themeDefautId: ANIMAUX, nomThemeDefaut: 'animaux' });
      await stabiliser();
      expect(etiquettesThemes()).toEqual(['animaux']);

      saisieThemes().focus();
      toucheClavier(saisieThemes(), 'Backspace', 8);
      await stabiliser();
      const retrait = reglage();
      expect(retrait.request.body.themeDefautId).toBeNull();
      retrait.flush(SANS_THEME);
      await stabiliser();
      expect(etiquettesThemes()).toEqual([]);
    });

    it('échec de la création : message traduit sous le champ, la saisie reste, rien n’est enregistré', async () => {
      await ouvrir();

      await choisirThemeAuClavier('Les saisons');
      serveur
        .expectOne(URL_THEMES)
        .flush(
          { status: 409, code: 'theme.deja_existant' },
          { status: 409, statusText: 'Conflict' },
        );
      await stabiliser();

      expect(erreurChampThemes()?.textContent?.trim()).toBe('Un thème de ce nom existe déjà.');
      expect(saisieThemes().getAttribute('aria-describedby')).toContain(erreurChampThemes()!.id);
      expect(saisieThemes().value).toBe('Les saisons');
      expect(etiquettesThemes()).toEqual(['cuisine']);
      serveur.expectNone(URL_REGLAGES);
    });

    it('menu de l’étiquette : proposé au créateur, étiqueté pour le lecteur d’écran', async () => {
      connecter();
      await ouvrir();

      expect(puce()!.getAttribute('aria-haspopup')).toBe('menu');
      expect(puce()!.querySelector('[matchipaction]')!.getAttribute('aria-description')).toBe(
        'Entrée : renommer ou supprimer le thème',
      );
    });

    it('menu de l’étiquette : absent pour le Thème d’un collègue', async () => {
      connecter();
      await ouvrir({ ...PREPARATION, themeDefautId: ANIMAUX, nomThemeDefaut: 'animaux' });

      expect(etiquettesThemes()).toEqual(['animaux']);
      expect(puce()!.getAttribute('aria-haspopup')).toBeNull();
    });

    it('menu de l’étiquette : proposé à l’administrateur sur le Thème d’un collègue', async () => {
      connecter(true);
      await ouvrir({ ...PREPARATION, themeDefautId: ANIMAUX, nomThemeDefaut: 'animaux' });

      expect(puce()!.getAttribute('aria-haspopup')).toBe('menu');
    });

    it('« Renommer » : champ en ligne prérempli, Entrée renomme, l’étiquette montre le nouveau nom', async () => {
      connecter();
      await ouvrir();

      await actionDeLEtiquette('Renommer');
      expect(etiquetteChampNom()).toBe('Nouveau nom du thème');
      expect(champNom()!.value).toBe('cuisine');
      expect(document.activeElement).toBe(champNom());

      await taperNom('repas');
      const renommage = serveur.expectOne(`${URL_THEMES}/${CUISINE}/nom`);
      expect(renommage.request.method).toBe('PUT');
      expect(renommage.request.body).toEqual({ nom: 'repas' });
      renommage.flush({ ...THEMES[1], nom: 'repas' });
      await stabiliser();

      serveur.expectNone(URL_REGLAGES);
      expect(champNom()).toBeNull();
      expect(etiquettesThemes()).toEqual(['repas']);
      expect(document.activeElement).toBe(saisieThemes());
    });

    it('échec du renommage : message traduit sous le champ, qui reste ouvert', async () => {
      connecter();
      await ouvrir();

      await actionDeLEtiquette('Renommer');
      await taperNom('animaux');
      serveur
        .expectOne(`${URL_THEMES}/${CUISINE}/nom`)
        .flush(
          { status: 409, code: 'theme.deja_existant' },
          { status: 409, statusText: 'Conflict' },
        );
      await stabiliser();

      expect(erreurChampNom()?.textContent?.trim()).toBe('Un thème de ce nom existe déjà.');
      expect(champNom()!.value).toBe('animaux');
    });

    it('« Supprimer » confirmé : suppression, puis la Préparation et les Thèmes sont relus', async () => {
      connecter();
      await ouvrir();

      await actionDeLEtiquette('Supprimer');
      expect(document.querySelector('app-dialogue-confirmation h2')?.textContent?.trim()).toBe(
        'Supprimer le thème ?',
      );
      expect(document.querySelector('.dialogue-confirmation__phrase')?.textContent).toContain(
        '« cuisine »',
      );
      await repondreConfirmation('confirmer');

      const suppression = serveur.expectOne(`${URL_THEMES}/${CUISINE}`);
      expect(suppression.request.method).toBe('DELETE');
      suppression.flush('');
      await stabiliser();
      // La Préparation relue porte un autre Module : seul le Thème reprend la valeur relue.
      await relire([THEMES[0]], { ...SANS_THEME, moduleId: MODULE_2, nomModule: 'Module 2' });

      expect(etiquettesThemes()).toEqual([]);
      expect(valeurListe('Module')).toBe('Module 1');
      expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
      expect(document.activeElement).toBe(saisieThemes());
      serveur.expectNone(URL_REGLAGES);
    });

    it('suppression répondue 404 (déjà supprimé) : la Préparation et les Thèmes sont relus, sans Bandeau', async () => {
      connecter();
      await ouvrir();

      await actionDeLEtiquette('Supprimer');
      await repondreConfirmation('confirmer');
      // Opération sans corps de réponse : le client généré lit l'erreur RFC 9457 en texte.
      serveur
        .expectOne(`${URL_THEMES}/${CUISINE}`)
        .flush(JSON.stringify({ status: 404, code: 'ressource.introuvable' }), {
          status: 404,
          statusText: 'Not Found',
        });
      await stabiliser();
      await relire([THEMES[0]]);

      expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
      expect(etiquettesThemes()).toEqual([]);
    });

    it('suppression refusée 403 : Bandeau d’erreur, « Réessayer » ne renvoie pas la suppression', async () => {
      connecter();
      await ouvrir();

      await actionDeLEtiquette('Supprimer');
      await repondreConfirmation('confirmer');
      serveur
        .expectOne(`${URL_THEMES}/${CUISINE}`)
        .flush(JSON.stringify({ status: 403, code: 'theme.reserve_au_createur' }), {
          status: 403,
          statusText: 'Forbidden',
        });
      await stabiliser();

      expect(bandeau('erreur-theme')).toBe(
        "Seuls le créateur du thème et l'administrateur peuvent le modifier.",
      );
      await reessayer('erreur-theme');

      serveur.expectNone(`${URL_THEMES}/${CUISINE}`);
      expect(racine.querySelector('app-bandeau-erreur.erreur-theme')).toBeNull();
      expect(etiquettesThemes()).toEqual(['cuisine']);
    });

    it('échec de la relecture après suppression : Bandeau du Thème, « Réessayer » relit et reprend le Thème', async () => {
      connecter();
      await ouvrir();

      await actionDeLEtiquette('Supprimer');
      await repondreConfirmation('confirmer');
      serveur.expectOne(`${URL_THEMES}/${CUISINE}`).flush('');
      await stabiliser();
      serveur.expectOne(`/api/preparations/${ID}`).error(new ProgressEvent('error'));
      await stabiliser();

      expect(bandeau('erreur-theme')).toBe(MESSAGE_RESEAU);
      expect(racine.querySelector('app-bandeau-erreur.erreur-module')).toBeNull();

      await reessayer('erreur-theme');
      serveur.expectNone(`${URL_THEMES}/${CUISINE}`);
      await relire([THEMES[0]], {
        ...PREPARATION,
        themeDefautId: ANIMAUX,
        nomThemeDefaut: 'animaux',
      });

      expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
      expect(etiquettesThemes()).toEqual(['animaux']);
    });

    it('« Supprimer » annulé : rien n’est envoyé', async () => {
      connecter();
      await ouvrir();

      await actionDeLEtiquette('Supprimer');
      await repondreConfirmation('annuler');

      serveur.expectNone(`${URL_THEMES}/${CUISINE}`);
      expect(etiquettesThemes()).toEqual(['cuisine']);
    });

    it('Thème utilisé : Bandeau d’erreur explicite, « Réessayer » ne renvoie pas la suppression', async () => {
      connecter();
      await ouvrir();

      await actionDeLEtiquette('Supprimer');
      await repondreConfirmation('confirmer');
      // Opération sans corps de réponse : le client généré lit l'erreur RFC 9457 en texte.
      serveur
        .expectOne(`${URL_THEMES}/${CUISINE}`)
        .flush(JSON.stringify({ status: 409, code: 'theme.utilise' }), {
          status: 409,
          statusText: 'Conflict',
        });
      await stabiliser();

      expect(bandeau('erreur-theme')).toBe(
        'Ce thème est utilisé par des images : réaffectez-les avant de le supprimer.',
      );
      await reessayer('erreur-theme');

      serveur.expectNone(`${URL_THEMES}/${CUISINE}`);
      expect(racine.querySelector('app-bandeau-erreur.erreur-theme')).toBeNull();
      expect(etiquettesThemes()).toEqual(['cuisine']);
    });

    it('échec réseau de la suppression : « Réessayer » la renvoie', async () => {
      connecter();
      await ouvrir();

      await actionDeLEtiquette('Supprimer');
      await repondreConfirmation('confirmer');
      serveur.expectOne(`${URL_THEMES}/${CUISINE}`).error(new ProgressEvent('error'));
      await stabiliser();
      expect(bandeau('erreur-theme')).toBe(MESSAGE_RESEAU);

      await reessayer('erreur-theme');
      serveur.expectOne(`${URL_THEMES}/${CUISINE}`).flush('');
      await stabiliser();
      await relire([THEMES[0]]);

      expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
      expect(etiquettesThemes()).toEqual([]);
    });

    it('après `preparation.theme_introuvable`, les Thèmes sont relus et le Thème disparu n’est plus choisi', async () => {
      await ouvrir();

      await choisirThemeAuClavier('anim');
      reglage().flush(
        { status: 400, code: 'preparation.theme_introuvable' },
        { status: 400, statusText: 'Bad Request' },
      );
      await stabiliser();
      serveur.expectOne(`/api/albums/${ALBUM}/modules`).flush(MODULES);
      serveur.expectOne(URL_THEMES).flush([THEMES[1]]);
      await stabiliser();

      expect(bandeau('erreur-enregistrement')).toBe(
        "Ce thème n'existe plus. Choisissez-en un autre.",
      );
      expect(etiquettesThemes()).toEqual([]);

      await reessayer('erreur-enregistrement');
      const requete = reglage();
      expect(requete.request.body.themeDefautId).toBeNull();
      requete.flush(SANS_THEME);
      await stabiliser();
      expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
    });
  });
});

describe('Libellés', () => {
  it('libellé des Mots déjà illustrés', () => {
    expect([0, 1, 3].map(libelleIllustres)).toEqual([
      '0 déjà illustrés',
      '1 déjà illustré',
      '3 déjà illustrés',
    ]);
  });
});

describe('Temps passé', () => {
  it.each([
    ['3,5', 210],
    ['3.5', 210],
    [' 1 ', 60],
    ['0', 0],
    ['0,5', 30],
    ['100', 6000],
    ['', null],
    ['  ', null],
  ])('« %s » h → %s minutes', (saisie, minutes) => {
    expect(heuresEnMinutes(saisie)).toBe(minutes);
  });

  it.each(['3,2', '100,5', '101', '-1', 'abc', '1,5h', '1e1', ',5', '1,'])(
    '« %s » est refusé',
    (saisie) => {
      expect(heuresEnMinutes(saisie)).toBeUndefined();
    },
  );

  it.each([
    [210, '3,5'],
    [60, '1'],
    [0, '0'],
    [6000, '100'],
    [45, '0,75'],
    [null, ''],
    [undefined, ''],
  ])('%s minutes → « %s » h', (minutes, heures) => {
    expect(minutesEnHeures(minutes)).toBe(heures);
  });
});
