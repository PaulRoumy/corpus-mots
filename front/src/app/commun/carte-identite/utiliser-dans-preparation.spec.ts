import { LiveAnnouncer } from '@angular/cdk/a11y';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter } from '@angular/router';
import { CartePreparationDto } from '../../api/models/carte-preparation-dto';
import { DialogueConfirmation } from '../dialogue-confirmation/dialogue-confirmation';
import { MESSAGES_PAR_CODE } from '../erreurs/message-erreur';
import { DialogueChoixPreparation } from './dialogue-choix-preparation';
import {
  confirmationRemplacement,
  LIBELLE_UTILISER,
  MESSAGE_IMAGE_INDISPONIBLE,
  UtiliserDansPreparation,
} from './utiliser-dans-preparation';

const IMAGE = '0190f0a0-0000-7000-8000-0000000c0001';
const AUTRE = '0190f0a0-0000-7000-8000-0000000c0002';
const URL_UTILISATION = '/api/preparations/p1/utilisations';

const ROULE_GALETTE: CartePreparationDto = {
  id: 'p1',
  albumId: 'a1',
  titreAlbum: 'Roule galette',
  section: 'ms',
  nombreMots: 3,
  nombreAIllustrer: 1,
  creeLe: '2026-11-20T10:00:00Z',
};

const MOT = {
  id: 'mp1',
  motId: 'm1',
  forme: 'renard',
  ordre: 1,
  sens: { id: 's1', libelle: 'animal', categorie: 'nom' },
  illustre: true,
};

describe('UtiliserDansPreparation', () => {
  let fixture: ComponentFixture<UtiliserDansPreparation>;
  let racine: HTMLElement;
  let serveur: HttpTestingController;
  let choisir: ReturnType<typeof vi.fn<() => Promise<CartePreparationDto | undefined>>>;
  let confirmer: ReturnType<typeof vi.fn>;
  let annoncer: ReturnType<typeof vi.spyOn>;

  async function stabiliser() {
    await new Promise((fin) => setTimeout(fin));
    await fixture.whenStable();
    await new Promise((fin) => setTimeout(fin));
  }

  beforeEach(async () => {
    choisir = vi.fn<() => Promise<CartePreparationDto | undefined>>();
    confirmer = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
        { provide: DialogueChoixPreparation, useValue: { choisir } },
        { provide: DialogueConfirmation, useValue: { confirmer } },
      ],
    });
    serveur = TestBed.inject(HttpTestingController);
    annoncer = vi.spyOn(TestBed.inject(LiveAnnouncer), 'announce').mockResolvedValue();
    fixture = TestBed.createComponent(UtiliserDansPreparation);
    fixture.componentRef.setInput('imageId', IMAGE);
    fixture.componentRef.setInput('forme', 'renard');
    racine = fixture.nativeElement as HTMLElement;
    document.body.appendChild(racine);
    await fixture.whenStable();
  });

  afterEach(() => {
    serveur.verify();
    racine.remove();
  });

  const bouton = () => racine.querySelector<HTMLButtonElement>('.utiliser__bouton')!;
  const message = () =>
    racine.querySelector('.utiliser__message')?.textContent?.replace(/\s+/g, ' ').trim();
  const lien = () => racine.querySelector<HTMLAnchorElement>('.utiliser__lien');

  it('succès : l’Image est envoyée, message et lien « Ouvrir la préparation », annonce polie', async () => {
    choisir.mockResolvedValue(ROULE_GALETTE);
    expect(bouton().textContent?.trim()).toBe(LIBELLE_UTILISER);

    bouton().click();
    await stabiliser();
    const requete = serveur.expectOne(URL_UTILISATION);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({ imageId: IMAGE });
    requete.flush(MOT, { status: 201, statusText: 'Created' });
    await stabiliser();

    expect(message()).toBe('Image ajoutée à « Roule galette ». Ouvrir la préparation');
    expect(lien()?.textContent?.trim()).toBe('Ouvrir la préparation');
    expect(lien()?.getAttribute('href')).toBe('/preparations/p1');
    expect(annoncer).toHaveBeenCalledWith('Image ajoutée à « Roule galette ».', 'polite');
    expect(confirmer).not.toHaveBeenCalled();
  });

  it('le nom propre de la Préparation l’emporte sur le titre de l’Album', async () => {
    choisir.mockResolvedValue({ ...ROULE_GALETTE, nom: 'Galette MS' });

    bouton().click();
    await stabiliser();
    serveur.expectOne(URL_UTILISATION).flush(MOT);
    await stabiliser();

    expect(message()).toContain('Image ajoutée à « Galette MS ».');
  });

  it('Dialogue fermé sans choix : rien n’est envoyé', async () => {
    choisir.mockResolvedValue(undefined);

    bouton().click();
    await stabiliser();

    serveur.expectNone(URL_UTILISATION);
    expect(message()).toBeUndefined();
  });

  it('409 : Dialogue de remplacement ; « Remplacer » renvoie avec `remplacer: true`', async () => {
    choisir.mockResolvedValue(ROULE_GALETTE);
    confirmer.mockResolvedValue(true);

    bouton().click();
    await stabiliser();
    serveur
      .expectOne(URL_UTILISATION)
      .flush(
        { status: 409, code: 'preparation.mot_deja_illustre' },
        { status: 409, statusText: 'Conflict' },
      );
    await stabiliser();

    expect(confirmer).toHaveBeenCalledWith(confirmationRemplacement('renard', 'Roule galette'));
    expect(confirmationRemplacement('renard', 'Roule galette').titre).toBe(
      "Remplacer l'image de « renard » dans « Roule galette » ?",
    );
    const remplacement = serveur.expectOne(URL_UTILISATION);
    expect(remplacement.request.body).toEqual({ imageId: IMAGE, remplacer: true });
    remplacement.flush(MOT);
    await stabiliser();

    expect(message()).toContain('Image ajoutée à « Roule galette ».');
  });

  it('409 puis « Annuler » : rien n’est renvoyé, aucun message', async () => {
    choisir.mockResolvedValue(ROULE_GALETTE);
    confirmer.mockResolvedValue(false);

    bouton().click();
    await stabiliser();
    serveur
      .expectOne(URL_UTILISATION)
      .flush(
        { status: 409, code: 'preparation.mot_deja_illustre' },
        { status: 409, statusText: 'Conflict' },
      );
    await stabiliser();

    serveur.expectNone(URL_UTILISATION);
    expect(message()).toBeUndefined();
    expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
    expect(annoncer).not.toHaveBeenCalled();
  });

  it('Image devenue indisponible : message propre à la Banque dans un Bandeau d’erreur', async () => {
    choisir.mockResolvedValue(ROULE_GALETTE);

    bouton().click();
    await stabiliser();
    serveur
      .expectOne(URL_UTILISATION)
      .flush({ status: 404, code: 'image.indisponible' }, { status: 404, statusText: 'Not Found' });
    await stabiliser();

    expect(racine.querySelector('app-bandeau-erreur')?.textContent).toContain(
      MESSAGE_IMAGE_INDISPONIBLE,
    );
    expect(message()).toBeUndefined();
  });

  it('Préparation disparue : message traduit du code', async () => {
    choisir.mockResolvedValue(ROULE_GALETTE);

    bouton().click();
    await stabiliser();
    serveur
      .expectOne(URL_UTILISATION)
      .flush(
        { status: 404, code: 'ressource.introuvable' },
        { status: 404, statusText: 'Not Found' },
      );
    await stabiliser();

    expect(racine.querySelector('app-bandeau-erreur')?.textContent).toContain(
      MESSAGES_PAR_CODE['ressource.introuvable'],
    );
  });

  it('changer d’Image efface le message ; la réponse d’une Image quittée n’affiche rien', async () => {
    choisir.mockResolvedValue(ROULE_GALETTE);
    bouton().click();
    await stabiliser();
    serveur.expectOne(URL_UTILISATION).flush(MOT);
    await stabiliser();
    expect(message()).toBeDefined();

    fixture.componentRef.setInput('imageId', AUTRE);
    await stabiliser();
    expect(message()).toBeUndefined();

    bouton().click();
    await stabiliser();
    const requete = serveur.expectOne(URL_UTILISATION);
    fixture.componentRef.setInput('imageId', IMAGE);
    await stabiliser();
    requete.flush(MOT);
    await stabiliser();
    expect(message()).toBeUndefined();
  });
});
