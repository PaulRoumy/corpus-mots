import { ApplicationRef } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { CartePreparationDto } from '../../api/models/carte-preparation-dto';
import { MESSAGE_RESEAU } from '../erreurs/message-erreur';
import { provideIcones } from '../icones';
import {
  DialogueChoixPreparation,
  MESSAGE_AUCUNE_PREPARATION,
  TAILLE_LISTE_PREPARATIONS,
} from './dialogue-choix-preparation';

function carte(id: string, titreAlbum: string, nom?: string): CartePreparationDto {
  return {
    id,
    nom,
    albumId: `a-${id}`,
    titreAlbum,
    section: 'ms',
    nombreMots: 0,
    nombreAIllustrer: 0,
    creeLe: '2026-11-20T10:00:00Z',
  };
}

const RECENTE = carte('p2', 'Roule galette');
const ANCIENNE = carte('p1', 'La petite poule rousse', 'Poule GS');

describe('DialogueChoixPreparation', () => {
  let serveur: HttpTestingController;
  let resultat: Promise<CartePreparationDto | undefined>;

  const tour = () => new Promise((fin) => setTimeout(fin));
  const surcouche = () => document.querySelector<HTMLElement>('.cdk-overlay-container')!;
  const texte = (selecteur: string) =>
    surcouche().querySelector(selecteur)?.textContent?.replace(/\s+/g, ' ').trim();
  const boutons = () => [
    ...surcouche().querySelectorAll<HTMLButtonElement>('.choix-preparation__bouton'),
  ];

  async function ouvrir() {
    resultat = TestBed.inject(DialogueChoixPreparation).choisir();
    await tour();
    await TestBed.inject(ApplicationRef).whenStable();
    await tour();
  }

  async function servir(preparations: CartePreparationDto[]) {
    const requete = serveur.expectOne((r) => r.url === '/api/preparations');
    expect(requete.request.params.get('taille')).toBe(String(TAILLE_LISTE_PREPARATIONS));
    requete.flush({ elements: preparations, total: preparations.length });
    await tour();
    await TestBed.inject(ApplicationRef).whenStable();
    await tour();
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
  });

  afterEach(() => {
    serveur.verify();
    document.querySelectorAll('.cdk-overlay-container').forEach((element) => element.remove());
  });

  it('liste mes Préparations dans l’ordre du back (la plus récente d’abord), nom et Album', async () => {
    await ouvrir();
    expect(surcouche().querySelector('app-squelette')).not.toBeNull();
    await servir([RECENTE, ANCIENNE]);

    expect(texte('h2')).toBe('Utiliser dans une préparation');
    expect(boutons().map((bouton) => bouton.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Roule galette, Roule galette · MS',
      'Poule GS, La petite poule rousse · MS',
    ]);
  });

  it('choisir une Préparation ferme le dialogue avec sa Carte', async () => {
    await ouvrir();
    await servir([RECENTE, ANCIENNE]);

    boutons()[1].click();
    expect(await resultat).toEqual(ANCIENNE);
  });

  it('« Annuler » ferme sans choix', async () => {
    await ouvrir();
    await servir([RECENTE]);

    surcouche().querySelector<HTMLButtonElement>('.choix-preparation__annuler')!.click();
    expect(await resultat).toBeUndefined();
  });

  it('aucune Préparation : « Vous n’avez encore aucune préparation. »', async () => {
    await ouvrir();
    await servir([]);

    expect(texte('.choix-preparation__vide')).toBe(MESSAGE_AUCUNE_PREPARATION);
    expect(boutons()).toHaveLength(0);
  });

  it('échec réseau : Bandeau d’erreur, « Réessayer » relit la liste', async () => {
    await ouvrir();
    serveur
      .expectOne((r) => r.url === '/api/preparations')
      .error(new ProgressEvent('error'), { status: 0 });
    await tour();
    await TestBed.inject(ApplicationRef).whenStable();
    await tour();

    expect(texte('app-bandeau-erreur')).toContain(MESSAGE_RESEAU);
    const reessayer = [
      ...surcouche().querySelectorAll<HTMLButtonElement>('app-bandeau-erreur button'),
    ].find((bouton) => bouton.textContent?.trim() === 'Réessayer')!;
    reessayer.click();
    await tour();
    await servir([RECENTE]);

    expect(boutons()).toHaveLength(1);
  });
});
