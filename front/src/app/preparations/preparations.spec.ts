import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter } from '@angular/router';
import { CartePreparationDto } from '../api/models/carte-preparation-dto';
import { provideIcones } from '../commun/icones';
import { NouvellePreparation } from './nouvelle-preparation';
import { libelleMots, Preparations } from './preparations';

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

  const cartes = () => [...racine.querySelectorAll<HTMLAnchorElement>('a.carte')];
  const texte = (element: Element | null | undefined) =>
    element?.textContent?.replace(/\s+/g, ' ').trim();

  it('squelettes de carte pendant le chargement, puis les Cartes de Préparation, des liens', async () => {
    expect(racine.querySelector('app-squelette .squelette--carte')).not.toBeNull();

    serveur.expectOne(LISTE).flush({ elements: [ROULE_GALETTE, LOUP], total: 2 });
    await stabiliser();

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

  it('sans Préparation : État vide et bouton plein « Nouvelle préparation », qui ouvre le dialogue', async () => {
    serveur.expectOne(LISTE).flush({ elements: [], total: 0 });
    await stabiliser();

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

    expect(texte(racine.querySelector('app-bandeau-erreur [role="alert"]'))).toBe(
      'Le service ne répond pas comme prévu. Réessayez dans un instant.',
    );
    [...racine.querySelectorAll<HTMLButtonElement>('app-bandeau-erreur button')]
      .find((element) => texte(element) === 'Réessayer')!
      .click();
    serveur.expectOne(LISTE).flush({ elements: [LOUP], total: 1 });
    await stabiliser();

    expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
    expect(cartes()).toHaveLength(1);
  });
});

describe('Libellés', () => {
  it('libellé du nombre de Mots', () => {
    expect([0, 1, 14].map(libelleMots)).toEqual(['0 mots', '1 mot', '14 mots']);
  });
});
