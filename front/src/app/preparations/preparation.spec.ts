import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { Title } from '@angular/platform-browser';
import { AlbumDto } from '../api/models/album-dto';
import { ModuleDto } from '../api/models/module-dto';
import { MotPreparationDto } from '../api/models/mot-preparation-dto';
import { PreparationDto } from '../api/models/preparation-dto';
import { ThemeDto } from '../api/models/theme-dto';
import { BandeauAnnuler } from '../commun/bandeau-annuler/bandeau-annuler';
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

/** Album d'une Préparation, créé par `createurId` (un collègue par défaut : pas de menu « Actions de l'album »). */
function albumDe(preparation: PreparationDto, createurId: string = COLLEGUE): AlbumDto {
  return {
    id: preparation.albumId,
    titre: preparation.titreAlbum,
    auteur: 'Natha Caputo',
    createurId,
    nombreModules: 2,
  };
}

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
const URL_MOTS = `/api/preparations/${ID}/mots`;

/** Mot de la Préparation, « à illustrer », avec le Sens par défaut. */
function motPreparation(forme: string, ordre: number): MotPreparationDto {
  const suffixe = String(ordre).padStart(4, '0');
  return {
    id: `0190f0a0-0000-7000-8000-0000000f${suffixe}`,
    motId: `0190f0a0-0000-7000-8000-0000000e${suffixe}`,
    forme,
    ordre,
    sens: { id: `0190f0a0-0000-7000-8000-0000000d${suffixe}`, libelle: 'à compléter' },
    illustre: false,
  };
}

const MOT_CITROUILLE = motPreparation('citrouille', 1);

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
  /** Mot de chaque Carte de la Grille, dans l'ordre. */
  const cartes = () =>
    [...racine.querySelectorAll('.mots__grille app-carte-mot .carte-mot__mot')].map((mot) =>
      mot.textContent?.trim(),
    );

  /**
   * Répond à la lecture de la Préparation, puis à celle de son Album, aux listes de Modules et de Thèmes et à ses Mots.
   */
  async function ouvrir(
    preparation: PreparationDto = PREPARATION,
    modules: ModuleDto[] = MODULES,
    themes: ThemeDto[] = THEMES,
    album: AlbumDto = albumDe(preparation),
    mots: MotPreparationDto[] = [],
  ) {
    serveur.expectOne(`/api/preparations/${preparation.id}`).flush(preparation);
    await stabiliser();
    serveur.expectOne(`/api/albums/${preparation.albumId}`).flush(album);
    serveur.expectOne(`/api/albums/${preparation.albumId}/modules`).flush(modules);
    serveur.expectOne('/api/themes').flush(themes);
    serveur.expectOne(`/api/preparations/${preparation.id}/mots`).flush(mots);
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
    serveur.expectOne(`/api/albums/${ALBUM}`).flush(albumDe(PREPARATION));
    serveur.expectOne(`/api/albums/${ALBUM}/modules`).error(new ProgressEvent('error'));
    serveur.expectOne('/api/themes').flush(THEMES);
    serveur.expectOne(`/api/preparations/${ID}/mots`).flush([]);
    await stabiliser();

    expect(bandeau('erreur-listes')).toBe(MESSAGE_RESEAU);
    expect(texte('h1')).toBe('La Roule Galette');
    expect(texte('.entete__nom-module')).toBe('Module 1');
    expect(texte('.entete__nom-theme')).toBe('Thème par défaut : cuisine');

    await reessayer('erreur-listes');
    serveur.expectOne(`/api/albums/${ALBUM}`).flush(albumDe(PREPARATION));
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
    const albumA = serveur.expectOne(`/api/albums/${ALBUM}`);
    const modulesA = serveur.expectOne(`/api/albums/${ALBUM}/modules`);
    const [themesA] = serveur.match('/api/themes');
    const motsA = serveur.expectOne(`/api/preparations/${ID}/mots`);

    fixture.componentRef.setInput('id', AUTRE_ID);
    await stabiliser();
    await ouvrir(LOUP, MODULES_LOUP, THEMES);
    albumA.flush(albumDe(PREPARATION, MOI));
    modulesA.flush(MODULES);
    themesA.flush(THEMES);
    motsA.flush([MOT_CITROUILLE]);
    await stabiliser();
    expect(cartes()).toEqual([]);

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
      serveur.expectOne(`/api/albums/${ALBUM}`).flush(albumDe(PREPARATION));
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
      serveur.expectOne(`/api/albums/${ALBUM}`).flush(albumDe(PREPARATION));
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
      serveur.expectOne(`/api/albums/${ALBUM}`).flush(albumDe(PREPARATION));
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
      serveur.expectOne(`/api/albums/${ALBUM}`).flush(albumDe(PREPARATION));
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

  describe('Corriger l’album (story 2.2, partie 4)', () => {
    const URL_ALBUM = `/api/albums/${ALBUM}`;

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

    const boutonActions = () =>
      racine.querySelector<HTMLButtonElement>('button[aria-label="Actions de l\'album"]');
    const champDuDialogue = (etiquette: string) =>
      [...document.querySelectorAll<HTMLElement>('app-corriger-album mat-form-field')]
        .find((element) => element.querySelector('mat-label')?.textContent?.trim() === etiquette)!
        .querySelector<HTMLInputElement>('input')!;
    const boutonDuDialogue = (libelle: string) =>
      [...document.querySelectorAll<HTMLButtonElement>('app-corriger-album button')].find(
        (bouton) => bouton.textContent?.trim() === libelle,
      )!;

    async function ouvrirCorrection() {
      boutonActions()!.click();
      await stabiliser();
      [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane [mat-menu-item]')]
        .find((item) => item.textContent?.trim() === "Corriger l'album")!
        .click();
      await stabiliser();
    }

    it('menu « Actions de l’album » : affiché pour le créateur de l’Album, étiqueté, au clavier', async () => {
      connecter();
      await ouvrir(PREPARATION, MODULES, THEMES, albumDe(PREPARATION, MOI));

      expect(boutonActions()).not.toBeNull();
      expect(boutonActions()!.tabIndex).toBe(0);
      expect(boutonActions()!.closest('.entete__ligne-titre')?.querySelector('h1')).not.toBeNull();
    });

    it('menu « Actions de l’album » : absent pour l’Album d’un collègue', async () => {
      connecter();
      await ouvrir();

      expect(boutonActions()).toBeNull();
    });

    it('menu « Actions de l’album » : affiché pour l’administrateur sur l’Album d’un collègue', async () => {
      connecter(true);
      await ouvrir();

      expect(boutonActions()).not.toBeNull();
    });

    it('« Corriger l’album » : dialogue prérempli ; « Enregistrer » corrige, l’En-tête et l’onglet suivent', async () => {
      connecter();
      await ouvrir(PREPARATION, MODULES, THEMES, {
        ...albumDe(PREPARATION, MOI),
        titre: 'La Roule Galete',
        editeur: 'Milan',
      });

      await ouvrirCorrection();
      expect(document.querySelector('app-corriger-album h2')?.textContent?.trim()).toBe(
        "Corriger l'album",
      );
      expect(champDuDialogue('Titre').value).toBe('La Roule Galete');
      expect(champDuDialogue('Auteur').value).toBe('Natha Caputo');
      expect(champDuDialogue('Éditeur (facultatif)').value).toBe('Milan');

      champDuDialogue('Titre').value = 'La Roule Galette ';
      champDuDialogue('Titre').dispatchEvent(new Event('input'));
      await stabiliser();
      boutonDuDialogue('Enregistrer').click();
      await stabiliser();

      const correction = serveur.expectOne(URL_ALBUM);
      expect(correction.request.method).toBe('PUT');
      expect(correction.request.body).toEqual({
        titre: 'La Roule Galette',
        auteur: 'Natha Caputo',
        editeur: 'Milan',
      });
      correction.flush({
        ...albumDe(PREPARATION, MOI),
        titre: 'La Roule Galette corrigée',
        editeur: 'Milan',
      });
      await stabiliser();

      expect(document.querySelector('app-corriger-album')).toBeNull();
      expect(texte('h1')).toBe('La Roule Galette corrigée');
      expect(TestBed.inject(Title).getTitle()).toBe('La Roule Galette corrigée · corpus-mots');
      expect(document.activeElement).toBe(boutonActions());
      // Ni la Préparation ni les listes ne sont relues.
      serveur.expectNone(`/api/preparations/${ID}`);
      serveur.expectNone(`/api/albums/${ALBUM}/modules`);
    });

    it('l’Album de la Préparation quittée, répondu après la nouvelle, n’écrit rien', async () => {
      connecter();
      serveur.expectOne(`/api/preparations/${ID}`).flush(PREPARATION);
      await stabiliser();
      const albumA = serveur.expectOne(URL_ALBUM);
      serveur.expectOne(`/api/albums/${ALBUM}/modules`).flush(MODULES);
      serveur.expectOne('/api/themes').flush(THEMES);
      serveur.expectOne(`/api/preparations/${ID}/mots`).flush([]);

      fixture.componentRef.setInput('id', AUTRE_ID);
      await stabiliser();
      await ouvrir(LOUP, MODULES_LOUP, THEMES, albumDe(LOUP, COLLEGUE));
      expect(boutonActions()).toBeNull();

      albumA.flush(albumDe(PREPARATION, MOI));
      await stabiliser();

      expect(texte('h1')).toBe(LOUP.titreAlbum);
      expect(boutonActions()).toBeNull();
    });

    it('« Annuler » ferme le dialogue sans rien envoyer, le focus revient au bouton du menu', async () => {
      connecter();
      await ouvrir(PREPARATION, MODULES, THEMES, albumDe(PREPARATION, MOI));

      await ouvrirCorrection();
      champDuDialogue('Titre').value = 'Autre titre';
      champDuDialogue('Titre').dispatchEvent(new Event('input'));
      await stabiliser();
      boutonDuDialogue('Annuler').click();
      await stabiliser();

      expect(document.querySelector('app-corriger-album')).toBeNull();
      serveur.expectNone(URL_ALBUM);
      expect(texte('h1')).toBe('La Roule Galette');
      expect(document.activeElement).toBe(boutonActions());
    });
  });

  describe('Mots (story 2.3, partie 1)', () => {
    const champSaisie = () => racine.querySelector<HTMLInputElement>('app-saisie-rapide input')!;
    const erreurSaisie = () => texte('.saisie-rapide__erreur');

    /** Tape `saisie` dans le Champ de saisie rapide, puis Entrée. */
    async function taper(saisie: string) {
      champSaisie().value = saisie;
      champSaisie().dispatchEvent(new Event('input'));
      champSaisie().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      );
      await stabiliser();
    }

    /** Envoi en cours de `saisie`. */
    const ajout = (saisie: string): TestRequest =>
      serveur.expectOne(
        (requete) =>
          requete.method === 'POST' && requete.url === URL_MOTS && requete.body?.saisie === saisie,
      );

    const deja = () =>
      [
        { status: 409, code: 'preparation.mot_deja_present' },
        { status: 409, statusText: 'Conflict' },
      ] as const;

    it('Préparation sans Mot : « Ajouter un mot » a le focus et affiche « Entrée pour ajouter »', async () => {
      await ouvrir();

      expect(champSaisie().labels?.[0]?.textContent?.trim()).toBe('Ajouter un mot');
      expect(texte('.saisie-rapide__aide')).toBe('Entrée pour ajouter');
      expect(champSaisie().getAttribute('aria-describedby')).toBe(
        racine.querySelector('.saisie-rapide__aide')!.id,
      );
      expect(document.activeElement).toBe(champSaisie());
      expect(racine.querySelector('.mots')).toBeNull();
      expect(texte('.entete__compteur')).toBe('0 mots, 0 déjà illustrés');
    });

    it('Préparation avec des Mots : Grille dans l’ordre de saisie, Cartes « à illustrer », champ sans focus', async () => {
      await ouvrir({ ...PREPARATION, nombreMots: 2 }, MODULES, THEMES, albumDe(PREPARATION), [
        MOT_CITROUILLE,
        motPreparation('loup', 2),
      ]);

      expect(texte('.mots__titre')).toBe('Mots de la préparation');
      expect(cartes()).toEqual(['citrouille', 'loup']);
      expect(texte('app-carte-mot .carte-mot__etat')).toBe('à illustrer');
      expect(racine.querySelector('app-carte-mot')!.classList).toContain('carte-mot--a-illustrer');
      expect(document.activeElement).not.toBe(champSaisie());
      expect(texte('.entete__compteur')).toBe('2 mots, 0 déjà illustrés');
    });

    it('« la citrouille » puis Entrée : champ vidé et gardant le focus, Carte en fin de Grille, compteur à jour', async () => {
      await ouvrir({ ...PREPARATION, nombreMots: 1 }, MODULES, THEMES, albumDe(PREPARATION), [
        motPreparation('loup', 1),
      ]);
      champSaisie().focus();

      await taper('  la citrouille ');
      const requete = ajout('la citrouille');
      expect(champSaisie().value).toBe('');
      expect(document.activeElement).toBe(champSaisie());

      requete.flush(motPreparation('citrouille', 2));
      await stabiliser();

      expect(cartes()).toEqual(['loup', 'citrouille']);
      expect(document.activeElement).toBe(champSaisie());
      expect(texte('.entete__compteur')).toBe('2 mots, 0 déjà illustrés');
      expect(texte('p[aria-live="polite"]')).toBe('« citrouille » ajouté.');
    });

    it('le premier Mot ajouté affiche « 1 mot, 0 déjà illustré »', async () => {
      await ouvrir();

      await taper('la citrouille');
      ajout('la citrouille').flush(MOT_CITROUILLE);
      await stabiliser();

      expect(cartes()).toEqual(['citrouille']);
      expect(texte('.entete__compteur')).toBe('1 mot, 0 déjà illustré');
    });

    it('une saisie vide ou blanche n’est pas envoyée', async () => {
      await ouvrir();

      await taper('   ');

      serveur.expectNone(URL_MOTS);
      expect(cartes()).toEqual([]);
    });

    it('trois Mots tapés vite : envoyés un à un dans l’ordre de frappe, Cartes dans le même ordre', async () => {
      await ouvrir();

      await taper('galette');
      await taper('le renard');
      await taper('un lapin');
      // Un seul envoi à la fois : le suivant part après la réponse du précédent.
      const premier = serveur.expectOne(URL_MOTS);
      expect(premier.request.body).toEqual({ saisie: 'galette' });
      premier.flush(motPreparation('galette', 1));
      await stabiliser();
      const deuxieme = serveur.expectOne(URL_MOTS);
      expect(deuxieme.request.body).toEqual({ saisie: 'le renard' });
      deuxieme.flush(motPreparation('renard', 2));
      await stabiliser();
      const troisieme = serveur.expectOne(URL_MOTS);
      expect(troisieme.request.body).toEqual({ saisie: 'un lapin' });
      troisieme.flush(motPreparation('lapin', 3));
      await stabiliser();

      expect(cartes()).toEqual(['galette', 'renard', 'lapin']);
      expect(texte('.entete__compteur')).toBe('3 mots, 0 déjà illustrés');
    });

    it('Mot déjà présent : message sous le champ, saisie remise dans le champ resté vide', async () => {
      await ouvrir({ ...PREPARATION, nombreMots: 1 }, MODULES, THEMES, albumDe(PREPARATION), [
        MOT_CITROUILLE,
      ]);

      await taper('la Citrouille');
      ajout('la Citrouille').flush(...deja());
      await stabiliser();

      expect(erreurSaisie()).toBe('Ce mot est déjà dans la préparation : « la Citrouille ».');
      const erreur = racine.querySelector('.saisie-rapide__erreur')!;
      expect(erreur.getAttribute('role')).toBe('alert');
      expect(champSaisie().getAttribute('aria-describedby')).toContain(erreur.id);
      expect(champSaisie().value).toBe('la Citrouille');
      expect(cartes()).toEqual(['citrouille']);
      expect(racine.querySelector('app-bandeau-erreur')).toBeNull();

      // La frappe suivante efface le message.
      champSaisie().value = 'la Citrouill';
      champSaisie().dispatchEvent(new Event('input'));
      await stabiliser();
      expect(erreurSaisie()).toBeUndefined();
    });

    it('Mot déjà présent pendant la frappe du suivant : la saisie en cours est gardée', async () => {
      await ouvrir({ ...PREPARATION, nombreMots: 1 }, MODULES, THEMES, albumDe(PREPARATION), [
        MOT_CITROUILLE,
      ]);

      await taper('citrouille');
      champSaisie().value = 'lo';
      champSaisie().dispatchEvent(new Event('input'));
      ajout('citrouille').flush(...deja());
      await stabiliser();

      // Le message nomme le Mot refusé, que le champ ne montre plus.
      expect(champSaisie().value).toBe('lo');
      expect(erreurSaisie()).toBe('Ce mot est déjà dans la préparation : « citrouille ».');
    });

    it('autre échec : Bandeau qui nomme le Mot, la suite est envoyée, « Réessayer » le renvoie', async () => {
      await ouvrir();

      await taper('citrouille');
      await taper('loup');
      ajout('citrouille').error(new ProgressEvent('error'));
      await stabiliser();
      expect(bandeau('erreur-ajout')).toBe(`« citrouille » n'a pas été ajouté. ${MESSAGE_RESEAU}`);
      expect(champSaisie().value).toBe('');

      ajout('loup').error(new ProgressEvent('error'));
      await stabiliser();
      expect(bandeau('erreur-ajout')).toBe(
        `« citrouille », « loup » n'ont pas été ajoutés. ${MESSAGE_RESEAU}`,
      );

      await reessayer('erreur-ajout');
      expect(racine.querySelector('app-bandeau-erreur.erreur-ajout')).toBeNull();
      ajout('citrouille').flush(MOT_CITROUILLE);
      await stabiliser();
      ajout('loup').flush(motPreparation('loup', 2));
      await stabiliser();

      expect(cartes()).toEqual(['citrouille', 'loup']);
      expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
    });

    it('échec du chargement des Mots : leur propre Bandeau, « Réessayer » les relit', async () => {
      serveur.expectOne(`/api/preparations/${ID}`).flush({ ...PREPARATION, nombreMots: 1 });
      await stabiliser();
      serveur.expectOne(`/api/albums/${ALBUM}`).flush(albumDe(PREPARATION));
      serveur.expectOne(`/api/albums/${ALBUM}/modules`).flush(MODULES);
      serveur.expectOne('/api/themes').flush(THEMES);
      serveur.expectOne(URL_MOTS).error(new ProgressEvent('error'));
      await stabiliser();

      expect(bandeau('erreur-mots')).toBe(MESSAGE_RESEAU);
      expect(racine.querySelector('app-saisie-rapide')).toBeNull();
      expect(texte('.entete__compteur')).toBe('1 mot, 0 déjà illustré');

      await reessayer('erreur-mots');
      serveur.expectOne(URL_MOTS).flush([MOT_CITROUILLE]);
      await stabiliser();

      expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
      expect(cartes()).toEqual(['citrouille']);
    });

    it('un ajout répondu après l’ouverture d’une autre Préparation n’écrit rien', async () => {
      await ouvrir();
      await taper('citrouille');
      const requete = ajout('citrouille');

      fixture.componentRef.setInput('id', AUTRE_ID);
      await stabiliser();
      await ouvrir(LOUP, MODULES_LOUP, THEMES);
      requete.flush(MOT_CITROUILLE);
      await stabiliser();

      expect(cartes()).toEqual([]);
      expect(texte('.entete__compteur')).toBe('0 mots, 0 déjà illustrés');
    });
  });

  describe('Retrait d’un Mot (story 2.3, partie 2)', () => {
    const GALETTE = motPreparation('galette', 1);
    const CITROUILLE = motPreparation('citrouille', 2);
    const LAPIN = motPreparation('lapin', 3);
    const URL_RETABLISSEMENT = `${URL_MOTS}/retablissement`;

    let afficher: ReturnType<typeof vi.fn<(message: string, annuler: () => unknown) => void>>;

    beforeEach(() => {
      afficher = vi.fn<(message: string, annuler: () => unknown) => void>();
      vi.spyOn(TestBed.inject(BandeauAnnuler), 'afficher').mockImplementation(afficher);
    });

    const boutonRetirer = (forme: string) =>
      racine.querySelector<HTMLButtonElement>(
        `app-carte-mot button[aria-label="Retirer « ${forme} » de la préparation"]`,
      )!;
    const champSaisie = () => racine.querySelector<HTMLInputElement>('app-saisie-rapide input')!;
    const retrait = (mot: MotPreparationDto): TestRequest =>
      serveur.expectOne(
        (requete) => requete.method === 'DELETE' && requete.url === `${URL_MOTS}/${mot.id}`,
      );
    const retablissement = (): TestRequest =>
      serveur.expectOne(
        (requete) => requete.method === 'POST' && requete.url === URL_RETABLISSEMENT,
      );

    async function ouvrirAvec(mots: MotPreparationDto[]) {
      await ouvrir(
        { ...PREPARATION, nombreMots: mots.length },
        MODULES,
        THEMES,
        albumDe(PREPARATION),
        mots,
      );
    }

    async function retirer(forme: string) {
      boutonRetirer(forme).focus();
      boutonRetirer(forme).click();
      await stabiliser();
    }

    /** « Annuler » du dernier Bandeau « Annuler » affiché. */
    async function annuler() {
      afficher.mock.lastCall![1]();
      await stabiliser();
    }

    it('« Retirer » : la Carte disparaît sans confirmation, le compteur baisse, le focus passe à la suivante', async () => {
      await ouvrirAvec([GALETTE, CITROUILLE, LAPIN]);

      await retirer('citrouille');

      expect(cartes()).toEqual(['galette', 'lapin']);
      expect(texte('.entete__compteur')).toBe('2 mots, 0 déjà illustrés');
      expect(document.activeElement).toBe(boutonRetirer('lapin'));
      expect(document.querySelector('mat-dialog-container')).toBeNull();
      expect(afficher).not.toHaveBeenCalled();

      retrait(CITROUILLE).flush(CITROUILLE);
      await stabiliser();

      expect(afficher).toHaveBeenCalledTimes(1);
      expect(afficher.mock.lastCall![0]).toBe('« citrouille » retiré de la préparation.');
      expect(cartes()).toEqual(['galette', 'lapin']);
    });

    it('« Annuler » : le Mot revient à sa place avec son Sens, son bouton « Retirer » a le focus', async () => {
      const animal = { ...CITROUILLE, sens: { id: CITROUILLE.sens.id, libelle: 'légume', categorie: 'nom' } };
      await ouvrirAvec([GALETTE, animal, LAPIN]);
      await retirer('citrouille');
      retrait(animal).flush(animal);
      await stabiliser();

      await annuler();
      const requete = retablissement();
      expect(requete.request.body).toEqual({
        motId: animal.motId,
        sensId: animal.sens.id,
        ordre: 2,
      });
      const retabli = { ...animal, id: '0190f0a0-0000-7000-8000-0000000f9002' };
      requete.flush(retabli, { status: 201, statusText: 'Created' });
      await stabiliser();

      expect(cartes()).toEqual(['galette', 'citrouille', 'lapin']);
      expect(texte('.entete__compteur')).toBe('3 mots, 0 déjà illustrés');
      expect(document.activeElement).toBe(boutonRetirer('citrouille'));
      expect(texte('p[aria-live="polite"]')).toBe('« citrouille » rétabli.');
    });

    it('Mot rétabli en fin (place prise) : sa Carte va en fin de Grille', async () => {
      await ouvrirAvec([GALETTE, CITROUILLE]);
      await retirer('galette');
      retrait(GALETTE).flush(GALETTE);
      await stabiliser();

      await annuler();
      retablissement().flush({ ...GALETTE, id: '0190f0a0-0000-7000-8000-0000000f9001', ordre: 3 });
      await stabiliser();

      expect(cartes()).toEqual(['citrouille', 'galette']);
    });

    it('focus après retrait : la Carte précédente pour la dernière, le Champ de saisie pour la seule', async () => {
      await ouvrirAvec([GALETTE, CITROUILLE]);

      await retirer('citrouille');
      expect(document.activeElement).toBe(boutonRetirer('galette'));
      retrait(CITROUILLE).flush(CITROUILLE);
      await stabiliser();

      await retirer('galette');
      expect(cartes()).toEqual([]);
      expect(document.activeElement).toBe(champSaisie());
      expect(texte('.entete__compteur')).toBe('0 mots, 0 déjà illustrés');
      retrait(GALETTE).flush(GALETTE);
      await stabiliser();
    });

    it('échec du retrait : la Carte revient à sa place, Bandeau d’erreur, « Réessayer » la retire', async () => {
      await ouvrirAvec([GALETTE, CITROUILLE, LAPIN]);
      await retirer('citrouille');

      retrait(CITROUILLE).error(new ProgressEvent('error'));
      await stabiliser();

      expect(cartes()).toEqual(['galette', 'citrouille', 'lapin']);
      expect(bandeau('erreur-retrait')).toBe(`« citrouille » n'a pas été retiré. ${MESSAGE_RESEAU}`);
      expect(afficher).not.toHaveBeenCalled();

      await reessayer('erreur-retrait');
      expect(racine.querySelector('app-bandeau-erreur.erreur-retrait')).toBeNull();
      expect(cartes()).toEqual(['galette', 'lapin']);
      expect(document.activeElement).toBe(boutonRetirer('lapin'));
      retrait(CITROUILLE).flush(CITROUILLE);
      await stabiliser();

      expect(afficher).toHaveBeenCalledTimes(1);
    });

    it('échec du rétablissement : Bandeau d’erreur, « Réessayer » le renvoie', async () => {
      await ouvrirAvec([GALETTE, CITROUILLE]);
      await retirer('citrouille');
      retrait(CITROUILLE).flush(CITROUILLE);
      await stabiliser();

      await annuler();
      retablissement().error(new ProgressEvent('error'));
      await stabiliser();

      expect(cartes()).toEqual(['galette']);
      expect(bandeau('erreur-retablissement')).toBe(
        `« citrouille » n'a pas été rétabli. ${MESSAGE_RESEAU}`,
      );

      await reessayer('erreur-retablissement');
      expect(racine.querySelector('app-bandeau-erreur.erreur-retablissement')).toBeNull();
      retablissement().flush(CITROUILLE);
      await stabiliser();

      expect(cartes()).toEqual(['galette', 'citrouille']);
      expect(document.activeElement).toBe(boutonRetirer('citrouille'));
    });

    it('Mot revenu entre-temps (409) : message seul, sans « Réessayer »', async () => {
      await ouvrirAvec([GALETTE, CITROUILLE]);
      await retirer('citrouille');
      retrait(CITROUILLE).flush(CITROUILLE);
      await stabiliser();

      await annuler();
      retablissement().flush(
        { status: 409, code: 'preparation.mot_deja_present' },
        { status: 409, statusText: 'Conflict' },
      );
      await stabiliser();

      expect(bandeau('erreur-retablissement')).toBe(
        "« citrouille » n'a pas été rétabli. Ce mot est déjà dans la préparation.",
      );
      const libelles = [
        ...racine.querySelectorAll('app-bandeau-erreur.erreur-retablissement button'),
      ].map((bouton) => bouton.textContent?.trim() || bouton.getAttribute('aria-label'));
      expect(libelles).toEqual(['Fermer']);
    });

    it('un retrait répondu après l’ouverture d’une autre Préparation n’affiche pas de Bandeau', async () => {
      await ouvrirAvec([GALETTE]);
      await retirer('galette');
      const requete = retrait(GALETTE);

      fixture.componentRef.setInput('id', AUTRE_ID);
      await stabiliser();
      await ouvrir(LOUP, MODULES_LOUP, THEMES);
      requete.flush(GALETTE);
      await stabiliser();

      expect(afficher).not.toHaveBeenCalled();
    });

    /** Ouvre l'autre Préparation, avec ses Mots. */
    async function ouvrirAutre(mots: MotPreparationDto[] = [motPreparation('loup', 1)]) {
      fixture.componentRef.setInput('id', AUTRE_ID);
      await stabiliser();
      await ouvrir({ ...LOUP, nombreMots: mots.length }, MODULES_LOUP, THEMES, albumDe(LOUP), mots);
    }

    it('un retrait en échec répondu après l’ouverture d’une autre Préparation n’écrit rien', async () => {
      await ouvrirAvec([GALETTE]);
      await retirer('galette');
      const requete = retrait(GALETTE);

      await ouvrirAutre();
      requete.error(new ProgressEvent('error'));
      await stabiliser();

      expect(cartes()).toEqual(['loup']);
      expect(racine.querySelector('app-bandeau-erreur.erreur-retrait')).toBeNull();
    });

    it('un rétablissement répondu après l’ouverture d’une autre Préparation n’écrit rien', async () => {
      await ouvrirAvec([GALETTE]);
      await retirer('galette');
      retrait(GALETTE).flush(GALETTE);
      await stabiliser();
      await annuler();
      const requete = retablissement();

      await ouvrirAutre();
      const annonceAvant = texte('p[aria-live="polite"]');
      requete.flush(GALETTE);
      await stabiliser();

      expect(cartes()).toEqual(['loup']);
      expect(texte('p[aria-live="polite"]')).toBe(annonceAvant);
    });

    it('« Annuler » après l’ouverture d’une autre Préparation : rétablit dans la première, n’écrit rien', async () => {
      await ouvrirAvec([GALETTE]);
      await retirer('galette');
      retrait(GALETTE).flush(GALETTE);
      await stabiliser();

      await ouvrirAutre();
      const annonceAvant = texte('p[aria-live="polite"]');
      await annuler();
      // Le rétablissement part vers la Préparation du retrait.
      retablissement().flush(GALETTE);
      await stabiliser();

      expect(cartes()).toEqual(['loup']);
      expect(texte('p[aria-live="polite"]')).toBe(annonceAvant);
      expect(racine.querySelector('app-bandeau-erreur.erreur-retablissement')).toBeNull();
    });

    it('« Annuler » en échec après l’ouverture d’une autre Préparation : pas de Bandeau', async () => {
      await ouvrirAvec([GALETTE]);
      await retirer('galette');
      retrait(GALETTE).flush(GALETTE);
      await stabiliser();

      await ouvrirAutre();
      await annuler();
      retablissement().error(new ProgressEvent('error'));
      await stabiliser();

      expect(cartes()).toEqual(['loup']);
      expect(racine.querySelector('app-bandeau-erreur.erreur-retablissement')).toBeNull();
    });

    it('deux retraits en échec : un seul Bandeau au pluriel, « Réessayer » les retire tous deux', async () => {
      await ouvrirAvec([GALETTE, CITROUILLE, LAPIN]);
      await retirer('galette');
      await retirer('lapin');
      retrait(GALETTE).error(new ProgressEvent('error'));
      await stabiliser();
      retrait(LAPIN).error(new ProgressEvent('error'));
      await stabiliser();

      expect(cartes()).toEqual(['galette', 'citrouille', 'lapin']);
      expect(bandeau('erreur-retrait')).toBe(
        `« galette », « lapin » n'ont pas été retirés. ${MESSAGE_RESEAU}`,
      );

      await reessayer('erreur-retrait');
      expect(cartes()).toEqual(['citrouille']);
      retrait(GALETTE).flush(GALETTE);
      retrait(LAPIN).flush(LAPIN);
      await stabiliser();

      expect(cartes()).toEqual(['citrouille']);
      expect(afficher).toHaveBeenCalledTimes(2);
    });

    it('échec du rétablissement, focus perdu : il revient au Champ de saisie rapide', async () => {
      await ouvrirAvec([GALETTE, CITROUILLE]);
      await retirer('citrouille');
      retrait(CITROUILLE).flush(CITROUILLE);
      await stabiliser();

      await annuler();
      (document.activeElement as HTMLElement | null)?.blur();
      expect(document.activeElement).toBe(document.body);
      retablissement().error(new ProgressEvent('error'));
      await stabiliser();

      expect(document.activeElement).toBe(champSaisie());
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

  it('à zéro, « déjà illustré » s’accorde avec le nombre de Mots', () => {
    expect([0, 1, 2].map((mots) => libelleIllustres(0, mots))).toEqual([
      '0 déjà illustrés',
      '0 déjà illustré',
      '0 déjà illustrés',
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
