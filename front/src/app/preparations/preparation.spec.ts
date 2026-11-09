import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { Title } from '@angular/platform-browser';
import { PreparationDto } from '../api/models/preparation-dto';
import { provideIcones } from '../commun/icones';
import { libelleIllustres, Preparation } from './preparation';

const ID = '0190f0a0-0000-7000-8000-00000000d001';
const PREPARATION: PreparationDto = {
  id: ID,
  albumId: '0190f0a0-0000-7000-8000-00000000a001',
  titreAlbum: 'La Roule Galette',
  section: 'ms',
  moduleId: '0190f0a0-0000-7000-8000-00000000b001',
  nomModule: 'Module 1',
  themeDefautId: '0190f0a0-0000-7000-8000-00000000c001',
  nomThemeDefaut: 'cuisine',
  nombreMots: 0,
  nombreIllustres: 0,
  creeLe: '2026-11-09T10:00:00Z',
};

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

  it('En-tête : titre de l’Album, Repère de Section, Module, Thème par défaut, « 0 mots, 0 déjà illustrés »', async () => {
    expect(racine.querySelector('app-squelette')).not.toBeNull();

    serveur.expectOne(`/api/preparations/${ID}`).flush(PREPARATION);
    await stabiliser();

    expect(texte('h1')).toBe('La Roule Galette');
    expect(texte('app-repere-section')).toBe('Section MS');
    expect(texte('.entete__module')).toBe('Module 1');
    expect(texte('.entete__theme')).toBe('Thème par défaut : cuisine');
    expect(texte('.entete__compteur')).toBe('0 mots, 0 déjà illustrés');
    expect(TestBed.inject(Title).getTitle()).toBe('La Roule Galette · corpus-mots');
    expect(racine.querySelector('app-squelette')).toBeNull();
  });

  it('autre identifiant après un premier chargement : la nouvelle Préparation est lue', async () => {
    serveur.expectOne(`/api/preparations/${ID}`).flush(PREPARATION);
    await stabiliser();

    fixture.componentRef.setInput('id', AUTRE_ID);
    await stabiliser();
    serveur.expectOne(`/api/preparations/${AUTRE_ID}`).flush(LOUP);
    await stabiliser();

    expect(texte('h1')).toBe(LOUP.titreAlbum);
    expect(TestBed.inject(Title).getTitle()).toBe(`${LOUP.titreAlbum} · corpus-mots`);
  });

  it('la réponse d’une Préparation quittée, arrivée après la nouvelle, n’écrit rien', async () => {
    const ancienne = serveur.expectOne(`/api/preparations/${ID}`);
    fixture.componentRef.setInput('id', AUTRE_ID);
    await stabiliser();
    serveur.expectOne(`/api/preparations/${AUTRE_ID}`).flush(LOUP);
    await stabiliser();
    ancienne.flush(PREPARATION);
    await stabiliser();

    expect(texte('h1')).toBe(LOUP.titreAlbum);
    expect(TestBed.inject(Title).getTitle()).toBe(`${LOUP.titreAlbum} · corpus-mots`);
  });

  it('sans Module ni Thème par défaut : ni l’un ni l’autre', async () => {
    serveur.expectOne(`/api/preparations/${ID}`).flush({
      ...PREPARATION,
      section: 'ps',
      moduleId: undefined,
      nomModule: undefined,
      themeDefautId: undefined,
      nomThemeDefaut: undefined,
    });
    await stabiliser();

    expect(texte('app-repere-section')).toBe('Section PS');
    expect(racine.querySelector('.entete__module')).toBeNull();
    expect(racine.querySelector('.entete__theme')).toBeNull();
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
    serveur.expectOne(`/api/preparations/${ID}`).flush(PREPARATION);
    await stabiliser();

    expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
    expect(texte('h1')).toBe('La Roule Galette');
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
