import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MotPreparationDto } from '../api/models/mot-preparation-dto';
import { ThemeDto } from '../api/models/theme-dto';
import { MESSAGE_RESEAU } from '../commun/erreurs/message-erreur';
import { provideIcones } from '../commun/icones';
import { ChangementTheme, ouvrirDialogueThemeMot } from './theme-mot-dialogue';

const PREPARATION = '0190f0a0-0000-7000-8000-00000000d001';
const MOI = '0190f0a0-0000-7000-8000-00000000e001';
const COLLEGUE = '0190f0a0-0000-7000-8000-00000000e002';
const AUTOMNE: ThemeDto = {
  id: '0190f0a0-0000-7000-8000-00000000c003',
  nom: 'automne',
  createurId: COLLEGUE,
};
const CUISINE: ThemeDto = {
  id: '0190f0a0-0000-7000-8000-00000000c001',
  nom: 'cuisine',
  createurId: MOI,
};
const THEMES = [AUTOMNE, CUISINE];
const CITROUILLE: MotPreparationDto = {
  id: '0190f0a0-0000-7000-8000-0000000f0001',
  motId: '0190f0a0-0000-7000-8000-0000000e0001',
  forme: 'citrouille',
  ordre: 1,
  sens: { id: '0190f0a0-0000-7000-8000-0000000d0001', libelle: 'à compléter' },
  illustre: false,
  themeId: CUISINE.id,
};
const URL_THEME_MOT = `/api/preparations/${PREPARATION}/mots/${CITROUILLE.id}/theme`;

describe('Dialogue « Thème de « … » »', () => {
  let serveur: HttpTestingController;
  let declencheur: HTMLButtonElement;
  let resultat: Promise<MotPreparationDto | undefined>;
  let changements: ChangementTheme[];

  const tour = () => new Promise((fin) => setTimeout(fin));

  async function stabiliser() {
    await tour();
    await TestBed.inject(ApplicationRef).whenStable();
    await tour();
  }

  async function ouvrir(mot: MotPreparationDto = CITROUILLE) {
    resultat = ouvrirDialogueThemeMot(
      TestBed.inject(Injector),
      {
        preparationId: PREPARATION,
        mot,
        themes: THEMES,
        gerable: (theme) => theme.createurId === MOI,
        themesModifies: (changement) => changements.push(changement),
      },
      declencheur,
    );
    await stabiliser();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideIcones(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
    serveur = TestBed.inject(HttpTestingController);
    changements = [];
    declencheur = document.createElement('button');
    declencheur.textContent = 'cuisine';
    document.body.appendChild(declencheur);
    declencheur.focus();
  });

  afterEach(() => {
    serveur.verify();
    declencheur.remove();
    document.querySelectorAll('.cdk-overlay-container').forEach((surcouche) => surcouche.remove());
  });

  const dialogues = () => document.querySelectorAll('mat-dialog-container');
  const titre = () => document.querySelector('app-theme-mot h2')?.textContent?.trim();
  const saisie = () =>
    document.querySelector<HTMLInputElement>('app-theme-mot app-champ-themes input')!;
  const etiquettes = () =>
    [...document.querySelectorAll('app-theme-mot mat-chip-row')].map((puce) =>
      puce.querySelector('.mdc-evolution-chip__text-label')?.textContent?.trim(),
    );
  const bouton = (libelle: string) =>
    [...document.querySelectorAll<HTMLButtonElement>('app-theme-mot button')].find(
      (element) => element.textContent?.trim() === libelle,
    )!;
  const bandeau = () =>
    document.querySelector('app-theme-mot app-bandeau-erreur [role="alert"]')?.textContent?.trim();

  /** Touche au clavier, avec le `keyCode` que lisent les composants Material. */
  function touche(cible: HTMLElement, key: string, keyCode: number) {
    const evenement = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    Object.defineProperty(evenement, 'keyCode', { get: () => keyCode });
    cible.dispatchEvent(evenement);
  }

  /** Tape `texte` dans le Champ à étiquettes et choisit au clavier la proposition mise en avant. */
  async function choisirAuClavier(texte: string) {
    saisie().focus();
    saisie().value = texte;
    saisie().dispatchEvent(new Event('input'));
    await stabiliser();
    await tour();
    touche(saisie(), 'Enter', 13);
    await stabiliser();
  }

  async function actionDeLEtiquette(libelle: 'Renommer' | 'Supprimer') {
    document.querySelector<HTMLElement>('app-theme-mot mat-chip-row')!.click();
    await stabiliser();
    [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane [mat-menu-item]')]
      .find((item) => item.textContent?.trim() === libelle)!
      .click();
    await stabiliser();
  }

  async function enregistrer() {
    bouton('Enregistrer').click();
    await stabiliser();
  }

  it('titre « Thème de « citrouille » », étiquette du Thème du Mot, focus dans la saisie', async () => {
    await ouvrir();

    expect(titre()).toBe('Thème de « citrouille »');
    expect(etiquettes()).toEqual(['cuisine']);
    expect(document.activeElement).toBe(saisie());
  });

  it('au clavier : un autre Thème remplace l’étiquette ; « Enregistrer » l’envoie et ferme avec le Mot', async () => {
    await ouvrir();

    await choisirAuClavier('autom');
    expect(etiquettes()).toEqual(['automne']);
    serveur.expectNone(URL_THEME_MOT);
    await enregistrer();

    const requete = serveur.expectOne(URL_THEME_MOT);
    expect(requete.request.method).toBe('PUT');
    expect(requete.request.body).toEqual({ themeId: AUTOMNE.id });
    const change = { ...CITROUILLE, themeId: AUTOMNE.id };
    requete.flush(change);
    await stabiliser();

    expect(await resultat).toEqual(change);
    expect(dialogues().length).toBe(0);
    expect(document.activeElement).toBe(declencheur);
  });

  it('Retour arrière retire l’étiquette : « Enregistrer » laisse le Mot sans thème', async () => {
    await ouvrir();

    saisie().focus();
    touche(saisie(), 'Backspace', 8);
    await stabiliser();
    expect(etiquettes()).toEqual([]);
    await enregistrer();

    const requete = serveur.expectOne(URL_THEME_MOT);
    expect(requete.request.body).toEqual({ themeId: null });
    requete.flush({ ...CITROUILLE, themeId: null });
    expect((await resultat)?.themeId).toBeNull();
  });

  it('Mot sans thème : aucune étiquette', async () => {
    await ouvrir({ ...CITROUILLE, themeId: null });

    expect(etiquettes()).toEqual([]);
  });

  it('Thème du Mot absent des Thèmes chargés : aucune étiquette, « Enregistrer » n’envoie rien', async () => {
    await ouvrir({ ...CITROUILLE, themeId: '0190f0a0-0000-7000-8000-00000000c0ff' });

    expect(etiquettes()).toEqual([]);
    await enregistrer();

    serveur.expectNone(URL_THEME_MOT);
    expect(await resultat).toBeUndefined();
  });

  it('Thème du Mot supprimé dans le Dialogue puis « Enregistrer » : rien n’est envoyé', async () => {
    await ouvrir();
    await actionDeLEtiquette('Supprimer');
    bouton('Supprimer le thème').click();
    await stabiliser();
    serveur.expectOne(`/api/themes/${CUISINE.id}`).flush('');
    await stabiliser();

    await enregistrer();

    serveur.expectNone(URL_THEME_MOT);
    expect(await resultat).toBeUndefined();
  });

  it('pendant une création de Thème : « Annuler » désactivé, Échap ne ferme pas le dialogue', async () => {
    await ouvrir();
    await choisirAuClavier('Les saisons');
    const creation = serveur.expectOne('/api/themes');

    expect(bouton('Annuler').disabled).toBe(true);
    touche(saisie(), 'Escape', 27);
    await stabiliser();
    expect(dialogues().length).toBe(1);

    creation.error(new ProgressEvent('error'), { status: 0 });
    await stabiliser();
    expect(
      document.querySelector('app-theme-mot app-champ-themes [role="alert"]')?.textContent?.trim(),
    ).toBe(MESSAGE_RESEAU);
    expect(bouton('Annuler').disabled).toBe(false);
  });

  it('« Enregistrer » sans changement ferme sans rien envoyer', async () => {
    await ouvrir();

    await enregistrer();

    serveur.expectNone(URL_THEME_MOT);
    expect(await resultat).toBeUndefined();
  });

  it('« Annuler » ferme sans rien envoyer, le focus revient au bouton du Thème', async () => {
    await ouvrir();
    await choisirAuClavier('autom');

    bouton('Annuler').click();
    await stabiliser();

    serveur.expectNone(URL_THEME_MOT);
    expect(await resultat).toBeUndefined();
    expect(document.activeElement).toBe(declencheur);
  });

  it('échec de l’envoi : message dans le dialogue, qui reste ouvert ; « Réessayer » renvoie', async () => {
    await ouvrir();
    await choisirAuClavier('autom');
    await enregistrer();

    serveur.expectOne(URL_THEME_MOT).error(new ProgressEvent('error'), { status: 0 });
    await stabiliser();

    expect(bandeau()).toBe(MESSAGE_RESEAU);
    expect(dialogues().length).toBe(1);
    expect(etiquettes()).toEqual(['automne']);

    bouton('Réessayer').click();
    await stabiliser();
    serveur.expectOne(URL_THEME_MOT).flush({ ...CITROUILLE, themeId: AUTOMNE.id });
    expect((await resultat)?.themeId).toBe(AUTOMNE.id);
  });

  it('Thème supprimé entre-temps : « Ce thème n’existe plus. », il disparaît du choix et la page est prévenue', async () => {
    await ouvrir();
    await choisirAuClavier('autom');
    await enregistrer();

    serveur
      .expectOne(URL_THEME_MOT)
      .flush(
        { code: 'preparation.theme_introuvable', status: 400 },
        { status: 400, statusText: 'Bad Request' },
      );
    await stabiliser();

    expect(bandeau()).toBe("Ce thème n'existe plus. Choisissez-en un autre.");
    expect(etiquettes()).toEqual([]);
    expect(changements).toEqual([{ type: 'supprime', theme: AUTOMNE }]);
    expect(dialogues().length).toBe(1);

    // Un refus se répéterait : « Réessayer » efface seulement le message.
    bouton('Réessayer').click();
    await stabiliser();
    serveur.expectNone(URL_THEME_MOT);
    expect(bandeau()).toBeUndefined();
  });

  it('« Créer le thème « … » » : le Thème créé est choisi, la page est prévenue, rien n’est encore envoyé', async () => {
    await ouvrir();

    await choisirAuClavier('Les saisons');
    const creation = serveur.expectOne('/api/themes');
    expect(creation.request.body).toEqual({ nom: 'Les saisons' });
    const saisons: ThemeDto = {
      id: '0190f0a0-0000-7000-8000-00000000c009',
      nom: 'Les saisons',
      createurId: MOI,
    };
    creation.flush(saisons, { status: 201, statusText: 'Created' });
    await stabiliser();

    expect(etiquettes()).toEqual(['Les saisons']);
    expect(changements).toEqual([{ type: 'cree', theme: saisons }]);
    serveur.expectNone(URL_THEME_MOT);
  });

  it('« Renommer » : champ en ligne prérempli, le Thème est renommé et la page prévenue', async () => {
    await ouvrir();

    await actionDeLEtiquette('Renommer');
    const champ = document.querySelector<HTMLInputElement>(
      'app-theme-mot app-champ-nom-module input',
    )!;
    expect(champ.value).toBe('cuisine');
    expect(bouton('Enregistrer').disabled).toBe(true);
    champ.value = 'la cuisine';
    champ.dispatchEvent(new Event('input'));
    await stabiliser();
    champ.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await stabiliser();

    const renommage = serveur.expectOne(`/api/themes/${CUISINE.id}/nom`);
    expect(renommage.request.body).toEqual({ nom: 'la cuisine' });
    const renomme = { ...CUISINE, nom: 'la cuisine' };
    renommage.flush(renomme);
    await stabiliser();

    expect(etiquettes()).toEqual(['la cuisine']);
    expect(changements).toEqual([{ type: 'renomme', theme: renomme }]);
    expect(document.activeElement).toBe(saisie());
  });

  it('« Supprimer » : confirmation sur place, sans second dialogue ; le Thème est supprimé et la page prévenue', async () => {
    await ouvrir();

    await actionDeLEtiquette('Supprimer');
    expect(dialogues().length).toBe(1);
    expect(document.querySelector('.theme-mot__suppression-phrase')?.textContent).toContain(
      'des mots qui le portent',
    );
    expect(document.activeElement).toBe(bouton('Annuler'));
    bouton('Supprimer le thème').click();
    await stabiliser();

    const suppression = serveur.expectOne(`/api/themes/${CUISINE.id}`);
    expect(suppression.request.method).toBe('DELETE');
    suppression.flush('');
    await stabiliser();

    expect(etiquettes()).toEqual([]);
    expect(changements).toEqual([{ type: 'supprime', theme: CUISINE }]);
    expect(document.activeElement).toBe(saisie());
    expect(dialogues().length).toBe(1);
  });

  it('« Supprimer » puis Échap : la confirmation se replie, le dialogue reste ouvert, rien n’est envoyé', async () => {
    await ouvrir();
    await actionDeLEtiquette('Supprimer');

    touche(document.activeElement as HTMLElement, 'Escape', 27);
    await stabiliser();

    expect(document.querySelector('.theme-mot__suppression')).toBeNull();
    expect(dialogues().length).toBe(1);
    expect(etiquettes()).toEqual(['cuisine']);
    expect(document.activeElement).toBe(saisie());
    serveur.expectNone(`/api/themes/${CUISINE.id}`);
  });

  it('suppression refusée (Thème utilisé) : Bandeau dans le dialogue, le Thème reste', async () => {
    await ouvrir();
    await actionDeLEtiquette('Supprimer');
    bouton('Supprimer le thème').click();
    await stabiliser();

    serveur
      .expectOne(`/api/themes/${CUISINE.id}`)
      // Opération sans corps de réponse : le client généré lit l'erreur RFC 9457 en texte.
      .flush(JSON.stringify({ status: 409, code: 'theme.utilise' }), {
        status: 409,
        statusText: 'Conflict',
      });
    await stabiliser();

    expect(bandeau()).toContain('utilisé par des images');
    expect(etiquettes()).toEqual(['cuisine']);
    expect(changements).toEqual([]);
  });
});
