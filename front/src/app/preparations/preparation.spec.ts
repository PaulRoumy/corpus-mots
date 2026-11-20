import { BreakpointObserver } from '@angular/cdk/layout';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { of } from 'rxjs';
import { AlbumDto } from '../api/models/album-dto';
import { DetectionImageDto } from '../api/models/detection-image-dto';
import { DetectionMotDto } from '../api/models/detection-mot-dto';
import { ModuleDto } from '../api/models/module-dto';
import { MotPreparationDto } from '../api/models/mot-preparation-dto';
import { PreparationDto } from '../api/models/preparation-dto';
import { RepriseMotPreparationDto } from '../api/models/reprise-mot-preparation-dto';
import { ThemeDto } from '../api/models/theme-dto';
import { BandeauAnnuler } from '../commun/bandeau-annuler/bandeau-annuler';
import { CompteCourant } from '../commun/compte-courant';
import { MESSAGE_RESEAU, MESSAGES_PAR_CODE } from '../commun/erreurs/message-erreur';
import { provideIcones } from '../commun/icones';
import { AjoutAvecSens, DELAI_DETECTION_MS } from './panneau-detection';
import {
  heuresEnMinutes,
  annonceAjoutAvecSens,
  libelleIllustres,
  MESSAGE_SENS_PLUS_PROPOSE,
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

/** Lecture des propositions à `url`, quel que soit le filtre `sensId` du Panneau de choix d'Image. */
const lecturePropositions = (url: string) => (requete: HttpRequest<unknown>) => requete.url === url;

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

  afterEach(() => {
    // Chaque Carte « à illustrer » cherche ses suggestions ARASAAC (story 2.4) : vérifié par `suggestions-arasaac.spec`.
    serveur.match((requete) => requete.url.startsWith('/api/arasaac/'));
    // L'Encart « mots déjà illustrés » lit ses candidats (story 2.9) : vérifié par `encart-mots-deja-illustres.spec`
    // et par le bloc « Encart » ci-dessous.
    serveur.match((requete) => requete.url.endsWith('/reprises'));
    serveur.verify();
  });

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
      // Carte « à illustrer » sur trois colonnes de la Grille, avec ses suggestions ARASAAC (story 2.4).
      expect(
        [...racine.querySelectorAll('.mots__element')].map((element) =>
          element.classList.contains('mots__element--a-illustrer'),
        ),
      ).toEqual([true, true]);
      expect(
        serveur
          .match((requete) => requete.url === '/api/arasaac/suggestions')
          .map((requete) => requete.request.params.get('mot')),
      ).toEqual(['citrouille', 'loup']);
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

    it('détection (story 2.7) : « fa » puis « farine » sans valider, panneau sous le champ, focus gardé ; Entrée ajoute et le masque', async () => {
      await ouvrir();
      champSaisie().focus();

      for (const saisie of ['f', 'fa', 'farine']) {
        champSaisie().value = saisie;
        champSaisie().dispatchEvent(new Event('input'));
        await fixture.whenStable();
      }
      await new Promise((fin) => setTimeout(fin, DELAI_DETECTION_MS + 20));
      await stabiliser();
      const detection = serveur.expectOne(
        (requete) => requete.url === `/api/preparations/${ID}/detection`,
      );
      expect(detection.request.params.get('saisie')).toBe('farine');
      detection.flush({
        forme: 'farine',
        mots: [
          {
            motId: 'm1',
            forme: 'farine',
            dejaDansLaPreparation: false,
            sens: [{ id: 's1', libelle: 'à compléter', categorie: null, aCompleter: true }],
            albums: [],
            images: [],
          },
        ],
      });
      await stabiliser();

      expect(texte('app-panneau-detection .detection__entete')).toBe(
        'farine — existe déjà · aucune image',
      );
      expect(texte('app-panneau-detection [aria-live="polite"]')).toBe(
        'farine — existe déjà · aucune image',
      );
      expect(document.activeElement).toBe(champSaisie());
      serveur.expectNone(URL_MOTS);

      champSaisie().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      );
      await stabiliser();
      ajout('farine').flush(motPreparation('farine', 1));
      await stabiliser();

      expect(cartes()).toEqual(['farine']);
      expect(racine.querySelector('app-panneau-detection')!.textContent?.trim()).toBe('');
      expect(document.activeElement).toBe(champSaisie());
    });

    it('détection : une autre Préparation ouverte recrée le champ vide, la saisie quittée n’est pas détectée', async () => {
      await ouvrir();
      champSaisie().value = 'farine';
      champSaisie().dispatchEvent(new Event('input'));
      await fixture.whenStable();

      fixture.componentRef.setInput('id', AUTRE_ID);
      await stabiliser();
      await ouvrir(LOUP, [], THEMES);
      await new Promise((fin) => setTimeout(fin, DELAI_DETECTION_MS + 20));
      await stabiliser();

      expect(champSaisie().value).toBe('');
      serveur.expectNone((requete) => requete.url.endsWith('/detection'));
      expect(racine.querySelector('app-panneau-detection')!.textContent?.trim()).toBe('');
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

  describe('Retenir une Image dans la détection (story 2.7, partie 2)', () => {
    const URL_REUTILISATION = `/api/preparations/${ID}/mots/reutilisation`;
    const original = { creer: URL.createObjectURL, revoquer: URL.revokeObjectURL };
    const champSaisie = () => racine.querySelector<HTMLInputElement>('app-saisie-rapide input')!;
    const options = () => [
      ...racine.querySelectorAll<HTMLElement>('app-panneau-detection [role="option"]'),
    ];
    const actif = () => champSaisie().getAttribute('aria-activedescendant');

    /** Mot détecté, avec des Images de l'enseignant connecté. */
    function motDetecte(forme: string, imageIds: string[]) {
      return {
        motId: `mot-${forme}`,
        forme,
        dejaDansLaPreparation: false,
        sens: [{ id: `sens-${forme}`, libelle: forme, categorie: 'nom', aCompleter: false }],
        albums: [],
        images: imageIds.map((id) => ({
          id,
          proprietaireId: MOI,
          etat: 'privee' as const,
          aRemplacer: null,
          reutilisable: true,
          typeImage: 'image_libre' as const,
          aCompleter: false,
          sections: ['ms' as const],
          albumOrigine: null,
          sens: { id: `sens-${forme}`, libelle: forme, categorie: 'nom', aCompleter: false },
          dejaUtilisee: false,
        })),
      };
    }

    /** Mot ajouté avec l'Image `imageId`. */
    function motIllustre(forme: string, ordre: number, imageId: string): MotPreparationDto {
      return {
        ...motPreparation(forme, ordre),
        illustre: true,
        image: {
          id: imageId,
          proprietaireId: MOI,
          etat: 'privee',
          aRemplacer: null,
          reutilisable: true,
          typeImage: 'image_libre',
          aCompleter: false,
        },
      };
    }

    function touche(key: string) {
      champSaisie().dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
      );
    }

    /** Tape `saisie` sans valider, laisse partir la détection et y répond par ces Mots. */
    async function detecter(saisie: string, mots: ReturnType<typeof motDetecte>[]) {
      champSaisie().value = saisie;
      champSaisie().dispatchEvent(new Event('input'));
      await fixture.whenStable();
      await new Promise((fin) => setTimeout(fin, DELAI_DETECTION_MS + 20));
      await stabiliser();
      serveur
        .expectOne(
          (requete) =>
            requete.url === `/api/preparations/${ID}/detection` &&
            requete.params.get('saisie') === saisie,
        )
        .flush({ forme: saisie, mots });
      await stabiliser();
      for (const miniature of serveur.match((requete) => requete.url.startsWith('/api/images/'))) {
        miniature.flush(new Blob(['png']));
      }
      await stabiliser();
    }

    async function entree() {
      touche('Enter');
      await stabiliser();
    }

    const reutilisation = (imageId: string): TestRequest =>
      serveur.expectOne(
        (requete) => requete.url === URL_REUTILISATION && requete.body?.imageId === imageId,
      );

    beforeEach(() => {
      URL.createObjectURL = vi.fn(() => 'blob:http://localhost/image');
      URL.revokeObjectURL = vi.fn();
      TestBed.inject(CompteCourant).mettreAJour({
        id: MOI,
        administrateur: false,
        email: 'moi@ecole.fr',
        nomAffiche: 'Moi',
      });
    });

    afterEach(() => {
      serveur.match((requete) => requete.url.startsWith('/api/images/'));
      URL.createObjectURL = original.creer;
      URL.revokeObjectURL = original.revoquer;
    });

    it('combobox : liste des Images, aucune choisie d’emblée, nom accessible Mot, Sens, propriétaire', async () => {
      await ouvrir();
      champSaisie().focus();
      expect(champSaisie().getAttribute('role')).toBe('combobox');
      expect(champSaisie().getAttribute('aria-expanded')).toBe('false');

      await detecter('farine', [motDetecte('farine', ['i1', 'i2'])]);

      const liste = racine.querySelector('app-panneau-detection [role="listbox"]')!;
      expect(champSaisie().getAttribute('aria-expanded')).toBe('true');
      expect(champSaisie().getAttribute('aria-controls')).toBe(liste.id);
      expect(actif()).toBeNull();
      expect(options().map((option) => option.getAttribute('aria-selected'))).toEqual([
        'false',
        'false',
      ]);
      expect(options()[0].getAttribute('aria-label')).toBe(
        'farine, farine (nom), vous, MS, image libre',
      );
    });

    it('↓ puis Entrée : la première Image est retenue ; champ vidé, focus gardé, Carte illustrée en fin', async () => {
      await ouvrir({ ...PREPARATION, nombreMots: 1 }, MODULES, THEMES, albumDe(PREPARATION), [
        MOT_CITROUILLE,
      ]);
      champSaisie().focus();
      await detecter('farine', [motDetecte('farine', ['i1', 'i2'])]);

      touche('ArrowDown');
      await stabiliser();
      expect(actif()).toBe(options()[0].id);
      expect(options()[0].getAttribute('aria-selected')).toBe('true');
      expect(options()[0].classList).toContain('vignette--choisie');

      await entree();
      const requete = reutilisation('i1');
      expect(requete.request.method).toBe('POST');
      expect(requete.request.body).toEqual({ motId: 'mot-farine', imageId: 'i1' });
      serveur.expectNone(URL_MOTS);
      expect(champSaisie().value).toBe('');
      expect(document.activeElement).toBe(champSaisie());
      expect(actif()).toBeNull();

      requete.flush(motIllustre('farine', 2, 'i1'));
      await stabiliser();
      expect(cartes()).toEqual(['citrouille', 'farine']);
      expect(texte('.entete__compteur')).toBe('2 mots, 1 déjà illustré');
      expect(texte('p[aria-live="polite"]')).toBe('« farine » ajouté avec son image.');
      expect(racine.querySelector('app-panneau-detection .detection')).toBeNull();
      expect(document.activeElement).toBe(champSaisie());
    });

    it('Entrée sans choix : le Mot est ajouté « à illustrer », comme avant', async () => {
      await ouvrir();
      champSaisie().focus();
      await detecter('farine', [motDetecte('farine', ['i1'])]);

      await entree();

      serveur.expectNone(URL_REUTILISATION);
      serveur.expectOne(URL_MOTS).flush(motPreparation('farine', 1));
      await stabiliser();
      expect(texte('p[aria-live="polite"]')).toBe('« farine » ajouté.');
    });

    it('clic sur la deuxième Image : elle est retenue, le champ est vidé et garde le focus', async () => {
      await ouvrir();
      champSaisie().focus();
      await detecter('farine', [motDetecte('farine', ['i1', 'i2'])]);

      const appui = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      options()[1].dispatchEvent(appui);
      expect(appui.defaultPrevented).toBe(true);
      options()[1].click();
      await stabiliser();

      expect(reutilisation('i2').request.body).toEqual({ motId: 'mot-farine', imageId: 'i2' });
      expect(champSaisie().value).toBe('');
      expect(document.activeElement).toBe(champSaisie());
    });

    it('↑ sur la première et Échap retirent le choix ; Entrée ajoute alors « à illustrer »', async () => {
      await ouvrir();
      champSaisie().focus();
      await detecter('farine', [motDetecte('farine', ['i1', 'i2'])]);

      touche('ArrowDown');
      touche('ArrowDown');
      await stabiliser();
      expect(actif()).toBe(options()[1].id);
      expect(options()[0].classList).not.toContain('vignette--premiere');
      touche('ArrowUp');
      touche('ArrowUp');
      await stabiliser();
      expect(actif()).toBeNull();
      expect(options()[0].classList).toContain('vignette--premiere');

      touche('ArrowDown');
      await stabiliser();
      const echap = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      champSaisie().dispatchEvent(echap);
      await stabiliser();
      expect(echap.defaultPrevented).toBe(true);
      expect(actif()).toBeNull();

      await entree();
      serveur.expectNone(URL_REUTILISATION);
      serveur.expectOne(URL_MOTS).flush(motPreparation('farine', 1));
      await stabiliser();
    });

    it('une frappe retire le choix', async () => {
      await ouvrir();
      champSaisie().focus();
      await detecter('farine', [motDetecte('farine', ['i1'])]);
      touche('ArrowDown');
      await stabiliser();
      expect(actif()).not.toBeNull();

      champSaisie().value = 'farines';
      champSaisie().dispatchEvent(new Event('input'));
      await stabiliser();

      expect(actif()).toBeNull();
      await new Promise((fin) => setTimeout(fin, DELAI_DETECTION_MS + 20));
      serveur.expectOne((requete) => requete.url.endsWith('/detection'));
    });

    it('Image indisponible (404) : message sous le champ, saisie remise, détection relancée, sans Bandeau', async () => {
      await ouvrir();
      champSaisie().focus();
      await detecter('farine', [motDetecte('farine', ['i1'])]);
      touche('ArrowDown');
      await entree();

      reutilisation('i1').flush(
        { status: 404, code: 'image.indisponible' },
        { status: 404, statusText: 'Not Found' },
      );
      await stabiliser();

      expect(texte('.saisie-rapide__erreur')).toBe(
        "Cette image n'est plus disponible. Choisissez-en une autre, ou appuyez sur Entrée pour ajouter le mot sans image.",
      );
      expect(champSaisie().value).toBe('farine');
      expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
      expect(cartes()).toEqual([]);
      await new Promise((fin) => setTimeout(fin, DELAI_DETECTION_MS + 20));
      serveur.expectOne((requete) => requete.url.endsWith('/detection'));
    });

    it('Image d’un autre Sens entre-temps (400 image.sens_different) : même message sous le champ', async () => {
      await ouvrir();
      champSaisie().focus();
      await detecter('farine', [motDetecte('farine', ['i1'])]);
      touche('ArrowDown');
      await entree();

      reutilisation('i1').flush(
        { status: 400, code: 'image.sens_different' },
        { status: 400, statusText: 'Bad Request' },
      );
      await stabiliser();

      expect(texte('.saisie-rapide__erreur')).toContain("Cette image n'est plus disponible.");
      expect(champSaisie().value).toBe('farine');
      expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
      serveur.match((requete) => requete.url.endsWith('/detection'));
    });

    it('Image devenue indisponible au contrôle sous verrou (404 ressource.introuvable) : message sous le champ, sans Bandeau', async () => {
      await ouvrir();
      champSaisie().focus();
      await detecter('farine', [motDetecte('farine', ['i1'])]);
      touche('ArrowDown');
      await entree();

      reutilisation('i1').flush(
        { status: 404, code: 'ressource.introuvable' },
        { status: 404, statusText: 'Not Found' },
      );
      await stabiliser();

      expect(texte('.saisie-rapide__erreur')).toContain("Cette image n'est plus disponible.");
      expect(champSaisie().value).toBe('farine');
      expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
      serveur.match((requete) => requete.url.endsWith('/detection'));
    });

    it('autre refus définitif (400 preparation.sens_invalide) : son message sous le champ, sans Bandeau', async () => {
      await ouvrir();
      champSaisie().focus();
      await detecter('farine', [motDetecte('farine', ['i1'])]);
      touche('ArrowDown');
      await entree();

      reutilisation('i1').flush(
        { status: 400, code: 'preparation.sens_invalide' },
        { status: 400, statusText: 'Bad Request' },
      );
      await stabiliser();

      expect(texte('.saisie-rapide__erreur')).toBe("Ce sens n'appartient pas à ce mot.");
      expect(champSaisie().value).toBe('farine');
      expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
      serveur.match((requete) => requete.url.endsWith('/detection'));
    });

    it('Mot déjà présent : refusé sous le champ comme une Entrée, saisie remise', async () => {
      await ouvrir();
      champSaisie().focus();
      await detecter('cote', [motDetecte('côté', ['i1'])]);
      touche('ArrowDown');
      await entree();

      reutilisation('i1').flush(
        { status: 409, code: 'preparation.mot_deja_present' },
        { status: 409, statusText: 'Conflict' },
      );
      await stabiliser();

      expect(texte('.saisie-rapide__erreur')).toBe(
        'Ce mot est déjà dans la préparation : « côté ».',
      );
      expect(champSaisie().value).toBe('cote');
      serveur.match((requete) => requete.url.endsWith('/detection'));
    });

    it('échec réseau : Bandeau qui nomme le Mot, « Réessayer » renvoie la même réutilisation', async () => {
      await ouvrir();
      champSaisie().focus();
      await detecter('cote', [motDetecte('côté', ['i1'])]);
      touche('ArrowDown');
      await entree();

      reutilisation('i1').error(new ProgressEvent('error'));
      await stabiliser();
      expect(bandeau('erreur-ajout')).toBe(`« côté » n'a pas été ajouté. ${MESSAGE_RESEAU}`);

      await reessayer('erreur-ajout');
      expect(reutilisation('i1').request.body).toEqual({ motId: 'mot-côté', imageId: 'i1' });
    });

    it('plusieurs Mots : un groupe nommé par Mot, ↓ passe d’un Mot à l’autre sans boucler', async () => {
      await ouvrir();
      champSaisie().focus();
      await detecter('cote', [motDetecte('côte', ['i1']), motDetecte('côté', ['i2'])]);

      expect(
        [...racine.querySelectorAll('app-panneau-detection [role="listbox"] [role="group"]')].map(
          (groupe) => groupe.getAttribute('aria-label'),
        ),
      ).toEqual([
        'côte — existe déjà · 1 image. Sens : côte (nom).',
        'côté — existe déjà · 1 image. Sens : côté (nom).',
      ]);
      touche('ArrowDown');
      touche('ArrowDown');
      touche('ArrowDown');
      await stabiliser();
      expect(actif()).toBe(options()[1].id);

      await entree();
      expect(reutilisation('i2').request.body).toEqual({ motId: 'mot-côté', imageId: 'i2' });
    });

    it('deux réutilisations puis une Entrée tapées vite : les trois Cartes dans l’ordre des gestes', async () => {
      await ouvrir();
      champSaisie().focus();
      await detecter('farine', [motDetecte('farine', ['i1'])]);
      touche('ArrowDown');
      await entree();
      await detecter('sucre', [motDetecte('sucre', ['i2'])]);
      touche('ArrowDown');
      await entree();
      champSaisie().value = 'oeuf';
      champSaisie().dispatchEvent(new Event('input'));
      await entree();

      // Un seul envoi à la fois : le suivant part après la réponse du précédent.
      serveur.expectNone(URL_MOTS);
      reutilisation('i1').flush(motIllustre('farine', 1, 'i1'));
      await stabiliser();
      serveur.expectNone(URL_MOTS);
      reutilisation('i2').flush(motIllustre('sucre', 2, 'i2'));
      await stabiliser();
      serveur.expectOne(URL_MOTS).flush(motPreparation('oeuf', 3));
      await stabiliser();

      expect(cartes()).toEqual(['farine', 'sucre', 'oeuf']);
      serveur.match((requete) => requete.url.endsWith('/detection'));
    });

    describe('Sens dans la détection (story 2.8, partie 3)', () => {
      const CHUTE = { id: 'sens-chute', libelle: 'chute', categorie: 'nom', aCompleter: false };
      const CUISINE = {
        id: 'sens-cuisine',
        libelle: 'cuisine',
        categorie: 'adjectif',
        aCompleter: false,
      };
      const puce = (libelle: string, dans: ParentNode = racine) =>
        [...dans.querySelectorAll<HTMLButtonElement>('.detection__puce')].find(
          (bouton) => bouton.textContent?.replace(/\s+/g, ' ').trim() === libelle,
        )!;
      const libelleSens = () => racine.querySelector<HTMLInputElement>('.creation-sens__libelle')!;

      /** « étalé » à deux Sens, une Image pour chacun. */
      function etale() {
        const mot = motDetecte('étalé', ['i1', 'i2']);
        return {
          ...mot,
          sens: [CHUTE, CUISINE],
          images: [
            { ...mot.images[0], sens: CUISINE },
            { ...mot.images[1], sens: CHUTE },
          ],
        };
      }

      /** Mot ajouté avec ce Sens. */
      function motAvecSens(forme: string, ordre: number, libelle: string, categorie: string) {
        const mot = motPreparation(forme, ordre);
        return { ...mot, sens: { ...mot.sens, libelle, categorie } };
      }

      async function choisirSens(libelle: string, dans?: ParentNode) {
        puce(libelle, dans).click();
        await stabiliser();
      }

      async function creerSens(libelle: string) {
        [...racine.querySelectorAll<HTMLButtonElement>('app-panneau-detection button')]
          .find((bouton) => bouton.textContent?.trim() === 'Nouveau sens')!
          .click();
        await stabiliser();
        libelleSens().value = libelle;
        libelleSens().dispatchEvent(new Event('input'));
        await stabiliser();
        racine
          .querySelector('app-panneau-detection form')!
          .dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
        await stabiliser();
      }

      it('puce choisie puis Entrée : le Mot est ajouté avec ce Sens ; focus au champ, annonce', async () => {
        await ouvrir();
        champSaisie().focus();
        await detecter('etale', [etale()]);

        await choisirSens('chute (nom)');
        expect(document.activeElement).toBe(champSaisie());
        expect(options()).toHaveLength(1);
        await entree();

        serveur.expectNone(URL_REUTILISATION);
        const requete = serveur.expectOne(URL_MOTS);
        expect(requete.request.body).toEqual({
          saisie: 'etale',
          motId: 'mot-étalé',
          sensId: 'sens-chute',
        });
        requete.flush(motAvecSens('étalé', 1, 'chute', 'nom'));
        await stabiliser();
        expect(cartes()).toEqual(['étalé']);
        expect(texte('p[aria-live="polite"]')).toBe('« étalé » ajouté (chute, nom).');
        expect(document.activeElement).toBe(champSaisie());
      });

      it('deux Mots : la puce d’un Sens de « côté » puis Entrée ajoute « côté » avec ce Sens', async () => {
        const gauche = {
          id: 'sens-gauche',
          libelle: 'gauche',
          categorie: 'nom',
          aCompleter: false,
        };
        const cote = motDetecte('côte', ['i1']);
        const cote2 = motDetecte('côté', ['i2']);
        await ouvrir();
        champSaisie().focus();
        await detecter('cote', [cote, { ...cote2, sens: [...cote2.sens, gauche] }]);

        const groupes = [...racine.querySelectorAll('.detection__puces')];
        expect(groupes).toHaveLength(1);
        await choisirSens('gauche (nom)', groupes[0]);
        await entree();

        expect(serveur.expectOne(URL_MOTS).request.body).toEqual({
          saisie: 'cote',
          motId: 'mot-côté',
          sensId: 'sens-gauche',
        });
      });

      it('« Tous » : Entrée ajoute la saisie seule, comme avant', async () => {
        await ouvrir();
        champSaisie().focus();
        await detecter('etale', [etale()]);
        await choisirSens('chute (nom)');
        await choisirSens('Tous');
        await entree();

        expect(serveur.expectOne(URL_MOTS).request.body).toEqual({ saisie: 'etale' });
      });

      it('une frappe après le choix ramène « Tous »', async () => {
        await ouvrir();
        champSaisie().focus();
        await detecter('etale', [etale()]);
        await choisirSens('chute (nom)');
        champSaisie().value = 'etales';
        champSaisie().dispatchEvent(new Event('input'));
        await fixture.whenStable();
        await entree();

        expect(serveur.expectOne(URL_MOTS).request.body).toEqual({ saisie: 'etales' });
        serveur.match((requete) => requete.url.endsWith('/detection'));
      });

      it('« Nouveau sens » puis Entrée : ajout avec ce Sens, champ vidé, panneau masqué, focus au champ', async () => {
        await ouvrir();
        champSaisie().focus();
        await detecter('etale', [etale()]);

        await creerSens('éclaté');

        const requete = serveur.expectOne(URL_MOTS);
        expect(requete.request.body).toEqual({
          saisie: 'etale',
          motId: 'mot-étalé',
          nouveauSens: { libelle: 'éclaté', categorie: 'nom' },
        });
        // Rien n'est vidé avant la réponse.
        expect(champSaisie().value).toBe('etale');
        requete.flush(motAvecSens('étalé', 1, 'éclaté', 'nom'));
        await stabiliser();

        expect(cartes()).toEqual(['étalé']);
        expect(champSaisie().value).toBe('');
        expect(racine.querySelector('app-panneau-detection .detection')).toBeNull();
        expect(document.activeElement).toBe(champSaisie());
        expect(texte('p[aria-live="polite"]')).toBe('« étalé » ajouté (éclaté, nom).');
      });

      it('« Nouveau sens » d’un Mot nouveau : envoyé sans Mot détecté', async () => {
        await ouvrir();
        champSaisie().focus();
        await detecter('galette', []);
        [...racine.querySelectorAll<HTMLButtonElement>('app-panneau-detection button')]
          .find((bouton) => bouton.textContent?.trim() === 'Nouveau sens')!
          .click();
        await stabiliser();
        racine
          .querySelector<HTMLElement>('.creation-sens__categorie .mat-mdc-select-trigger')!
          .click();
        await stabiliser();
        [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option')]
          .find((option) => option.textContent?.trim() === 'nom')!
          .click();
        await stabiliser();
        libelleSens().value = 'gâteau';
        libelleSens().dispatchEvent(new Event('input'));
        await stabiliser();
        racine
          .querySelector('app-panneau-detection form')!
          .dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
        await stabiliser();

        expect(serveur.expectOne(URL_MOTS).request.body).toEqual({
          saisie: 'galette',
          nouveauSens: { libelle: 'gâteau', categorie: 'nom' },
        });
        serveur.match((requete) => requete.url.startsWith('/api/arasaac/'));
        document
          .querySelectorAll('.cdk-overlay-container')
          .forEach((surcouche) => surcouche.remove());
      });

      it('refus du Mot déjà présent : message sous le formulaire, rien d’ajouté, saisie gardée', async () => {
        await ouvrir();
        champSaisie().focus();
        await detecter('etale', [etale()]);

        await creerSens('éclaté');
        serveur
          .expectOne(URL_MOTS)
          .flush({ code: 'preparation.mot_deja_present' }, { status: 409, statusText: 'Conflict' });
        await stabiliser();

        expect(cartes()).toEqual([]);
        expect(texte('.creation-sens__erreur')).toBe('Ce mot est déjà dans la préparation.');
        expect(libelleSens().value).toBe('éclaté');
        expect(champSaisie().value).toBe('etale');
        expect(racine.querySelector('bandeau-erreur, app-bandeau-erreur')).toBeNull();
      });

      it('refus du libellé : message sous le libellé', async () => {
        await ouvrir();
        champSaisie().focus();
        await detecter('etale', [etale()]);

        await creerSens('éclaté');
        serveur
          .expectOne(URL_MOTS)
          .flush({ code: 'sens.libelle_invalide' }, { status: 400, statusText: 'Bad Request' });
        await stabiliser();

        expect(texte('app-panneau-detection mat-error')).toBe(
          MESSAGES_PAR_CODE['sens.libelle_invalide'],
        );
        expect(cartes()).toEqual([]);
      });

      it('Sens choisi refusé (400 preparation.sens_invalide) : message sous le champ, saisie remise, sans Bandeau', async () => {
        await ouvrir();
        champSaisie().focus();
        await detecter('etale', [etale()]);
        await choisirSens('chute (nom)');
        await entree();

        serveur
          .expectOne(URL_MOTS)
          .flush({ code: 'preparation.sens_invalide' }, { status: 400, statusText: 'Bad Request' });
        await stabiliser();

        expect(texte('.saisie-rapide__erreur')).toBe(MESSAGE_SENS_PLUS_PROPOSE);
        expect(champSaisie().value).toBe('etale');
        expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
        expect(cartes()).toEqual([]);
        serveur.match((requete) => requete.url.endsWith('/detection'));
      });

      it('deux Mots, Sens de « côté » choisi, 409 : le message nomme « côté »', async () => {
        const gauche = {
          id: 'sens-gauche',
          libelle: 'gauche',
          categorie: 'nom',
          aCompleter: false,
        };
        const cote2 = motDetecte('côté', ['i2']);
        await ouvrir();
        champSaisie().focus();
        await detecter('cote', [
          motDetecte('côte', ['i1']),
          { ...cote2, sens: [...cote2.sens, gauche] },
        ]);
        await choisirSens('gauche (nom)');
        await entree();

        serveur
          .expectOne(URL_MOTS)
          .flush({ code: 'preparation.mot_deja_present' }, { status: 409, statusText: 'Conflict' });
        await stabiliser();

        expect(texte('.saisie-rapide__erreur')).toBe(
          'Ce mot est déjà dans la préparation : « côté ».',
        );
        serveur.match((requete) => requete.url.endsWith('/detection'));
      });

      it('puce puis ↓ puis Entrée : l’Image choisie est réutilisée, pas d’ajout avec le Sens seul', async () => {
        await ouvrir();
        champSaisie().focus();
        await detecter('etale', [etale()]);
        await choisirSens('chute (nom)');
        touche('ArrowDown');
        await stabiliser();
        await entree();

        expect(reutilisation('i2').request.body).toEqual({ motId: 'mot-étalé', imageId: 'i2' });
        serveur.expectNone(URL_MOTS);
      });

      it('échec réseau d’un ajout avec un Sens choisi : Bandeau, « Réessayer » renvoie le même Sens', async () => {
        await ouvrir();
        champSaisie().focus();
        await detecter('etale', [etale()]);
        await choisirSens('chute (nom)');
        await entree();

        serveur.expectOne(URL_MOTS).error(new ProgressEvent('error'));
        await stabiliser();
        expect(bandeau('erreur-ajout')).toBe(`« étalé » n'a pas été ajouté. ${MESSAGE_RESEAU}`);

        await reessayer('erreur-ajout');
        expect(serveur.expectOne(URL_MOTS).request.body).toEqual({
          saisie: 'etale',
          motId: 'mot-étalé',
          sensId: 'sens-chute',
        });
      });

      it('échec réseau d’une Création de Sens : erreur dans le formulaire, sans Bandeau', async () => {
        await ouvrir();
        champSaisie().focus();
        await detecter('etale', [etale()]);
        await creerSens('éclaté');

        serveur.expectOne(URL_MOTS).error(new ProgressEvent('error'));
        await stabiliser();

        expect(texte('.creation-sens__erreur')).toBe(MESSAGE_RESEAU);
        expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
        expect(champSaisie().value).toBe('etale');
      });

      it('Mot nouveau : la forme affichée par le panneau part comme saisie', async () => {
        await ouvrir();
        champSaisie().focus();
        champSaisie().value = 'la galette';
        champSaisie().dispatchEvent(new Event('input'));
        await fixture.whenStable();
        await new Promise((fin) => setTimeout(fin, DELAI_DETECTION_MS + 20));
        await stabiliser();
        serveur
          .expectOne((requete) => requete.url === `/api/preparations/${ID}/detection`)
          .flush({ forme: 'galette', mots: [] });
        await stabiliser();
        expect(texte('app-panneau-detection .detection__entete')).toBe('galette — nouveau mot');

        [...racine.querySelectorAll<HTMLButtonElement>('app-panneau-detection button')]
          .find((bouton) => bouton.textContent?.trim() === 'Nouveau sens')!
          .click();
        await stabiliser();
        racine
          .querySelector<HTMLElement>('.creation-sens__categorie .mat-mdc-select-trigger')!
          .click();
        await stabiliser();
        [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option')]
          .find((option) => option.textContent?.trim() === 'nom')!
          .click();
        await stabiliser();
        libelleSens().value = 'gâteau';
        libelleSens().dispatchEvent(new Event('input'));
        await stabiliser();
        racine
          .querySelector('app-panneau-detection form')!
          .dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
        await stabiliser();

        expect(serveur.expectOne(URL_MOTS).request.body).toEqual({
          saisie: 'galette',
          nouveauSens: { libelle: 'gâteau', categorie: 'nom' },
        });
        serveur.match((requete) => requete.url.startsWith('/api/arasaac/'));
        document
          .querySelectorAll('.cdk-overlay-container')
          .forEach((surcouche) => surcouche.remove());
      });

      it('succès d’une Création de Sens : une frappe plus récente du champ n’est pas effacée', async () => {
        await ouvrir();
        champSaisie().focus();
        await detecter('etale', [etale()]);
        await creerSens('éclaté');
        const requete = serveur.expectOne(URL_MOTS);

        champSaisie().value = 'pomme';
        champSaisie().dispatchEvent(new Event('input'));
        await fixture.whenStable();
        requete.flush(motAvecSens('étalé', 1, 'éclaté', 'nom'));
        await stabiliser();

        expect(cartes()).toEqual(['étalé']);
        expect(champSaisie().value).toBe('pomme');
        expect(document.activeElement).toBe(champSaisie());
        serveur.match((demande) => demande.url.endsWith('/detection'));
      });

      describe('issue d’une Création de Sens', () => {
        const nouveauSens = (forme: string): AjoutAvecSens => ({
          motId: `mot-${forme}`,
          forme,
          nouveauSens: { libelle: 'chute', categorie: 'nom' },
        });
        const ajouterAvecNouveauSens = (ajout: AjoutAvecSens) =>
          fixture.componentInstance['ajouterAvecNouveauSens'](ajout);

        it('réponse arrivée après l’ouverture d’une autre Préparation : rejetée, rien n’est appliqué', async () => {
          await ouvrir();
          const promesse = ajouterAvecNouveauSens(nouveauSens('étalé'));
          const issue = vi.fn();
          promesse.then(
            () => issue('resolue'),
            () => issue('rejetee'),
          );
          const requete = serveur.expectOne(URL_MOTS);

          fixture.componentRef.setInput('id', AUTRE_ID);
          await stabiliser();
          await ouvrir(LOUP, MODULES_LOUP, THEMES);
          requete.flush(motAvecSens('étalé', 1, 'chute', 'nom'));
          await stabiliser();

          expect(issue).toHaveBeenCalledWith('rejetee');
          expect(cartes()).toEqual([]);
        });

        it('en attente dans la file au rechargement : rejetée sans être envoyée', async () => {
          await ouvrir();
          champSaisie().value = 'citrouille';
          champSaisie().dispatchEvent(new Event('input'));
          await entree();
          const enCours = serveur.expectOne(URL_MOTS);
          const issue = vi.fn();
          ajouterAvecNouveauSens(nouveauSens('étalé')).then(
            () => issue('resolue'),
            () => issue('rejetee'),
          );

          fixture.componentRef.setInput('id', AUTRE_ID);
          await stabiliser();
          expect(issue).toHaveBeenCalledWith('rejetee');
          await ouvrir(LOUP, MODULES_LOUP, THEMES);
          enCours.flush(MOT_CITROUILLE);
          await stabiliser();
          serveur.expectNone((requete) => requete.method === 'POST');
        });

        it('Préparation pas encore chargée : rejetée sans requête', async () => {
          await ouvrir();
          fixture.componentRef.setInput('id', AUTRE_ID);
          await stabiliser();
          await expect(ajouterAvecNouveauSens(nouveauSens('étalé'))).rejects.toThrow();
          serveur.expectNone((requete) => requete.method === 'POST');
          await ouvrir(LOUP, MODULES_LOUP, THEMES);
        });
      });

      it('Échap : replié sans requête, focus au champ', async () => {
        await ouvrir();
        champSaisie().focus();
        await detecter('etale', [etale()]);
        [...racine.querySelectorAll<HTMLButtonElement>('app-panneau-detection button')]
          .find((bouton) => bouton.textContent?.trim() === 'Nouveau sens')!
          .click();
        await stabiliser();
        expect(document.activeElement).toBe(libelleSens());

        libelleSens().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await stabiliser();

        expect(racine.querySelector('app-panneau-detection form')).toBeNull();
        serveur.expectNone(URL_MOTS);
        expect(document.activeElement).toBe(champSaisie());
      });
    });
  });

  describe('Encart « mots déjà illustrés » (story 2.9)', () => {
    const URL_REPRISES = `/api/preparations/${ID}/reprises`;
    const champSaisie = () => racine.querySelector<HTMLInputElement>('app-saisie-rapide input')!;
    const original = { creer: URL.createObjectURL, revoquer: URL.revokeObjectURL };

    /** Candidat `forme` (identifiants sans accents), avec une Image d'album. */
    function candidat(forme: string, index: number): RepriseMotPreparationDto {
      const suffixe = String(index).padStart(4, '0');
      return {
        motId: `0190f0a0-0000-7000-8000-0000000a${suffixe}`,
        forme,
        sens: {
          id: `0190f0a0-0000-7000-8000-0000000b${suffixe}`,
          libelle: forme,
          categorie: 'nom',
        },
        image: {
          id: `0190f0a0-0000-7000-8000-0000000c${suffixe}`,
          proprietaireId: MOI,
          etat: 'privee',
          aRemplacer: null,
          reutilisable: true,
          typeImage: 'image_album',
          aCompleter: false,
          sections: ['ms'],
          albumOrigine: { id: ALBUM, titre: 'La Roule Galette' },
          sens: {
            id: `0190f0a0-0000-7000-8000-0000000b${suffixe}`,
            libelle: forme,
            categorie: 'nom',
            aCompleter: false,
          },
          dejaUtilisee: false,
        },
      };
    }

    /** Mot ajouté par la reprise de `reprise`, à la place `ordre`, illustré par son Image. */
    function repris(reprise: RepriseMotPreparationDto, ordre: number): MotPreparationDto {
      return {
        id: `mp-${reprise.motId}`,
        motId: reprise.motId,
        forme: reprise.forme,
        ordre,
        sens: reprise.sens,
        illustre: true,
        image: {
          id: reprise.image.id,
          proprietaireId: MOI,
          etat: 'privee',
          aRemplacer: null,
          reutilisable: true,
          typeImage: 'image_album',
          aCompleter: false,
        },
      };
    }

    const NEUF = [
      'chemin',
      'etale',
      'four',
      'galette',
      'lapin',
      'loup',
      'ours',
      'renard',
      'sentier',
    ].map((forme, index) => candidat(forme, index + 1));

    beforeEach(() => {
      URL.createObjectURL = vi.fn(() => 'blob:http://localhost/1');
      URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      serveur.match((requete) => requete.url.startsWith('/api/images/'));
      URL.createObjectURL = original.creer;
      URL.revokeObjectURL = original.revoquer;
    });

    it('nouvelle Préparation avec 9 candidats : l’Encart s’affiche sous le champ', async () => {
      await ouvrir();
      serveur.expectOne(URL_REPRISES).flush(NEUF);
      await stabiliser();

      const saisie = racine.querySelector('app-saisie-rapide')!;
      const encart = racine.querySelector('app-encart-mots-deja-illustres')!;
      expect(
        saisie.compareDocumentPosition(encart) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(texte('.encart__titre')).toBe('9 mots déjà illustrés pour cet album');
    });

    it('aucun candidat : pas d’Encart', async () => {
      await ouvrir();
      serveur.expectOne(URL_REPRISES).flush([]);
      await stabiliser();

      expect(racine.querySelector('section.encart')).toBeNull();
    });

    it('Tout reprendre : les 9 Mots arrivent dans la Grille avec leur Image, le compteur suit, l’Encart disparaît', async () => {
      await ouvrir(PREPARATION, MODULES, THEMES, albumDe(PREPARATION), [MOT_CITROUILLE]);
      serveur.expectOne(URL_REPRISES).flush(NEUF);
      await stabiliser();

      [...racine.querySelectorAll<HTMLButtonElement>('.encart button')]
        .find((bouton) => bouton.textContent?.trim() === 'Tout reprendre')!
        .click();
      const requete = serveur.expectOne((r) => r.method === 'POST' && r.url === URL_REPRISES);
      expect(requete.request.body).toEqual({ motIds: NEUF.map((reprise) => reprise.motId) });
      requete.flush(NEUF.map((reprise, index) => repris(reprise, index + 2)));
      await stabiliser();

      expect(cartes()).toEqual(['citrouille', ...NEUF.map((reprise) => reprise.forme)]);
      expect(texte('.entete__compteur')).toBe('10 mots, 9 déjà illustrés');
      expect(racine.querySelector('section.encart')).toBeNull();
      expect(document.activeElement).toBe(champSaisie());
    });

    it('Reprendre : le Mot arrive en fin de Grille, le titre passe à 8, un Mot saisi quitte l’Encart', async () => {
      await ouvrir(PREPARATION, MODULES, THEMES, albumDe(PREPARATION), [MOT_CITROUILLE]);
      serveur.expectOne(URL_REPRISES).flush(NEUF);
      await stabiliser();

      racine.querySelector<HTMLButtonElement>('button[aria-label="Reprendre « etale »"]')!.click();
      const requete = serveur.expectOne(`${URL_MOTS}/reutilisation`);
      expect(requete.request.body).toEqual({ motId: NEUF[1].motId, imageId: NEUF[1].image.id });
      requete.flush(repris(NEUF[1], 2));
      await stabiliser();

      expect(cartes()).toEqual(['citrouille', 'etale']);
      expect(texte('.entete__compteur')).toBe('2 mots, 1 déjà illustré');
      expect(texte('.encart__titre')).toBe('8 mots déjà illustrés pour cet album');
      expect(document.activeElement).toBe(
        racine.querySelector('button[aria-label="Reprendre « four »"]'),
      );

      champSaisie().value = 'four';
      champSaisie().dispatchEvent(new Event('input'));
      champSaisie().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      );
      await stabiliser();
      serveur
        .expectOne((r) => r.method === 'POST' && r.url === URL_MOTS)
        .flush({ ...motPreparation('four', 3), motId: NEUF[2].motId });
      await stabiliser();
      serveur.match((r) => r.url.endsWith('/detection'));

      expect(texte('.encart__titre')).toBe('7 mots déjà illustrés pour cet album');
    });

    it('un Mot retiré de la Grille revient dans l’Encart (relu après le retrait et après son « Annuler »)', async () => {
      const afficher = vi.fn<(message: string, annuler: () => unknown) => void>();
      vi.spyOn(TestBed.inject(BandeauAnnuler), 'afficher').mockImplementation(afficher);
      const etale = repris(NEUF[1], 2);
      await ouvrir(PREPARATION, MODULES, THEMES, albumDe(PREPARATION), [MOT_CITROUILLE, etale]);
      serveur.expectOne(URL_REPRISES).flush([]);
      await stabiliser();

      racine
        .querySelector<HTMLButtonElement>(
          'app-carte-mot button[aria-label="Retirer « etale » de la préparation"]',
        )!
        .click();
      await stabiliser();
      serveur.expectOne(`${URL_MOTS}/${etale.id}`).flush(etale);
      await stabiliser();
      serveur.expectOne(URL_REPRISES).flush([NEUF[1]]);
      await stabiliser();

      expect(texte('.encart__titre')).toBe('1 mot déjà illustré pour cet album');

      afficher.mock.calls[0][1]();
      serveur.expectOne(`${URL_MOTS}/retablissement`).flush(etale);
      await stabiliser();
      serveur.expectOne(URL_REPRISES).flush([]);
      await stabiliser();

      expect(cartes()).toEqual(['citrouille', 'etale']);
      expect(racine.querySelector('section.encart')).toBeNull();
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
      const animal = {
        ...CITROUILLE,
        sens: { id: CITROUILLE.sens.id, libelle: 'légume', categorie: 'nom' },
      };
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
        themeId: null,
        imageId: null,
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
      expect(bandeau('erreur-retrait')).toBe(
        `« citrouille » n'a pas été retiré. ${MESSAGE_RESEAU}`,
      );
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

    it('erreur 5xx du rétablissement : « Réessayer » proposé', async () => {
      await ouvrirAvec([GALETTE, CITROUILLE]);
      await retirer('citrouille');
      retrait(CITROUILLE).flush(CITROUILLE);
      await stabiliser();

      await annuler();
      retablissement().flush(
        { status: 503, code: 'erreur.interne' },
        { status: 503, statusText: 'Service Unavailable' },
      );
      await stabiliser();

      const libelles = [
        ...racine.querySelectorAll('app-bandeau-erreur.erreur-retablissement button'),
      ].map((bouton) => bouton.textContent?.trim() || bouton.getAttribute('aria-label'));
      expect(libelles).toContain('Réessayer');
    });

    it('autre refus du back (404) : message seul, sans « Réessayer »', async () => {
      await ouvrirAvec([GALETTE, CITROUILLE]);
      await retirer('citrouille');
      retrait(CITROUILLE).flush(CITROUILLE);
      await stabiliser();

      await annuler();
      retablissement().flush(
        { status: 404, code: 'ressource.introuvable' },
        { status: 404, statusText: 'Not Found' },
      );
      await stabiliser();

      const libelles = [
        ...racine.querySelectorAll('app-bandeau-erreur.erreur-retablissement button'),
      ].map((bouton) => bouton.textContent?.trim() || bouton.getAttribute('aria-label'));
      expect(libelles).toEqual(['Fermer']);
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

    it('« Annuler » d’un Mot qui avait un Thème : le rétablissement renvoie ce Thème', async () => {
      const avecTheme = { ...CITROUILLE, themeId: ANIMAUX };
      await ouvrirAvec([GALETTE, avecTheme]);
      await retirer('citrouille');
      retrait(avecTheme).flush(avecTheme);
      await stabiliser();

      await annuler();
      const requete = retablissement();
      expect(requete.request.body).toEqual({
        motId: avecTheme.motId,
        sensId: avecTheme.sens.id,
        ordre: 2,
        imageId: null,
        themeId: ANIMAUX,
      });
      requete.flush(avecTheme, { status: 201, statusText: 'Created' });
      await stabiliser();

      expect(
        [...racine.querySelectorAll('.carte-mot__theme')].map((bouton) =>
          bouton.textContent?.trim(),
        ),
      ).toEqual(['Sans thème', 'animaux']);
    });
  });

  describe('Thème de chaque Mot (story 2.3, partie 3)', () => {
    const CITROUILLE = { ...motPreparation('citrouille', 1), themeId: CUISINE };
    const LOUP_MOT = motPreparation('loup', 2);
    const URL_THEME_CITROUILLE = `${URL_MOTS}/${CITROUILLE.id}/theme`;

    afterEach(() =>
      document
        .querySelectorAll('.cdk-overlay-container')
        .forEach((surcouche) => surcouche.remove()),
    );

    function connecter() {
      TestBed.inject(CompteCourant).mettreAJour({
        id: MOI,
        administrateur: false,
        email: 'moi@ecole.fr',
        nomAffiche: 'Moi',
      });
    }

    async function ouvrirAvec(mots: MotPreparationDto[] = [CITROUILLE, LOUP_MOT]) {
      await ouvrir(
        { ...PREPARATION, nombreMots: mots.length },
        MODULES,
        THEMES,
        albumDe(PREPARATION),
        mots,
      );
    }

    const boutonsTheme = () => [...racine.querySelectorAll<HTMLButtonElement>('.carte-mot__theme')];
    const themesDesCartes = () => boutonsTheme().map((bouton) => bouton.textContent?.trim());
    const saisieDialogue = () =>
      document.querySelector<HTMLInputElement>('app-theme-mot app-champ-themes input')!;
    const boutonDialogue = (libelle: string) =>
      [...document.querySelectorAll<HTMLButtonElement>('app-theme-mot button')].find(
        (bouton) => bouton.textContent?.trim() === libelle,
      )!;

    async function ouvrirDialogue(index = 0) {
      boutonsTheme()[index].focus();
      boutonsTheme()[index].click();
      await stabiliser();
      await stabiliser();
    }

    it('Cartes : Thème du Mot en bouton texte, « Sans thème » sinon, nom accessible complet', async () => {
      await ouvrirAvec();

      expect(themesDesCartes()).toEqual(['cuisine', 'Sans thème']);
      expect(boutonsTheme()[0].getAttribute('aria-label')).toBe(
        'Thème de « citrouille » : cuisine',
      );
    });

    it('Thèmes non chargés : pas de bouton du Thème sur les Cartes', async () => {
      serveur.expectOne(`/api/preparations/${ID}`).flush(PREPARATION);
      await stabiliser();
      serveur.expectOne(`/api/albums/${ALBUM}`).flush(albumDe(PREPARATION));
      serveur.expectOne(`/api/albums/${ALBUM}/modules`).flush(MODULES);
      serveur.expectOne('/api/themes').error(new ProgressEvent('error'));
      serveur.expectOne(URL_MOTS).flush([CITROUILLE]);
      await stabiliser();

      expect(cartes()).toEqual(['citrouille']);
      expect(boutonsTheme()).toEqual([]);
    });

    it('au clavier : le Dialogue change le Thème, la Carte suit et le focus revient à son bouton', async () => {
      await ouvrirAvec();

      await ouvrirDialogue();
      expect(document.querySelector('app-theme-mot h2')?.textContent?.trim()).toBe(
        'Thème de « citrouille »',
      );
      expect(document.activeElement).toBe(saisieDialogue());
      saisieDialogue().value = 'anim';
      saisieDialogue().dispatchEvent(new Event('input'));
      await stabiliser();
      await tour();
      toucheClavier(saisieDialogue(), 'Enter', 13);
      await stabiliser();
      boutonDialogue('Enregistrer').click();
      await stabiliser();

      const requete = serveur.expectOne(URL_THEME_CITROUILLE);
      expect(requete.request.method).toBe('PUT');
      expect(requete.request.body).toEqual({ themeId: ANIMAUX });
      requete.flush({ ...CITROUILLE, themeId: ANIMAUX });
      await stabiliser();
      await stabiliser();

      expect(document.querySelector('mat-dialog-container')).toBeNull();
      expect(themesDesCartes()).toEqual(['animaux', 'Sans thème']);
      expect(document.activeElement).toBe(boutonsTheme()[0]);
      serveur.expectNone(URL_REGLAGES);
    });

    it('« Annuler » : rien n’est envoyé, la Carte est inchangée, le focus revient à son bouton', async () => {
      await ouvrirAvec();
      await ouvrirDialogue(1);

      boutonDialogue('Annuler').click();
      await stabiliser();
      await stabiliser();

      serveur.expectNone((requete) => requete.url.endsWith('/theme'));
      expect(themesDesCartes()).toEqual(['cuisine', 'Sans thème']);
      expect(document.activeElement).toBe(boutonsTheme()[1]);
    });

    it('Thème supprimé depuis le Dialogue : retiré des Cartes et du Thème par défaut de l’En-tête', async () => {
      connecter();
      await ouvrirAvec([CITROUILLE, { ...LOUP_MOT, themeId: CUISINE }]);
      await ouvrirDialogue();

      document.querySelector<HTMLElement>('app-theme-mot mat-chip-row')!.click();
      await stabiliser();
      [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane [mat-menu-item]')]
        .find((item) => item.textContent?.trim() === 'Supprimer')!
        .click();
      await stabiliser();
      boutonDialogue('Supprimer le thème').click();
      await stabiliser();
      serveur.expectOne(`/api/themes/${CUISINE}`).flush('');
      await stabiliser();

      expect(themesDesCartes()).toEqual(['Sans thème', 'Sans thème']);
      expect(etiquettesThemes()).toEqual([]);
      expect(document.querySelectorAll('mat-dialog-container').length).toBe(1);
      serveur.expectNone(URL_REGLAGES);
    });

    async function choisirDansLeDialogue(texte: string) {
      saisieDialogue().value = texte;
      saisieDialogue().dispatchEvent(new Event('input'));
      await stabiliser();
      await tour();
      toucheClavier(saisieDialogue(), 'Enter', 13);
      await stabiliser();
    }

    it('Thème créé depuis le Dialogue : la Carte affiche son nom', async () => {
      await ouvrirAvec();
      await ouvrirDialogue(1);

      await choisirDansLeDialogue('Les saisons');
      const saisons: ThemeDto = {
        id: '0190f0a0-0000-7000-8000-00000000c009',
        nom: 'Les saisons',
        createurId: MOI,
      };
      serveur.expectOne('/api/themes').flush(saisons, { status: 201, statusText: 'Created' });
      await stabiliser();
      boutonDialogue('Enregistrer').click();
      await stabiliser();
      serveur
        .expectOne(`${URL_MOTS}/${LOUP_MOT.id}/theme`)
        .flush({ ...LOUP_MOT, themeId: saisons.id });
      await stabiliser();
      await stabiliser();

      expect(themesDesCartes()).toEqual(['cuisine', 'Les saisons']);
    });

    it('Thème par défaut renommé depuis le Dialogue : Cartes et En-tête suivent', async () => {
      connecter();
      await ouvrirAvec();
      await ouvrirDialogue();

      document.querySelector<HTMLElement>('app-theme-mot mat-chip-row')!.click();
      await stabiliser();
      [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane [mat-menu-item]')]
        .find((item) => item.textContent?.trim() === 'Renommer')!
        .click();
      await stabiliser();
      const champ = document.querySelector<HTMLInputElement>(
        'app-theme-mot app-champ-nom-module input',
      )!;
      champ.value = 'la cuisine';
      champ.dispatchEvent(new Event('input'));
      await stabiliser();
      champ.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await stabiliser();
      serveur.expectOne(`/api/themes/${CUISINE}/nom`).flush({ ...THEMES[1], nom: 'la cuisine' });
      await stabiliser();

      expect(themesDesCartes()).toEqual(['la cuisine', 'Sans thème']);
      expect(etiquettesThemes()).toEqual(['la cuisine']);
      serveur.expectNone(URL_REGLAGES);
    });

    it('Thème supprimé depuis l’En-tête : retiré aussi des Cartes', async () => {
      connecter();
      await ouvrirAvec();

      racine.querySelector<HTMLElement>('app-champ-themes mat-chip-row')!.click();
      await stabiliser();
      [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane [mat-menu-item]')]
        .find((item) => item.textContent?.trim() === 'Supprimer')!
        .click();
      await stabiliser();
      expect(document.querySelector('.dialogue-confirmation__phrase')?.textContent).toContain(
        'des mots qui le portent',
      );
      document.querySelector<HTMLButtonElement>('.dialogue-confirmation__confirmer')!.click();
      await stabiliser();
      serveur.expectOne(`/api/themes/${CUISINE}`).flush('');
      await stabiliser();
      serveur
        .expectOne(`/api/preparations/${ID}`)
        .flush({ ...PREPARATION, themeDefautId: undefined, nomThemeDefaut: undefined });
      await stabiliser();
      serveur.expectOne(`/api/albums/${ALBUM}`).flush(albumDe(PREPARATION));
      serveur.expectOne(`/api/albums/${ALBUM}/modules`).flush(MODULES);
      serveur.expectOne('/api/themes').flush([THEMES[0]]);
      await stabiliser();

      expect(themesDesCartes()).toEqual(['Sans thème', 'Sans thème']);
    });

    it('Thème renommé dans l’En-tête : les Cartes montrent le nouveau nom', async () => {
      connecter();
      await ouvrirAvec();

      racine.querySelector<HTMLElement>('app-champ-themes mat-chip-row')!.click();
      await stabiliser();
      [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane [mat-menu-item]')]
        .find((item) => item.textContent?.trim() === 'Renommer')!
        .click();
      await stabiliser();
      const champ = racine.querySelector<HTMLInputElement>('app-champ-nom-module input')!;
      champ.value = 'la cuisine';
      champ.dispatchEvent(new Event('input'));
      await stabiliser();
      champ.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await stabiliser();
      serveur.expectOne(`/api/themes/${CUISINE}/nom`).flush({ ...THEMES[1], nom: 'la cuisine' });
      await stabiliser();

      expect(themesDesCartes()).toEqual(['la cuisine', 'Sans thème']);
    });
  });

  describe('Téléverser une image (story 2.5, partie 1)', () => {
    const GALETTE = motPreparation('galette', 1);
    const CITROUILLE = motPreparation('citrouille', 2);
    const IMAGE = '0190f0a0-0000-7000-8000-0000000c0001';
    const ILLUSTREE: MotPreparationDto = {
      ...CITROUILLE,
      illustre: true,
      image: {
        id: IMAGE,
        proprietaireId: MOI,
        etat: 'privee',
        aRemplacer: null,
        reutilisable: true,
        typeImage: 'photo_personnelle',
        aCompleter: false,
      },
    };
    const original = { creer: URL.createObjectURL, revoquer: URL.revokeObjectURL };

    beforeEach(() => {
      URL.createObjectURL = vi.fn(() => 'blob:http://localhost/image');
      URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      serveur.match((requete) => requete.url.startsWith('/api/images/'));
      document
        .querySelectorAll('.cdk-overlay-container')
        .forEach((surcouche) => surcouche.remove());
      URL.createObjectURL = original.creer;
      URL.revokeObjectURL = original.revoquer;
    });

    const boutonTeleverser = (forme: string) =>
      racine.querySelector<HTMLButtonElement>(
        `app-carte-mot button[aria-label="Téléverser une image pour « ${forme} »"]`,
      )!;
    const boutonRetirer = (forme: string) =>
      racine.querySelector<HTMLButtonElement>(
        `app-carte-mot button[aria-label="Retirer « ${forme} » de la préparation"]`,
      )!;

    it('« Téléverser » ouvre le Dialogue ; le Mot illustré remplace la Carte, sur une colonne, compteur et focus suivent', async () => {
      await ouvrir({ ...PREPARATION, nombreMots: 2 }, MODULES, THEMES, albumDe(PREPARATION), [
        GALETTE,
        CITROUILLE,
      ]);
      expect(texte('.entete__compteur')).toBe('2 mots, 0 déjà illustrés');

      boutonTeleverser('citrouille').click();
      await stabiliser();
      const dialogue = document.querySelector('app-televerser-image')!;
      expect(dialogue.querySelector('.televerser__mot')?.textContent).toContain('citrouille');
      expect(dialogue.querySelector<HTMLInputElement>('.televerser__album')?.value).toBe(
        'La Roule Galette',
      );

      // Le Dialogue ferme avec le Mot illustré renvoyé par le back (couvert par son propre spec).
      TestBed.inject(MatDialog).openDialogs[0].close(ILLUSTREE);
      await stabiliser();

      expect(cartes()).toEqual(['galette', 'citrouille']);
      expect(
        [...racine.querySelectorAll('.mots__element')].map((element) =>
          element.classList.contains('mots__element--a-illustrer'),
        ),
      ).toEqual([true, false]);
      serveur
        .expectOne((requete) => requete.url === `/api/images/${IMAGE}/fichier`)
        .flush(new Blob(['png']));
      await stabiliser();
      expect(racine.querySelector('.carte-mot__miniature')?.getAttribute('alt')).toBe(
        'citrouille, à compléter',
      );
      expect(texte('.entete__compteur')).toBe('2 mots, 1 déjà illustré');
      expect(document.activeElement).toBe(boutonRetirer('citrouille'));
      expect(texte('p[aria-live="polite"]')).toBe('Image enregistrée pour « citrouille ».');
    });

    it('« Annuler » le retrait d’un Mot illustré : le rétablissement renvoie son Image', async () => {
      const afficher = vi.fn<(message: string, annuler: () => unknown) => void>();
      vi.spyOn(TestBed.inject(BandeauAnnuler), 'afficher').mockImplementation(afficher);
      await ouvrir(
        { ...PREPARATION, nombreMots: 2, nombreIllustres: 1 },
        MODULES,
        THEMES,
        albumDe(PREPARATION),
        [GALETTE, ILLUSTREE],
      );
      expect(texte('.entete__compteur')).toBe('2 mots, 1 déjà illustré');

      boutonRetirer('citrouille').click();
      await stabiliser();
      expect(texte('.entete__compteur')).toBe('1 mot, 0 déjà illustré');
      serveur.expectOne(`${URL_MOTS}/${ILLUSTREE.id}`).flush(ILLUSTREE);
      await stabiliser();
      afficher.mock.lastCall![1]();
      await stabiliser();

      const requete = serveur.expectOne(`${URL_MOTS}/retablissement`);
      expect(requete.request.body).toEqual({
        motId: ILLUSTREE.motId,
        sensId: ILLUSTREE.sens.id,
        ordre: 2,
        themeId: null,
        imageId: IMAGE,
      });
      requete.flush(ILLUSTREE, { status: 201, statusText: 'Created' });
      await stabiliser();
      expect(texte('.entete__compteur')).toBe('2 mots, 1 déjà illustré');
      expect(texte('p[aria-live="polite"]')).toBe('« citrouille » rétabli.');
    });

    it('« Annuler » quand l’Image n’est plus disponible : le Mot revient « à illustrer », l’annonce le dit', async () => {
      const afficher = vi.fn<(message: string, annuler: () => unknown) => void>();
      vi.spyOn(TestBed.inject(BandeauAnnuler), 'afficher').mockImplementation(afficher);
      await ouvrir(
        { ...PREPARATION, nombreMots: 2, nombreIllustres: 1 },
        MODULES,
        THEMES,
        albumDe(PREPARATION),
        [GALETTE, ILLUSTREE],
      );
      boutonRetirer('citrouille').click();
      await stabiliser();
      serveur.expectOne(`${URL_MOTS}/${ILLUSTREE.id}`).flush(ILLUSTREE);
      await stabiliser();
      afficher.mock.lastCall![1]();
      await stabiliser();

      serveur
        .expectOne(`${URL_MOTS}/retablissement`)
        .flush(CITROUILLE, { status: 201, statusText: 'Created' });
      await stabiliser();

      expect(cartes()).toEqual(['galette', 'citrouille']);
      expect(texte('.entete__compteur')).toBe('2 mots, 0 déjà illustrés');
      expect(texte('p[aria-live="polite"]')).toBe(
        "« citrouille » rétabli, sans son image, qui n'est plus disponible.",
      );
      expect(racine.querySelector('app-bandeau-erreur.erreur-retablissement')).toBeNull();
    });
  });

  describe('Carte d’identité (story 2.6, partie 1)', () => {
    const GALETTE = motPreparation('galette', 1);
    const IMAGE_1 = '0190f0a0-0000-7000-8000-0000000c0011';
    const IMAGE_2 = '0190f0a0-0000-7000-8000-0000000c0012';
    function illustre(mot: MotPreparationDto, id: string): MotPreparationDto {
      return {
        ...mot,
        illustre: true,
        image: {
          id,
          proprietaireId: MOI,
          etat: 'privee',
          aRemplacer: null,
          reutilisable: true,
          typeImage: 'image_libre',
          aCompleter: false,
        },
      };
    }
    const CITROUILLE = illustre(motPreparation('citrouille', 2), IMAGE_1);
    const POTIRON = illustre(motPreparation('potiron', 3), IMAGE_2);
    const original = { creer: URL.createObjectURL, revoquer: URL.revokeObjectURL };

    beforeEach(() => {
      URL.createObjectURL = vi.fn(() => 'blob:http://localhost/image');
      URL.revokeObjectURL = vi.fn();
      document.body.appendChild(racine);
    });

    afterEach(() => {
      serveur.match((requete) => requete.url.endsWith('/fichier'));
      serveur.match('/api/enseignants');
      racine.remove();
      URL.createObjectURL = original.creer;
      URL.revokeObjectURL = original.revoquer;
    });

    const vignette = (forme: string) =>
      racine.querySelector<HTMLButtonElement>(
        `app-carte-mot button[aria-label="Changer l'image de « ${forme} »"]`,
      )!;
    const panneau = () => racine.querySelector<HTMLElement>('app-carte-identite aside');
    const MOTS: Record<string, MotPreparationDto> = { citrouille: CITROUILLE, potiron: POTIRON };

    /**
     * La vignette ouvre le Panneau de choix d'Image (story 2.7, partie 3) ; son bouton « Carte d'identité » ouvre à sa
     * place le Panneau Carte d'identité.
     */
    async function ouvrirCarte(forme: string) {
      const mot = MOTS[forme];
      vignette(forme).click();
      await stabiliser();
      serveur.expectOne(lecturePropositions(`${URL_MOTS}/${mot.id}/propositions`)).flush({
        motId: mot.motId,
        forme,
        dejaDansLaPreparation: true,
        sens: [],
        albums: [],
        images: [],
      });
      await stabiliser();
      racine
        .querySelector<HTMLButtonElement>('app-panneau-choix-image .choix-image__carte-identite')!
        .click();
      await stabiliser();
    }

    async function ouvrirGrille() {
      await ouvrir({ ...PREPARATION, nombreMots: 3 }, MODULES, THEMES, albumDe(PREPARATION), [
        GALETTE,
        CITROUILLE,
        POTIRON,
      ]);
    }

    it('la vignette ouvre le panneau à droite, la Grille reste affichée, le focus va au panneau', async () => {
      await ouvrirGrille();
      expect(panneau()).toBeNull();

      await ouvrirCarte('citrouille');

      expect(racine.querySelector('.disposition')?.classList).toContain('disposition--panneau');
      expect(panneau()).not.toBeNull();
      expect(cartes()).toEqual(['galette', 'citrouille', 'potiron']);
      expect(document.activeElement).toBe(panneau());
      serveur.expectOne(`/api/images/${IMAGE_1}`);
    });

    it('une autre vignette remplace le panneau : un seul à la fois', async () => {
      await ouvrirGrille();
      await ouvrirCarte('citrouille');
      await ouvrirCarte('potiron');

      expect(racine.querySelectorAll('app-carte-identite')).toHaveLength(1);
      serveur.expectOne(`/api/images/${IMAGE_1}`);
      serveur.expectOne(`/api/images/${IMAGE_2}`);
    });

    it('Échap ferme le panneau et rend le focus à la vignette', async () => {
      await ouvrirGrille();
      await ouvrirCarte('citrouille');
      serveur.expectOne(`/api/images/${IMAGE_1}`);

      panneau()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await stabiliser();

      expect(panneau()).toBeNull();
      expect(racine.querySelector('.disposition')?.classList).not.toContain('disposition--panneau');
      expect(document.activeElement).toBe(vignette('citrouille'));
    });

    it('« Fermer » ferme le panneau et rend le focus à la vignette', async () => {
      await ouvrirGrille();
      await ouvrirCarte('potiron');
      serveur.expectOne(`/api/images/${IMAGE_2}`);

      panneau()!.querySelector<HTMLButtonElement>('button[aria-label="Fermer"]')!.click();
      await stabiliser();

      expect(panneau()).toBeNull();
      expect(document.activeElement).toBe(vignette('potiron'));
    });

    it('le propriétaire passe l’image libre en photo personnelle : le Badge de la Carte de Mot change aussi', async () => {
      TestBed.inject(CompteCourant).mettreAJour({
        id: MOI,
        administrateur: false,
        email: 'moi@ecole.fr',
        nomAffiche: 'Moi',
      });
      await ouvrirGrille();
      await ouvrirCarte('citrouille');
      const carte = {
        id: IMAGE_1,
        proprietaireId: MOI,
        etat: 'privee' as const,
        aRemplacer: null,
        reutilisable: true,
        typeImage: 'image_libre' as const,
        aCompleter: false,
        motId: CITROUILLE.motId,
        forme: 'citrouille',
        sens: { id: CITROUILLE.motId, libelle: 'légume', categorie: 'nom', aCompleter: false },
        albumOrigine: null,
        licence: 'cc0_domaine_public' as const,
        source: 'site web',
        auteur: null,
      };
      serveur.expectOne(`/api/images/${IMAGE_1}`).flush(carte);
      await stabiliser();
      const badge = (forme: string) =>
        [...racine.querySelectorAll('app-carte-mot')]
          .find((element) => element.textContent?.includes(forme))!
          .querySelector('app-badge-type-image')
          ?.textContent?.replace(/\s+/g, ' ')
          .trim();
      expect(badge('citrouille')).toBe('Type : image libre');

      panneau()!
        .querySelector<HTMLElement>('.carte-identite__type .mat-mdc-select-trigger')!
        .click();
      await stabiliser();
      [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option')]
        .find((option) => option.textContent?.trim() === 'photo personnelle')!
        .click();
      await stabiliser();
      serveur
        .expectOne(`/api/images/${IMAGE_1}/description`)
        .flush({ ...carte, typeImage: 'photo_personnelle', licence: 'droits_auteur_enseignant' });
      await stabiliser();

      expect(badge('citrouille')).toBe('Type : photo personnelle');
      expect(badge('potiron')).toBe('Type : image libre');
      document
        .querySelectorAll('.cdk-overlay-container')
        .forEach((surcouche) => surcouche.remove());
    });

    it('panneau fermé pendant l’enregistrement : la réponse change quand même le Badge de la Carte de Mot', async () => {
      TestBed.inject(CompteCourant).mettreAJour({
        id: MOI,
        administrateur: false,
        email: 'moi@ecole.fr',
        nomAffiche: 'Moi',
      });
      await ouvrirGrille();
      await ouvrirCarte('citrouille');
      const carte = {
        id: IMAGE_1,
        proprietaireId: MOI,
        etat: 'privee' as const,
        aRemplacer: null,
        reutilisable: true,
        typeImage: 'image_libre' as const,
        aCompleter: false,
        motId: CITROUILLE.motId,
        forme: 'citrouille',
        sens: { id: CITROUILLE.motId, libelle: 'légume', categorie: 'nom', aCompleter: false },
        albumOrigine: null,
        licence: 'cc0_domaine_public' as const,
        source: 'site web',
        auteur: null,
      };
      serveur.expectOne(`/api/images/${IMAGE_1}`).flush(carte);
      await stabiliser();
      const badge = (forme: string) =>
        [...racine.querySelectorAll('app-carte-mot')]
          .find((element) => element.textContent?.includes(forme))!
          .querySelector('app-badge-type-image')
          ?.textContent?.replace(/\s+/g, ' ')
          .trim();
      expect(badge('citrouille')).toBe('Type : image libre');

      panneau()!
        .querySelector<HTMLElement>('.carte-identite__type .mat-mdc-select-trigger')!
        .click();
      await stabiliser();
      [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option')]
        .find((option) => option.textContent?.trim() === 'photo personnelle')!
        .click();
      await stabiliser();
      const requete = serveur.expectOne(`/api/images/${IMAGE_1}/description`);
      panneau()!.querySelector<HTMLButtonElement>('button[aria-label="Fermer"]')!.click();
      await stabiliser();
      expect(panneau()).toBeNull();
      requete.flush({
        ...carte,
        typeImage: 'photo_personnelle',
        licence: 'droits_auteur_enseignant',
      });
      await stabiliser();

      expect(badge('citrouille')).toBe('Type : photo personnelle');
      expect(badge('potiron')).toBe('Type : image libre');
      document
        .querySelectorAll('.cdk-overlay-container')
        .forEach((surcouche) => surcouche.remove());
    });

    it('« Carte d’identité » ouvre le panneau à la place du Panneau de choix d’Image : un seul à la fois', async () => {
      await ouvrirGrille();
      await ouvrirCarte('citrouille');

      expect(racine.querySelector('app-panneau-choix-image')).toBeNull();
      expect(racine.querySelectorAll('app-carte-identite')).toHaveLength(1);
      expect(document.activeElement).toBe(panneau());
      serveur.expectOne(`/api/images/${IMAGE_1}`);
    });

    it('ouvrir une autre Préparation ferme le panneau', async () => {
      await ouvrirGrille();
      await ouvrirCarte('citrouille');
      serveur.expectOne(`/api/images/${IMAGE_1}`);

      fixture.componentRef.setInput('id', AUTRE_ID);
      await stabiliser();

      expect(racine.querySelector('app-carte-identite')).toBeNull();
      serveur.expectOne(`/api/preparations/${AUTRE_ID}`);
    });

    it('panneau ouvert sur grand écran : la page reste active', async () => {
      await ouvrirGrille();
      await ouvrirCarte('citrouille');
      serveur.expectOne(`/api/images/${IMAGE_1}`);

      expect(racine.querySelector('.disposition')?.classList).not.toContain(
        'disposition--plein-ecran',
      );
      expect(racine.querySelector('.page')?.hasAttribute('inert')).toBe(false);
    });

    it('retirer le Mot affiché ferme le panneau', async () => {
      await ouvrirGrille();
      await ouvrirCarte('citrouille');
      serveur.expectOne(`/api/images/${IMAGE_1}`);

      racine
        .querySelector<HTMLButtonElement>(
          'app-carte-mot button[aria-label="Retirer « citrouille » de la préparation"]',
        )!
        .click();
      await stabiliser();

      expect(panneau()).toBeNull();
      serveur.expectOne(`${URL_MOTS}/${CITROUILLE.id}`);
    });
  });

  describe('Panneau de choix d’Image (story 2.7, partie 3)', () => {
    const GALETTE = motPreparation('galette', 1);
    const IMAGE_X = '0190f0a0-0000-7000-8000-0000000c0031';
    const IMAGE_Y = '0190f0a0-0000-7000-8000-0000000c0032';
    const IMAGE_Z = '0190f0a0-0000-7000-8000-0000000c0033';
    function image(id: string): NonNullable<MotPreparationDto['image']> {
      return {
        id,
        proprietaireId: MOI,
        etat: 'privee',
        aRemplacer: null,
        reutilisable: true,
        typeImage: 'image_libre',
        aCompleter: false,
      };
    }
    const FARINE: MotPreparationDto = {
      ...motPreparation('farine', 2),
      sens: { id: '0190f0a0-0000-7000-8000-0000000d0002', libelle: 'farine', categorie: 'nom' },
      illustre: true,
      image: image(IMAGE_X),
    };
    /** Image proposée pour « farine », au format de la détection. */
    function proposition(id: string): DetectionImageDto {
      return {
        ...image(id),
        sections: ['ms'],
        albumOrigine: null,
        sens: { id: FARINE.sens.id, libelle: 'farine', categorie: 'nom', aCompleter: false },
        dejaUtilisee: false,
      };
    }
    const PROPOSITIONS: DetectionMotDto = {
      motId: FARINE.motId,
      forme: 'farine',
      dejaDansLaPreparation: true,
      sens: [{ id: FARINE.sens.id, libelle: 'farine', categorie: 'nom', aCompleter: false }],
      albums: [],
      images: [proposition(IMAGE_Y), proposition(IMAGE_X)],
    };
    const URL_PROPOSITIONS = `${URL_MOTS}/${FARINE.id}/propositions`;
    const URL_IMAGE = `${URL_MOTS}/${FARINE.id}/image`;
    const original = { creer: URL.createObjectURL, revoquer: URL.revokeObjectURL };

    beforeEach(() => {
      URL.createObjectURL = vi.fn(() => 'blob:http://localhost/image');
      URL.revokeObjectURL = vi.fn();
      document.body.appendChild(racine);
    });

    afterEach(() => {
      serveur.match((requete) => requete.url.endsWith('/fichier'));
      serveur.match('/api/enseignants');
      document
        .querySelectorAll('.cdk-overlay-container')
        .forEach((surcouche) => surcouche.remove());
      racine.remove();
      URL.createObjectURL = original.creer;
      URL.revokeObjectURL = original.revoquer;
    });

    const vignette = (forme: string) =>
      racine.querySelector<HTMLButtonElement>(
        `app-carte-mot button[aria-label="Changer l'image de « ${forme} »"]`,
      )!;
    const panneau = () => racine.querySelector<HTMLElement>('app-panneau-choix-image aside');
    const liste = () =>
      racine.querySelector<HTMLElement>('app-panneau-choix-image [role="listbox"]')!;
    const options = () => [
      ...racine.querySelectorAll<HTMLElement>('app-panneau-choix-image [role="option"]'),
    ];

    async function ouvrirGrille() {
      await ouvrir(
        { ...PREPARATION, nombreMots: 2, nombreIllustres: 1 },
        MODULES,
        THEMES,
        albumDe(PREPARATION),
        [GALETTE, FARINE],
      );
    }

    async function ouvrirChoix(propositions: DetectionMotDto = PROPOSITIONS) {
      vignette('farine').click();
      await stabiliser();
      serveur.expectOne(lecturePropositions(URL_PROPOSITIONS)).flush(propositions);
      await stabiliser();
    }

    it('la vignette ouvre le panneau à droite, la Grille reste affichée, le focus va à la liste', async () => {
      await ouvrirGrille();

      await ouvrirChoix();

      expect(panneau()).not.toBeNull();
      expect(racine.querySelector('.disposition')?.classList).toContain('disposition--panneau');
      expect(cartes()).toEqual(['galette', 'farine']);
      expect(panneau()!.querySelector('.choix-image__forme')?.textContent).toBe('farine');
      expect(panneau()!.querySelector('.choix-image__sens')?.textContent).toBe(
        'Sens : farine (nom)',
      );
      expect(options().map((option) => option.id)).toEqual([
        `choix-image-${IMAGE_Y}`,
        `choix-image-${IMAGE_X}`,
      ]);
      // L'Image actuelle porte « actuelle », dans le texte et dans le nom accessible.
      expect(options()[1].querySelector('.vignette__actuelle')?.textContent).toBe('actuelle');
      expect(options()[1].getAttribute('aria-label')).toBe(
        'farine, farine (nom), —, actuelle, MS, image libre',
      );
      expect(document.activeElement).toBe(liste());
    });

    it('la vignette « + » d’une Carte « à illustrer » ouvre le panneau', async () => {
      await ouvrirGrille();

      racine
        .querySelector<HTMLButtonElement>(
          'app-carte-mot button[aria-label="Choisir une image pour « galette »"]',
        )!
        .click();
      await stabiliser();
      serveur.expectOne(lecturePropositions(`${URL_MOTS}/${GALETTE.id}/propositions`)).flush({
        motId: GALETTE.motId,
        forme: 'galette',
        dejaDansLaPreparation: true,
        sens: [],
        albums: [],
        images: [],
      });
      await stabiliser();

      expect(panneau()).not.toBeNull();
      expect(panneau()!.querySelector('.choix-image__vide')?.textContent).toBe(
        'Aucune image pour ce mot.',
      );
      expect(panneau()!.querySelector('.choix-image__carte-identite')).toBeNull();
      expect(panneau()!.querySelector('.choix-image__ajouter')?.textContent?.trim()).toBe(
        'Ajouter une image',
      );
    });

    it('↓ puis Entrée : l’Image remplace l’actuelle, panneau fermé, Carte mise à jour, focus sur la vignette', async () => {
      await ouvrirGrille();
      await ouvrirChoix();

      liste().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await stabiliser();
      expect(liste().getAttribute('aria-activedescendant')).toBe(`choix-image-${IMAGE_Y}`);
      expect(options()[0].getAttribute('aria-selected')).toBe('true');
      liste().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await stabiliser();

      const requete = serveur.expectOne(URL_IMAGE);
      expect(requete.request.method).toBe('PUT');
      expect(requete.request.body).toEqual({ imageId: IMAGE_Y });
      requete.flush({ ...FARINE, image: image(IMAGE_Y) });
      await stabiliser();

      expect(panneau()).toBeNull();
      expect(racine.querySelector('.disposition')?.classList).not.toContain('disposition--panneau');
      // La miniature de la Carte (celle du panneau fermé est annulée).
      serveur
        .match((requete) => requete.url === `/api/images/${IMAGE_Y}/fichier`)
        .filter((requete) => !requete.cancelled)
        .forEach((requete) => requete.flush(new Blob(['png'])));
      await stabiliser();
      expect(document.activeElement).toBe(vignette('farine'));
      expect(texte('p[aria-live="polite"]')).toBe('Image de « farine » changée.');
    });

    it('Sens changé dans le panneau : Carte « à illustrer », annonce, panneau ouvert et liste relue', async () => {
      const CHUTE = {
        id: '0190f0a0-0000-7000-8000-0000000d0099',
        libelle: 'chute',
        categorie: 'nom',
      };
      await ouvrirGrille();
      await ouvrirChoix({
        ...PROPOSITIONS,
        sens: [...PROPOSITIONS.sens, { ...CHUTE, aCompleter: false }],
      });

      panneau()!.querySelector<HTMLElement>('.mat-mdc-select-trigger')!.click();
      await stabiliser();
      [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option')]
        .find((option) => option.textContent?.trim() === 'chute (nom)')!
        .click();
      await stabiliser();
      const requete = serveur.expectOne(`${URL_MOTS}/${FARINE.id}/sens`);
      expect(requete.request.method).toBe('PUT');
      expect(requete.request.body).toEqual({ sensId: CHUTE.id });
      requete.flush({ ...FARINE, sens: CHUTE, illustre: false, image: null });
      await stabiliser();

      const relecture = serveur.expectOne(lecturePropositions(URL_PROPOSITIONS));
      expect(relecture.request.params.get('sensId')).toBe(CHUTE.id);
      relecture.flush({ ...PROPOSITIONS, images: [] });
      await stabiliser();

      expect(panneau()).not.toBeNull();
      expect(
        [...racine.querySelectorAll('.mots__element')].map((element) =>
          element.classList.contains('mots__element--a-illustrer'),
        ),
      ).toEqual([true, true]);
      expect(texte('p[aria-live="polite"]')).toBe(
        'Sens de « farine » : chute (nom). Image retirée.',
      );
    });

    it('Sens créé dans le panneau : Carte mise à jour, puis l’Image choisie porte « Mot, nouveau Sens »', async () => {
      const POUDRE = {
        id: '0190f0a0-0000-7000-8000-0000000d0098',
        libelle: 'poudre',
        categorie: 'nom',
      };
      await ouvrirGrille();
      await ouvrirChoix();

      [...panneau()!.querySelectorAll<HTMLButtonElement>('button')]
        .find((bouton) => bouton.textContent?.replace(/\s+/g, ' ').trim() === 'Nouveau sens')!
        .click();
      await stabiliser();
      const libelle = panneau()!.querySelector<HTMLInputElement>('.creation-sens__libelle')!;
      libelle.value = 'poudre';
      libelle.dispatchEvent(new Event('input'));
      await stabiliser();
      [...panneau()!.querySelectorAll<HTMLButtonElement>('button')]
        .find((bouton) => bouton.textContent?.trim() === 'Créer le sens')!
        .click();
      await stabiliser();
      const requete = serveur.expectOne(`${URL_MOTS}/${FARINE.id}/sens`);
      expect(requete.request.method).toBe('POST');
      expect(requete.request.body).toEqual({ libelle: 'poudre', categorie: 'nom' });
      requete.flush({ ...FARINE, sens: POUDRE, illustre: false, image: null });
      await stabiliser();

      expect(texte('p[aria-live="polite"]')).toBe(
        'Sens de « farine » : poudre (nom). Image retirée.',
      );
      const relecture = serveur.expectOne(lecturePropositions(URL_PROPOSITIONS));
      expect(relecture.request.params.get('sensId')).toBe(POUDRE.id);
      relecture.flush({
        ...PROPOSITIONS,
        sens: [...PROPOSITIONS.sens, { ...POUDRE, aCompleter: false }],
        images: [{ ...proposition(IMAGE_Y), sens: { ...POUDRE, aCompleter: false } }],
      });
      await stabiliser();
      expect(panneau()).not.toBeNull();

      options()[0].click();
      await stabiliser();
      serveur
        .expectOne(URL_IMAGE)
        .flush({ ...FARINE, sens: POUDRE, illustre: true, image: image(IMAGE_Y) });
      await stabiliser();
      expect(texte(`#carte-mot-alternative-${FARINE.id}`)).toBe('farine, poudre');
    });

    it('un clic sur une Image la lie ; une Carte « à illustrer » devient illustrée', async () => {
      await ouvrirGrille();
      racine
        .querySelector<HTMLButtonElement>(
          'app-carte-mot button[aria-label="Choisir une image pour « galette »"]',
        )!
        .click();
      await stabiliser();
      serveur.expectOne(lecturePropositions(`${URL_MOTS}/${GALETTE.id}/propositions`)).flush({
        ...PROPOSITIONS,
        motId: GALETTE.motId,
        forme: 'galette',
        images: [proposition(IMAGE_Z)],
      });
      await stabiliser();
      expect(texte('.entete__compteur')).toBe('2 mots, 1 déjà illustré');

      options()[0].click();
      await stabiliser();
      serveur
        .expectOne(`${URL_MOTS}/${GALETTE.id}/image`)
        .flush({ ...GALETTE, illustre: true, image: image(IMAGE_Z) });
      await stabiliser();

      expect(panneau()).toBeNull();
      expect(texte('.entete__compteur')).toBe('2 mots, 2 déjà illustrés');
      expect(
        [...racine.querySelectorAll('.mots__element')].map((element) =>
          element.classList.contains('mots__element--a-illustrer'),
        ),
      ).toEqual([false, false]);
      expect(document.activeElement).toBe(vignette('galette'));
      expect(texte('p[aria-live="polite"]')).toBe('Image de « galette » changée.');
    });

    it('retenir l’Image actuelle ferme le panneau sans requête', async () => {
      await ouvrirGrille();
      await ouvrirChoix();

      options()[1].click();
      await stabiliser();

      expect(panneau()).toBeNull();
      serveur.expectNone(URL_IMAGE);
      expect(document.activeElement).toBe(vignette('farine'));
    });

    it('Échap ferme le panneau sans requête et rend le focus à la vignette', async () => {
      await ouvrirGrille();
      await ouvrirChoix();

      liste().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      liste().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await stabiliser();

      expect(panneau()).toBeNull();
      serveur.expectNone(URL_IMAGE);
      expect(document.activeElement).toBe(vignette('farine'));
    });

    it('Image indisponible : message dans le panneau, liste relue, panneau ouvert, pas de Bandeau', async () => {
      await ouvrirGrille();
      await ouvrirChoix();

      options()[0].click();
      await stabiliser();
      serveur
        .expectOne(URL_IMAGE)
        .flush(
          { status: 404, code: 'image.indisponible', title: 'Not Found' },
          { status: 404, statusText: 'Not Found' },
        );
      await stabiliser();

      expect(panneau()).not.toBeNull();
      expect(panneau()!.querySelector('.choix-image__message')?.textContent).toBe(
        "Cette image n'est plus disponible.",
      );
      serveur
        .expectOne(lecturePropositions(URL_PROPOSITIONS))
        .flush({ ...PROPOSITIONS, images: [proposition(IMAGE_X)] });
      await stabiliser();
      expect(options()).toHaveLength(1);
      expect(racine.querySelector('.page app-bandeau-erreur')).toBeNull();
    });

    it('autre échec : message dans le panneau, qui reste ouvert', async () => {
      await ouvrirGrille();
      await ouvrirChoix();

      options()[0].click();
      await stabiliser();
      serveur.expectOne(URL_IMAGE).error(new ProgressEvent('error'));
      await stabiliser();

      expect(panneau()).not.toBeNull();
      expect(panneau()!.querySelector('.choix-image__message')?.textContent).toBe(MESSAGE_RESEAU);
      serveur.expectNone(lecturePropositions(URL_PROPOSITIONS));
    });

    it('le Panneau Carte d’identité ouvert, la vignette d’une autre Carte n’affiche que le Panneau de choix', async () => {
      const POTIRON: MotPreparationDto = {
        ...motPreparation('potiron', 3),
        illustre: true,
        image: image(IMAGE_Z),
      };
      await ouvrir(
        { ...PREPARATION, nombreMots: 3, nombreIllustres: 2 },
        MODULES,
        THEMES,
        albumDe(PREPARATION),
        [GALETTE, FARINE, POTIRON],
      );
      await ouvrirChoix();
      panneau()!.querySelector<HTMLButtonElement>('.choix-image__carte-identite')!.click();
      await stabiliser();
      serveur.expectOne(`/api/images/${IMAGE_X}`);
      expect(racine.querySelector('app-carte-identite')).not.toBeNull();
      expect(panneau()).toBeNull();

      vignette('potiron').click();
      await stabiliser();
      serveur
        .expectOne(lecturePropositions(`${URL_MOTS}/${POTIRON.id}/propositions`))
        .flush({ ...PROPOSITIONS, motId: POTIRON.motId, forme: 'potiron', images: [] });
      await stabiliser();

      expect(racine.querySelector('app-carte-identite')).toBeNull();
      expect(racine.querySelectorAll('app-panneau-choix-image')).toHaveLength(1);
    });

    it('« Ajouter une image » : le Dialogue remplace l’Image, la Carte la montre et le panneau se ferme', async () => {
      const ouvrirDialogue = vi.spyOn(TestBed.inject(MatDialog), 'open');
      await ouvrirGrille();
      await ouvrirChoix();

      panneau()!.querySelector<HTMLButtonElement>('.choix-image__ajouter')!.click();
      await stabiliser();
      expect(document.querySelector('app-televerser-image')).not.toBeNull();
      expect(ouvrirDialogue.mock.lastCall![1]!.data).toEqual(
        expect.objectContaining({ preparationId: ID, mot: FARINE, remplacer: true }),
      );

      TestBed.inject(MatDialog).openDialogs[0].close({ ...FARINE, image: image(IMAGE_Z) });
      await stabiliser();

      expect(panneau()).toBeNull();
      serveur
        .expectOne((requete) => requete.url === `/api/images/${IMAGE_Z}/fichier`)
        .flush(new Blob(['png']));
      await stabiliser();
      expect(document.activeElement).toBe(vignette('farine'));
      expect(texte('p[aria-live="polite"]')).toBe('Image de « farine » changée.');
    });

    it('la vignette du Mot déjà affiché rend le focus au panneau, sans relire', async () => {
      await ouvrirGrille();
      await ouvrirChoix();
      vignette('farine').focus();

      vignette('farine').click();
      await stabiliser();

      expect(document.activeElement).toBe(panneau());
      serveur.expectNone(lecturePropositions(URL_PROPOSITIONS));
    });

    it('deux changements de la même Image : l’annonce est vidée puis répétée', async () => {
      await ouvrirGrille();
      const region = racine.querySelector<HTMLElement>('p[aria-live="polite"]')!;
      const annonces: string[] = [];
      const observateur = new MutationObserver(() => annonces.push(region.textContent ?? ''));
      observateur.observe(region, { childList: true, characterData: true, subtree: true });

      for (const id of [IMAGE_Y, IMAGE_Z]) {
        await ouvrirChoix({ ...PROPOSITIONS, images: [proposition(id)] });
        options()[0].click();
        await stabiliser();
        serveur.expectOne(URL_IMAGE).flush({ ...FARINE, image: image(id) });
        await stabiliser();
        await stabiliser();
      }
      observateur.disconnect();

      expect(annonces.filter((texte) => texte === 'Image de « farine » changée.')).toHaveLength(2);
      expect(region.textContent).toBe('Image de « farine » changée.');
    });

    it('code du panneau introuvable : rien ne reste ouvert, le message réseau est annoncé, un clic réessaie', async () => {
      await ouvrirGrille();
      const page = fixture.componentInstance as unknown as { codePanneauChoix: Promise<unknown> };
      const echec = Promise.reject(new Error('chunk introuvable'));
      echec.catch(() => undefined);
      page.codePanneauChoix = echec;

      vignette('farine').click();
      await stabiliser();
      await stabiliser();

      expect(racine.querySelector('app-panneau-choix-image')).toBeNull();
      expect(racine.querySelector('.disposition')?.classList).not.toContain('disposition--panneau');
      expect(racine.querySelector('.page')?.hasAttribute('inert')).toBe(false);
      expect(texte('p[aria-live="polite"]')).toBe(MESSAGE_RESEAU);
      expect(page.codePanneauChoix).toBeNull();

      await ouvrirChoix();
      expect(panneau()).not.toBeNull();
    });

    it('retirer le Mot affiché ferme le panneau', async () => {
      await ouvrirGrille();
      await ouvrirChoix();

      racine
        .querySelector<HTMLButtonElement>(
          'app-carte-mot button[aria-label="Retirer « farine » de la préparation"]',
        )!
        .click();
      await stabiliser();

      expect(panneau()).toBeNull();
      serveur.expectOne(`${URL_MOTS}/${FARINE.id}`);
    });
  });
});

describe('Preparation (Carte d’identité sous 600 px)', () => {
  const IMAGE = '0190f0a0-0000-7000-8000-0000000c0021';
  const CITROUILLE: MotPreparationDto = {
    ...motPreparation('citrouille', 1),
    illustre: true,
    image: {
      id: IMAGE,
      proprietaireId: MOI,
      etat: 'privee',
      aRemplacer: null,
      reutilisable: true,
      typeImage: 'image_libre',
      aCompleter: false,
    },
  };

  async function ouvrirPanneau(matches: boolean, carteIdentite = true) {
    TestBed.configureTestingModule({
      imports: [Preparation],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideIcones(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
        {
          provide: BreakpointObserver,
          useValue: { observe: () => of({ matches, breakpoints: {} }) },
        },
      ],
    });
    const serveur = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Preparation);
    fixture.componentRef.setInput('id', ID);
    const stabiliser = async () => {
      await new Promise((fin) => setTimeout(fin));
      await fixture.whenStable();
    };
    await stabiliser();
    serveur.expectOne(`/api/preparations/${ID}`).flush(PREPARATION);
    await stabiliser();
    serveur.expectOne(`/api/albums/${ALBUM}`).flush(albumDe(PREPARATION));
    serveur.expectOne(`/api/albums/${ALBUM}/modules`).flush(MODULES);
    serveur.expectOne('/api/themes').flush(THEMES);
    serveur.expectOne(`/api/preparations/${ID}/mots`).flush([CITROUILLE]);
    await stabiliser();
    const racine = fixture.nativeElement as HTMLElement;
    racine
      .querySelector<HTMLButtonElement>(`button[aria-label="Changer l'image de « citrouille »"]`)!
      .click();
    await stabiliser();
    serveur.expectOne(lecturePropositions(`${URL_MOTS}/${CITROUILLE.id}/propositions`)).flush({
      motId: CITROUILLE.motId,
      forme: 'citrouille',
      dejaDansLaPreparation: true,
      sens: [],
      albums: [],
      images: [],
    });
    await stabiliser();
    if (carteIdentite) {
      racine
        .querySelector<HTMLButtonElement>('app-panneau-choix-image .choix-image__carte-identite')!
        .click();
      await stabiliser();
    }
    serveur.match(() => true);
    return racine;
  }

  it('sous 600 px : le panneau couvre l’écran et la page dessous est inerte', async () => {
    const racine = await ouvrirPanneau(true);

    expect(racine.querySelector('.disposition')?.classList).toContain('disposition--plein-ecran');
    expect(racine.querySelector('app-carte-identite')).not.toBeNull();
    expect(racine.querySelector('.page')?.hasAttribute('inert')).toBe(true);
  });

  it('sous 600 px, Panneau de choix d’Image seul : la page dessous est inerte', async () => {
    const racine = await ouvrirPanneau(true, false);

    expect(racine.querySelector('app-panneau-choix-image')).not.toBeNull();
    expect(racine.querySelector('app-carte-identite')).toBeNull();
    expect(racine.querySelector('.disposition')?.classList).toContain('disposition--plein-ecran');
    expect(racine.querySelector('.page')?.hasAttribute('inert')).toBe(true);
  });

  it('au-delà : ni plein écran, ni page inerte', async () => {
    const racine = await ouvrirPanneau(false);

    expect(racine.querySelector('.disposition')?.classList).not.toContain(
      'disposition--plein-ecran',
    );
    expect(racine.querySelector('app-carte-identite')).not.toBeNull();
    expect(racine.querySelector('.page')?.hasAttribute('inert')).toBe(false);
  });
});

describe('Libellés', () => {
  it('annonce d’un ajout avec un Sens, avec ou sans catégorie', () => {
    const mot = motPreparation('étalé', 1);
    expect(annonceAjoutAvecSens(mot)).toBe('« étalé » ajouté (à compléter).');
    expect(
      annonceAjoutAvecSens({ ...mot, sens: { ...mot.sens, libelle: 'chute', categorie: 'nom' } }),
    ).toBe('« étalé » ajouté (chute, nom).');
  });

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
