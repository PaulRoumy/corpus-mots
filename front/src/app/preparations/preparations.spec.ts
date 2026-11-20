import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter } from '@angular/router';
import { CartePreparationDto } from '../api/models/carte-preparation-dto';
import { provideIcones } from '../commun/icones';
import { sectionSuivante } from './gerer-preparation-dialogues';
import { NouvellePreparation } from './nouvelle-preparation';
import { libelleActionsPreparation, libelleMots, Preparations } from './preparations';

const ROULE_GALETTE: CartePreparationDto = {
  id: '0190f0a0-0000-7000-8000-00000000d001',
  albumId: '0190f0a0-0000-7000-8000-00000000a001',
  titreAlbum: 'La Roule Galette',
  section: 'ms',
  moduleId: '0190f0a0-0000-7000-8000-00000000b001',
  nomModule: 'Module 1',
  nombreMots: 0,
  nombreAIllustrer: 0,
  creeLe: '2026-11-09T10:00:00Z',
};
const LOUP: CartePreparationDto = {
  id: '0190f0a0-0000-7000-8000-00000000d002',
  albumId: '0190f0a0-0000-7000-8000-00000000a002',
  titreAlbum: 'Le loup qui voulait changer de couleur',
  section: 'gs',
  nombreMots: 0,
  nombreAIllustrer: 0,
  creeLe: '2026-11-08T10:00:00Z',
};
const MOUFLE: CartePreparationDto = {
  id: '0190f0a0-0000-7000-8000-00000000d003',
  albumId: '0190f0a0-0000-7000-8000-00000000a003',
  titreAlbum: 'La Moufle',
  section: 'ps',
  nombreMots: 4,
  nombreAIllustrer: 1,
  creeLe: '2026-11-07T10:00:00Z',
};
const COPIE: CartePreparationDto = {
  ...ROULE_GALETTE,
  id: '0190f0a0-0000-7000-8000-00000000d004',
  section: 'gs',
  creeLe: '2026-11-20T10:00:00Z',
};
const LISTE = '/api/preparations?page=0&taille=100';

describe('Preparations (accueil)', () => {
  let fixture: ComponentFixture<Preparations>;
  let racine: HTMLElement;
  let serveur: HttpTestingController;
  const ouvrir = vi.fn<(declencheur?: HTMLElement) => Promise<void>>(() => Promise.resolve());

  const tour = () => new Promise((fin) => setTimeout(fin));

  async function stabiliser() {
    await tour();
    await fixture.whenStable();
    await tour();
  }

  beforeEach(async () => {
    ouvrir.mockClear();
    TestBed.configureTestingModule({
      imports: [Preparations],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideIcones(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
        { provide: NouvellePreparation, useValue: { ouvrir } },
      ],
    });
    serveur = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Preparations);
    racine = fixture.nativeElement as HTMLElement;
    await stabiliser();
  });

  afterEach(() => serveur.verify());

  const cartes = () => [...racine.querySelectorAll<HTMLAnchorElement>('a.carte__lien')];
  const texte = (element: Element | null | undefined) =>
    element?.textContent?.replace(/\s+/g, ' ').trim();
  const titres = () => cartes().map((carte) => texte(carte.querySelector('.carte__titre')));
  const boutonActions = (carte: CartePreparationDto) =>
    racine.querySelector<HTMLButtonElement>(`[data-actions="${carte.id}"]`)!;
  const lien = (carte: CartePreparationDto) =>
    racine.querySelector<HTMLAnchorElement>(`[data-lien="${carte.id}"]`)!;
  const annonce = () => texte(racine.querySelector('[aria-live="polite"]'));
  const bandeau = () => texte(racine.querySelector('app-bandeau-erreur [role="alert"]'));
  const boutonDans = (portee: ParentNode, libelle: string) =>
    [...portee.querySelectorAll<HTMLButtonElement>('button')].find(
      (bouton) => texte(bouton) === libelle,
    );
  const dialogue = () => document.querySelector<HTMLElement>('mat-dialog-container');

  async function charger(liste: CartePreparationDto[] = [ROULE_GALETTE, LOUP]) {
    serveur.expectOne(LISTE).flush({ elements: liste, total: liste.length });
    await stabiliser();
  }

  async function choisirDansLeMenu(carte: CartePreparationDto, action: string) {
    boutonActions(carte).click();
    await stabiliser();
    [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane [mat-menu-item]')]
      .find((item) => texte(item) === action)!
      .click();
    await stabiliser();
  }

  function entree(cible: HTMLElement) {
    const evenement = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(evenement, 'keyCode', { get: () => 13 });
    cible.dispatchEvent(evenement);
  }

  it('squelettes de carte pendant le chargement, puis les Cartes de Préparation, des liens', async () => {
    expect(racine.querySelector('app-squelette .squelette--carte')).not.toBeNull();

    await charger();

    expect(racine.querySelector('app-squelette')).toBeNull();
    expect(cartes().map((carte) => carte.getAttribute('href'))).toEqual([
      `/preparations/${ROULE_GALETTE.id}`,
      `/preparations/${LOUP.id}`,
    ]);
    const [premiere, seconde] = cartes();
    expect(texte(premiere.querySelector('.carte__titre'))).toBe('La Roule Galette');
    expect(texte(premiere.querySelector('app-repere-section'))).toBe('Section MS');
    expect(texte(premiere.querySelector('.carte__module'))).toBe('Module 1');
    expect(texte(premiere.querySelector('.carte__compteur'))).toBe('0 mots · 0 à illustrer');
    expect(texte(seconde.querySelector('app-repere-section'))).toBe('Section GS');
    expect(seconde.querySelector('.carte__module')).toBeNull();
    expect(racine.querySelector('app-etat-vide')).toBeNull();
  });

  it('une Préparation renommée affiche son nom ; le menu de chaque Carte est nommé, hors du lien', async () => {
    await charger([{ ...ROULE_GALETTE, nom: 'Galette des MS' }, LOUP]);

    expect(titres()).toEqual(['Galette des MS', 'Le loup qui voulait changer de couleur']);
    expect(boutonActions(ROULE_GALETTE).getAttribute('aria-label')).toBe(
      'Actions de la préparation « Galette des MS » MS',
    );
    expect(boutonActions(LOUP).getAttribute('aria-label')).toBe(
      'Actions de la préparation « Le loup qui voulait changer de couleur » GS',
    );
    expect(boutonActions(LOUP).closest('a')).toBeNull();

    boutonActions(LOUP).click();
    await stabiliser();
    expect(
      [...document.querySelectorAll('.cdk-overlay-pane [mat-menu-item]')].map((item) =>
        texte(item),
      ),
    ).toEqual(['Renommer', 'Dupliquer', 'Supprimer']);
  });

  it('sans Préparation : État vide et bouton plein « Nouvelle préparation », qui ouvre le dialogue', async () => {
    await charger([]);

    expect(texte(racine.querySelector('app-etat-vide p'))).toBe(
      "Pas encore de préparation. Choisissez un album : les mots déjà illustrés par l'équipe arrivent tout seuls.",
    );
    const bouton = racine.querySelector<HTMLButtonElement>('app-etat-vide button')!;
    expect(texte(bouton)).toBe('Nouvelle préparation');
    bouton.click();

    expect(ouvrir).toHaveBeenCalledExactlyOnceWith(bouton);
  });

  it('plus de 100 Préparations : les pages suivantes sont lues, une Carte pour chacune', async () => {
    const carte = (rang: number): CartePreparationDto => ({
      ...LOUP,
      id: `0190f0a0-0000-7000-8000-${String(rang).padStart(12, '0')}`,
    });
    const toutes = Array.from({ length: 101 }, (_, rang) => carte(rang));
    serveur.expectOne(LISTE).flush({ elements: toutes.slice(0, 100), total: 101 });
    await stabiliser();
    serveur
      .expectOne('/api/preparations?page=1&taille=100')
      .flush({ elements: toutes.slice(100), total: 101 });
    await stabiliser();

    expect(cartes()).toHaveLength(101);
  });

  it('échec du chargement : Bandeau d’erreur, « Réessayer » recharge', async () => {
    serveur.expectOne(LISTE).flush(null, { status: 500, statusText: 'Server Error' });
    await stabiliser();

    expect(bandeau()).toBe('Le service ne répond pas comme prévu. Réessayez dans un instant.');
    boutonDans(racine.querySelector('app-bandeau-erreur')!, 'Réessayer')!.click();
    serveur.expectOne(LISTE).flush({ elements: [LOUP], total: 1 });
    await stabiliser();

    expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
    expect(cartes()).toHaveLength(1);
  });

  describe('Renommer', () => {
    const saisie = () => dialogue()!.querySelector<HTMLInputElement>('input')!;

    async function saisir(valeur: string) {
      saisie().value = valeur;
      saisie().dispatchEvent(new Event('input'));
      await stabiliser();
    }

    it('menu, « Renommer », saisie, Entrée : Carte mise à jour, focus au menu, annonce', async () => {
      await charger();
      await choisirDansLeMenu(ROULE_GALETTE, 'Renommer');

      expect(texte(dialogue()!.querySelector('h2'))).toBe('Renommer la préparation');
      expect(saisie().value).toBe('La Roule Galette');
      expect(document.activeElement).toBe(saisie());
      await saisir('  Galette   des MS ');
      entree(saisie());
      await stabiliser();

      const requete = serveur.expectOne(`/api/preparations/${ROULE_GALETTE.id}/nom`);
      expect(requete.request.method).toBe('PUT');
      expect(requete.request.body).toEqual({ nom: 'Galette des MS' });
      requete.flush({ ...ROULE_GALETTE, nom: 'Galette des MS' });
      await stabiliser();

      expect(dialogue()).toBeNull();
      expect(titres()[0]).toBe('Galette des MS');
      expect(document.activeElement).toBe(boutonActions(ROULE_GALETTE));
      expect(boutonActions(ROULE_GALETTE).getAttribute('aria-label')).toBe(
        'Actions de la préparation « Galette des MS » MS',
      );
      expect(annonce()).toBe('Préparation renommée.');
    });

    it('nom effacé : nom nul envoyé, le titre de l’Album s’affiche de nouveau', async () => {
      await charger([{ ...ROULE_GALETTE, nom: 'Galette des MS' }]);
      await choisirDansLeMenu(ROULE_GALETTE, 'Renommer');

      expect(saisie().value).toBe('Galette des MS');
      await saisir('   ');
      boutonDans(dialogue()!, 'Enregistrer')!.click();
      await stabiliser();

      const requete = serveur.expectOne(`/api/preparations/${ROULE_GALETTE.id}/nom`);
      expect(requete.request.body).toEqual({ nom: null });
      requete.flush(ROULE_GALETTE);
      await stabiliser();

      expect(titres()).toEqual(['La Roule Galette']);
    });

    it('nom inchangé ou « Annuler » : aucune requête, focus au menu', async () => {
      await charger();
      await choisirDansLeMenu(ROULE_GALETTE, 'Renommer');
      entree(saisie());
      await stabiliser();
      expect(dialogue()).toBeNull();
      expect(document.activeElement).toBe(boutonActions(ROULE_GALETTE));

      await choisirDansLeMenu(LOUP, 'Renommer');
      await saisir('Loup GS');
      boutonDans(dialogue()!, 'Annuler')!.click();
      await stabiliser();

      expect(dialogue()).toBeNull();
      expect(document.activeElement).toBe(boutonActions(LOUP));
      expect(titres()).toEqual(['La Roule Galette', 'Le loup qui voulait changer de couleur']);
    });

    it('échec réseau : Bandeau « Réessayer » dans le dialogue, rien de changé ; « Réessayer » renvoie', async () => {
      await charger();
      await choisirDansLeMenu(ROULE_GALETTE, 'Renommer');
      await saisir('Galette des MS');
      entree(saisie());
      await stabiliser();
      serveur
        .expectOne(`/api/preparations/${ROULE_GALETTE.id}/nom`)
        .error(new ProgressEvent('error'), { status: 0 });
      await stabiliser();

      expect(texte(dialogue()!.querySelector('app-bandeau-erreur [role="alert"]'))).toBe(
        'Connexion au serveur impossible. Vérifiez votre réseau, puis réessayez.',
      );
      expect(saisie().value).toBe('Galette des MS');
      expect(titres()[0]).toBe('La Roule Galette');

      boutonDans(dialogue()!.querySelector('app-bandeau-erreur')!, 'Réessayer')!.click();
      await stabiliser();
      serveur
        .expectOne(`/api/preparations/${ROULE_GALETTE.id}/nom`)
        .flush({ ...ROULE_GALETTE, nom: 'Galette des MS' });
      await stabiliser();

      expect(dialogue()).toBeNull();
      expect(titres()[0]).toBe('Galette des MS');
    });

    it('refus métier : message traduit, sans « Réessayer »', async () => {
      await charger();
      await choisirDansLeMenu(ROULE_GALETTE, 'Renommer');
      await saisir('Galette des MS');
      entree(saisie());
      await stabiliser();
      serveur
        .expectOne(`/api/preparations/${ROULE_GALETTE.id}/nom`)
        .flush({ code: 'preparation.nom_trop_long' }, { status: 400, statusText: 'Bad Request' });
      await stabiliser();

      const bandeauDialogue = dialogue()!.querySelector('app-bandeau-erreur')!;
      expect(texte(bandeauDialogue.querySelector('[role="alert"]'))).toBe(
        'Le nom ne doit pas dépasser 100 caractères.',
      );
      expect(boutonDans(bandeauDialogue, 'Réessayer')).toBeUndefined();
      boutonDans(dialogue()!, 'Annuler')!.click();
      await stabiliser();
    });

    it('Préparation supprimée ailleurs (404) : dialogue fermé, Carte retirée, Bandeau sans « Réessayer »', async () => {
      await charger();
      await choisirDansLeMenu(ROULE_GALETTE, 'Renommer');
      await saisir('Galette des MS');
      entree(saisie());
      await stabiliser();
      serveur
        .expectOne(`/api/preparations/${ROULE_GALETTE.id}/nom`)
        .flush({ code: 'ressource.introuvable' }, { status: 404, statusText: 'Not Found' });
      await stabiliser();

      expect(dialogue()).toBeNull();
      expect(titres()).toEqual(['Le loup qui voulait changer de couleur']);
      expect(bandeau()).toBe("Cette préparation n'existe plus.");
      expect(boutonDans(racine.querySelector('app-bandeau-erreur')!, 'Réessayer')).toBeUndefined();
      expect(document.activeElement).toBe(lien(LOUP));
    });

    it('nom collé avec des espaces en trop : rien n’est coupé, le nom nettoyé est envoyé', async () => {
      await charger();
      await choisirDansLeMenu(ROULE_GALETTE, 'Renommer');
      const colle = `  ${'a'.repeat(50)}      ${'b'.repeat(49)}  `;
      await saisir(colle);

      expect(saisie().value).toBe(colle);
      entree(saisie());
      await stabiliser();

      const requete = serveur.expectOne(`/api/preparations/${ROULE_GALETTE.id}/nom`);
      expect(requete.request.body).toEqual({ nom: `${'a'.repeat(50)} ${'b'.repeat(49)}` });
      requete.flush({ ...ROULE_GALETTE, nom: `${'a'.repeat(50)} ${'b'.repeat(49)}` });
      await stabiliser();
    });

    it('nom nettoyé de plus de 100 caractères : message sous le champ, aucune requête', async () => {
      await charger();
      await choisirDansLeMenu(ROULE_GALETTE, 'Renommer');
      await saisir('a'.repeat(101));
      entree(saisie());
      await stabiliser();

      serveur.expectNone(`/api/preparations/${ROULE_GALETTE.id}/nom`);
      expect(texte(dialogue()!.querySelector('mat-error'))).toBe(
        'Le nom ne doit pas dépasser 100 caractères.',
      );
      await saisir('a'.repeat(100));
      expect(dialogue()!.querySelector('mat-error')).toBeNull();
      boutonDans(dialogue()!, 'Annuler')!.click();
      await stabiliser();
    });

    it('titre d’Album prérempli, comparé une fois nettoyé : aucune requête', async () => {
      const espace = { ...ROULE_GALETTE, titreAlbum: 'La  Roule Galette ' };
      await charger([espace]);
      await choisirDansLeMenu(espace, 'Renommer');
      entree(saisie());
      await stabiliser();

      serveur.expectNone(`/api/preparations/${ROULE_GALETTE.id}/nom`);
      expect(dialogue()).toBeNull();
    });

    it('pendant l’envoi, Entrée et Échap sont sans effet : une seule requête, dialogue ouvert', async () => {
      await charger();
      await choisirDansLeMenu(ROULE_GALETTE, 'Renommer');
      await saisir('Galette des MS');
      entree(saisie());
      await stabiliser();
      entree(saisie());
      const echap = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      Object.defineProperty(echap, 'keyCode', { get: () => 27 });
      dialogue()!.dispatchEvent(echap);
      await stabiliser();

      expect(dialogue()).not.toBeNull();
      serveur
        .expectOne(`/api/preparations/${ROULE_GALETTE.id}/nom`)
        .flush({ ...ROULE_GALETTE, nom: 'Galette des MS' });
      await stabiliser();
      expect(dialogue()).toBeNull();
    });
  });

  describe('Dupliquer', () => {
    const radios = () => [...dialogue()!.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    const sectionChoisie = () =>
      texte(dialogue()!.querySelector('.mat-mdc-radio-checked .gerer-preparation__section'));

    it('menu, « Dupliquer », GS, Entrée : nouvelle Carte en tête, focus sur elle, annonce', async () => {
      await charger();
      await choisirDansLeMenu(ROULE_GALETTE, 'Dupliquer');

      expect(texte(dialogue()!.querySelector('h2'))).toBe('Dupliquer la préparation');
      expect(radios()).toHaveLength(3);
      expect(sectionChoisie()).toBe('GS');
      expect(document.activeElement).toBe(radios()[2]);
      entree(radios()[2]);
      await stabiliser();

      const requete = serveur.expectOne(`/api/preparations/${ROULE_GALETTE.id}/duplication`);
      expect(requete.request.method).toBe('POST');
      expect(requete.request.body).toEqual({ section: 'gs' });
      requete.flush(COPIE, { status: 201, statusText: 'Created' });
      await stabiliser();

      expect(dialogue()).toBeNull();
      expect(cartes().map((carte) => carte.getAttribute('href'))).toEqual([
        `/preparations/${COPIE.id}`,
        `/preparations/${ROULE_GALETTE.id}`,
        `/preparations/${LOUP.id}`,
      ]);
      expect(document.activeElement).toBe(lien(COPIE));
      expect(annonce()).toBe('Préparation dupliquée pour la GS.');
    });

    it('Section suivante présélectionnée (GS reste GS) ; la même Section est permise', async () => {
      expect((['ps', 'ms', 'gs'] as const).map(sectionSuivante)).toEqual(['ms', 'gs', 'gs']);
      await charger();
      await choisirDansLeMenu(LOUP, 'Dupliquer');
      expect(sectionChoisie()).toBe('GS');

      radios()[1].click();
      await stabiliser();
      expect(sectionChoisie()).toBe('MS');
      boutonDans(dialogue()!, 'Dupliquer')!.click();
      await stabiliser();

      const requete = serveur.expectOne(`/api/preparations/${LOUP.id}/duplication`);
      expect(requete.request.body).toEqual({ section: 'ms' });
      requete.flush(
        { ...LOUP, id: COPIE.id, section: 'ms' },
        { status: 201, statusText: 'Created' },
      );
      await stabiliser();

      expect(annonce()).toBe('Préparation dupliquée pour la MS.');
    });

    it('« Annuler » : aucune requête, focus au menu', async () => {
      await charger();
      await choisirDansLeMenu(ROULE_GALETTE, 'Dupliquer');
      boutonDans(dialogue()!, 'Annuler')!.click();
      await stabiliser();

      expect(dialogue()).toBeNull();
      expect(document.activeElement).toBe(boutonActions(ROULE_GALETTE));
      expect(cartes()).toHaveLength(2);
    });

    it('échec réseau : Bandeau « Réessayer » dans le dialogue, aucune Carte ajoutée', async () => {
      await charger();
      await choisirDansLeMenu(ROULE_GALETTE, 'Dupliquer');
      boutonDans(dialogue()!, 'Dupliquer')!.click();
      await stabiliser();
      serveur
        .expectOne(`/api/preparations/${ROULE_GALETTE.id}/duplication`)
        .flush(null, { status: 503, statusText: 'Service Unavailable' });
      await stabiliser();

      const bandeauDialogue = dialogue()!.querySelector('app-bandeau-erreur')!;
      expect(boutonDans(bandeauDialogue, 'Réessayer')).toBeDefined();
      expect(cartes()).toHaveLength(2);
      boutonDans(dialogue()!, 'Annuler')!.click();
      await stabiliser();
      expect(cartes()).toHaveLength(2);
    });

    it('« Réessayer » renvoie la duplication, qui aboutit', async () => {
      await charger();
      await choisirDansLeMenu(ROULE_GALETTE, 'Dupliquer');
      boutonDans(dialogue()!, 'Dupliquer')!.click();
      await stabiliser();
      serveur
        .expectOne(`/api/preparations/${ROULE_GALETTE.id}/duplication`)
        .error(new ProgressEvent('error'), { status: 0 });
      await stabiliser();

      boutonDans(dialogue()!.querySelector('app-bandeau-erreur')!, 'Réessayer')!.click();
      await stabiliser();
      const requete = serveur.expectOne(`/api/preparations/${ROULE_GALETTE.id}/duplication`);
      expect(requete.request.body).toEqual({ section: 'gs' });
      requete.flush(COPIE, { status: 201, statusText: 'Created' });
      await stabiliser();

      expect(dialogue()).toBeNull();
      expect(cartes()).toHaveLength(3);
    });

    it('refus métier : message traduit, sans « Réessayer », aucune Carte ajoutée', async () => {
      await charger();
      await choisirDansLeMenu(ROULE_GALETTE, 'Dupliquer');
      boutonDans(dialogue()!, 'Dupliquer')!.click();
      await stabiliser();
      serveur
        .expectOne(`/api/preparations/${ROULE_GALETTE.id}/duplication`)
        .flush({ code: 'requete.invalide' }, { status: 400, statusText: 'Bad Request' });
      await stabiliser();

      const bandeauDialogue = dialogue()!.querySelector('app-bandeau-erreur')!;
      expect(texte(bandeauDialogue.querySelector('[role="alert"]'))).toBe(
        'La demande est incomplète. Vérifiez la saisie, puis réessayez.',
      );
      expect(boutonDans(bandeauDialogue, 'Réessayer')).toBeUndefined();
      expect(cartes()).toHaveLength(2);
      boutonDans(dialogue()!, 'Annuler')!.click();
      await stabiliser();
    });

    it('Préparation supprimée ailleurs (404) : dialogue fermé, Carte retirée, Bandeau sans « Réessayer »', async () => {
      await charger([ROULE_GALETTE]);
      await choisirDansLeMenu(ROULE_GALETTE, 'Dupliquer');
      boutonDans(dialogue()!, 'Dupliquer')!.click();
      await stabiliser();
      serveur
        .expectOne(`/api/preparations/${ROULE_GALETTE.id}/duplication`)
        .flush({ code: 'ressource.introuvable' }, { status: 404, statusText: 'Not Found' });
      await stabiliser();

      expect(dialogue()).toBeNull();
      expect(racine.querySelector('app-etat-vide')).not.toBeNull();
      expect(bandeau()).toBe("Cette préparation n'existe plus.");
      expect(texte(document.activeElement)).toBe('Nouvelle préparation');
    });

    it('pendant l’envoi, Entrée et Échap sont sans effet : une seule requête', async () => {
      await charger();
      await choisirDansLeMenu(ROULE_GALETTE, 'Dupliquer');
      entree(radios()[2]);
      await stabiliser();
      entree(radios()[2]);
      const echap = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      Object.defineProperty(echap, 'keyCode', { get: () => 27 });
      dialogue()!.dispatchEvent(echap);
      await stabiliser();

      expect(dialogue()).not.toBeNull();
      serveur
        .expectOne(`/api/preparations/${ROULE_GALETTE.id}/duplication`)
        .flush(COPIE, { status: 201, statusText: 'Created' });
      await stabiliser();
      expect(cartes()).toHaveLength(3);
    });
  });

  describe('Supprimer', () => {
    async function confirmer(libelle: 'Supprimer' | 'Annuler') {
      boutonDans(dialogue()!, libelle)!.click();
      await stabiliser();
    }

    it('menu, « Supprimer », confirmation : Carte retirée, focus à la suivante, annonce', async () => {
      await charger([ROULE_GALETTE, LOUP, MOUFLE]);
      await choisirDansLeMenu(LOUP, 'Supprimer');

      expect(texte(dialogue()!.querySelector('h2'))).toBe(
        'Supprimer la préparation « Le loup qui voulait changer de couleur » ?',
      );
      expect(texte(dialogue()!.querySelector('p'))).toBe(
        'Ses mots quittent la préparation ; les images restent dans la banque.',
      );
      expect([...dialogue()!.querySelectorAll('button')].map((bouton) => texte(bouton))).toEqual([
        'Annuler',
        'Supprimer',
      ]);
      await confirmer('Supprimer');

      const requete = serveur.expectOne(`/api/preparations/${LOUP.id}`);
      expect(requete.request.method).toBe('DELETE');
      requete.flush('', { status: 204, statusText: 'No Content' });
      await stabiliser();

      expect(titres()).toEqual(['La Roule Galette', 'La Moufle']);
      expect(document.activeElement).toBe(lien(MOUFLE));
      expect(annonce()).toBe('Préparation supprimée.');
      expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
    });

    it('dernière Carte de la liste supprimée : focus à la précédente', async () => {
      await charger([ROULE_GALETTE, LOUP]);
      await choisirDansLeMenu(LOUP, 'Supprimer');
      await confirmer('Supprimer');
      serveur
        .expectOne(`/api/preparations/${LOUP.id}`)
        .flush('', { status: 204, statusText: 'No Content' });
      await stabiliser();

      expect(document.activeElement).toBe(lien(ROULE_GALETTE));
    });

    it('« Annuler » dans la confirmation : aucune requête, focus au menu', async () => {
      await charger();
      await choisirDansLeMenu(ROULE_GALETTE, 'Supprimer');
      await confirmer('Annuler');

      serveur.expectNone(`/api/preparations/${ROULE_GALETTE.id}`);
      expect(cartes()).toHaveLength(2);
      expect(document.activeElement).toBe(boutonActions(ROULE_GALETTE));
    });

    it('une seule Préparation supprimée : État vide, focus à « Nouvelle préparation »', async () => {
      await charger([ROULE_GALETTE]);
      await choisirDansLeMenu(ROULE_GALETTE, 'Supprimer');
      await confirmer('Supprimer');
      serveur
        .expectOne(`/api/preparations/${ROULE_GALETTE.id}`)
        .flush('', { status: 204, statusText: 'No Content' });
      await stabiliser();

      expect(racine.querySelector('app-etat-vide')).not.toBeNull();
      expect(texte(document.activeElement)).toBe('Nouvelle préparation');
      expect(annonce()).toBe('Préparation supprimée.');
    });

    it('échec réseau : Bandeau « Réessayer », rien de changé ; « Réessayer » supprime', async () => {
      await charger();
      await choisirDansLeMenu(ROULE_GALETTE, 'Supprimer');
      await confirmer('Supprimer');
      serveur
        .expectOne(`/api/preparations/${ROULE_GALETTE.id}`)
        .error(new ProgressEvent('error'), { status: 0 });
      await stabiliser();

      expect(bandeau()).toBe(
        'Connexion au serveur impossible. Vérifiez votre réseau, puis réessayez.',
      );
      expect(cartes()).toHaveLength(2);
      expect(document.activeElement).toBe(boutonActions(ROULE_GALETTE));

      boutonDans(racine.querySelector('app-bandeau-erreur')!, 'Réessayer')!.click();
      await stabiliser();
      serveur
        .expectOne(`/api/preparations/${ROULE_GALETTE.id}`)
        .flush('', { status: 204, statusText: 'No Content' });
      await stabiliser();

      expect(titres()).toEqual(['Le loup qui voulait changer de couleur']);
      expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
    });

    it('refus métier : message traduit, sans « Réessayer »', async () => {
      await charger();
      await choisirDansLeMenu(ROULE_GALETTE, 'Supprimer');
      await confirmer('Supprimer');
      serveur
        .expectOne(`/api/preparations/${ROULE_GALETTE.id}`)
        .flush(JSON.stringify({ code: 'acces.refuse' }), {
          status: 403,
          statusText: 'Forbidden',
        });
      await stabiliser();

      expect(bandeau()).toBe("Cette action est réservée à l'administrateur.");
      expect(boutonDans(racine.querySelector('app-bandeau-erreur')!, 'Réessayer')).toBeUndefined();
      expect(cartes()).toHaveLength(2);
    });

    it('déjà supprimée (404) : traité comme un succès, Carte retirée, focus, annonce', async () => {
      await charger();
      await choisirDansLeMenu(ROULE_GALETTE, 'Supprimer');
      await confirmer('Supprimer');
      serveur
        .expectOne(`/api/preparations/${ROULE_GALETTE.id}`)
        .flush(JSON.stringify({ code: 'ressource.introuvable' }), {
          status: 404,
          statusText: 'Not Found',
        });
      await stabiliser();

      expect(titres()).toEqual(['Le loup qui voulait changer de couleur']);
      expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
      expect(document.activeElement).toBe(lien(LOUP));
      expect(annonce()).toBe('Préparation supprimée.');
    });

    it('le Bandeau d’un échec disparaît dès qu’une autre action de Carte commence', async () => {
      await charger();
      await choisirDansLeMenu(ROULE_GALETTE, 'Supprimer');
      await confirmer('Supprimer');
      serveur
        .expectOne(`/api/preparations/${ROULE_GALETTE.id}`)
        .error(new ProgressEvent('error'), { status: 0 });
      await stabiliser();
      expect(racine.querySelector('app-bandeau-erreur')).not.toBeNull();

      await choisirDansLeMenu(LOUP, 'Renommer');

      expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
      boutonDans(dialogue()!, 'Annuler')!.click();
      await stabiliser();
    });

    it('Carte déjà absente de la liste au « Réessayer » : focus à la première Carte', async () => {
      await charger([ROULE_GALETTE, LOUP, MOUFLE]);
      await choisirDansLeMenu(LOUP, 'Supprimer');
      await confirmer('Supprimer');
      serveur
        .expectOne(`/api/preparations/${LOUP.id}`)
        .error(new ProgressEvent('error'), { status: 0 });
      await stabiliser();
      // La liste a changé entre-temps (par exemple relue) : la Carte n'y est plus.
      (
        fixture.componentInstance as unknown as {
          preparations: { set(cartes: CartePreparationDto[]): void };
        }
      ).preparations.set([ROULE_GALETTE, MOUFLE]);
      await stabiliser();

      boutonDans(racine.querySelector('app-bandeau-erreur')!, 'Réessayer')!.click();
      await stabiliser();
      serveur
        .expectOne(`/api/preparations/${LOUP.id}`)
        .flush('', { status: 204, statusText: 'No Content' });
      await stabiliser();

      expect(titres()).toEqual(['La Roule Galette', 'La Moufle']);
      expect(document.activeElement).toBe(lien(ROULE_GALETTE));
    });
  });
});

describe('Libellés', () => {
  it('libellé du nombre de Mots', () => {
    expect([0, 1, 14].map(libelleMots)).toEqual(['0 mots', '1 mot', '14 mots']);
  });

  it('nom accessible du menu d’une Carte', () => {
    expect(libelleActionsPreparation(ROULE_GALETTE)).toBe(
      'Actions de la préparation « La Roule Galette » MS',
    );
  });
});
