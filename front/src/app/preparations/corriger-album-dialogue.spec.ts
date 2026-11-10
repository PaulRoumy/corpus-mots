import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { AlbumDto } from '../api/models/album-dto';
import { MESSAGE_RESEAU } from '../commun/erreurs/message-erreur';
import { provideIcones } from '../commun/icones';
import { ouvrirDialogueCorrigerAlbum } from './corriger-album-dialogue';

const MOUFLE: AlbumDto = {
  id: '0190f0a0-0000-7000-8000-00000000a001',
  titre: 'La Mouffle',
  auteur: 'Jan Bret',
  editeur: 'Milan',
  createurId: '0190f0a0-0000-7000-8000-00000000e001',
  nombreModules: 2,
};
const URL_ALBUM = `/api/albums/${MOUFLE.id}`;

describe('Dialogue « Corriger l’album »', () => {
  let serveur: HttpTestingController;
  let declencheur: HTMLButtonElement;
  let resultat: Promise<AlbumDto | undefined>;

  const tour = () => new Promise((fin) => setTimeout(fin));

  async function stabiliser() {
    await tour();
    await TestBed.inject(ApplicationRef).whenStable();
    await tour();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideIcones(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
    serveur = TestBed.inject(HttpTestingController);
    declencheur = document.createElement('button');
    declencheur.textContent = 'Actions';
    document.body.appendChild(declencheur);
    declencheur.focus();
    resultat = ouvrirDialogueCorrigerAlbum(TestBed.inject(Injector), MOUFLE, declencheur);
    await stabiliser();
  });

  afterEach(() => {
    serveur.verify();
    declencheur.remove();
    document.querySelectorAll('.cdk-overlay-container').forEach((surcouche) => surcouche.remove());
  });

  const dialogue = () => document.querySelector<HTMLElement>('mat-dialog-container');
  const champ = (etiquette: string) =>
    [...document.querySelectorAll<HTMLElement>('app-corriger-album mat-form-field')].find(
      (element) => element.querySelector('mat-label')?.textContent?.trim() === etiquette,
    )!;
  const saisie = (etiquette: string) => champ(etiquette).querySelector<HTMLInputElement>('input')!;
  const erreurDuChamp = (etiquette: string) =>
    champ(etiquette).querySelector('mat-error')?.textContent?.trim();
  const bouton = (libelle: string) =>
    [...document.querySelectorAll<HTMLButtonElement>('app-corriger-album button')].find(
      (element) => element.textContent?.trim() === libelle,
    )!;
  const bandeau = () =>
    document
      .querySelector('app-corriger-album app-bandeau-erreur [role="alert"]')
      ?.textContent?.trim();

  async function saisir(etiquette: string, valeur: string) {
    saisie(etiquette).value = valeur;
    saisie(etiquette).dispatchEvent(new Event('input'));
    await stabiliser();
  }

  async function enregistrer() {
    bouton('Enregistrer').click();
    await stabiliser();
    const requete = serveur.expectOne(URL_ALBUM);
    expect(requete.request.method).toBe('PUT');
    return requete;
  }

  function refus(status: number, code: string) {
    return [
      { status, code },
      { status, statusText: 'Erreur' },
    ] as const;
  }

  it('Titre, Auteur et Éditeur préremplis, étiquetés ; le focus est sur le Titre', () => {
    expect(document.querySelector('app-corriger-album h2')?.textContent?.trim()).toBe(
      "Corriger l'album",
    );
    expect(saisie('Titre').value).toBe('La Mouffle');
    expect(saisie('Auteur').value).toBe('Jan Bret');
    expect(saisie('Éditeur (facultatif)').value).toBe('Milan');
    expect(saisie('Titre').maxLength).toBe(200);
    expect(document.activeElement).toBe(saisie('Titre'));
  });

  it('« Enregistrer » envoie la saisie rognée et ferme avec l’Album renvoyé ; le focus revient au déclencheur', async () => {
    await saisir('Titre', ' La Moufle ');
    await saisir('Auteur', 'Jan Brett');
    await saisir('Éditeur (facultatif)', '  ');

    const requete = await enregistrer();
    expect(requete.request.body).toEqual({ titre: 'La Moufle', auteur: 'Jan Brett' });
    const corrige = { ...MOUFLE, titre: 'La Moufle', auteur: 'Jan Brett', editeur: undefined };
    requete.flush(corrige);
    await stabiliser();

    expect(await resultat).toEqual(corrige);
    expect(dialogue()).toBeNull();
    expect(document.activeElement).toBe(declencheur);
  });

  it('pendant l’envoi, ni « Annuler » ni Échap ne ferment le dialogue', async () => {
    const requete = await enregistrer();

    expect(bouton('Annuler').disabled).toBe(true);
    expect(bouton('Enregistrer').disabled).toBe(true);
    const echap = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    Object.defineProperty(echap, 'keyCode', { get: () => 27 });
    dialogue()!.dispatchEvent(echap);
    await stabiliser();
    expect(dialogue()).not.toBeNull();

    requete.flush(MOUFLE);
    await stabiliser();
    expect(dialogue()).toBeNull();
  });

  it('« Annuler » ferme sans rien envoyer', async () => {
    await saisir('Titre', 'Autre titre');
    bouton('Annuler').click();
    await stabiliser();

    expect(await resultat).toBeUndefined();
    serveur.expectNone(URL_ALBUM);
    expect(document.activeElement).toBe(declencheur);
  });

  it('titre ou auteur vide : « Enregistrer » est désactivé', async () => {
    await saisir('Titre', '   ');
    expect(bouton('Enregistrer').disabled).toBe(true);

    await saisir('Titre', 'La Moufle');
    await saisir('Auteur', '');
    expect(bouton('Enregistrer').disabled).toBe(true);

    await saisir('Auteur', 'Jan Brett');
    expect(bouton('Enregistrer').disabled).toBe(false);
  });

  it('champ refusé par le back : message sous ce champ, le dialogue reste ouvert, modifier le champ l’efface', async () => {
    (await enregistrer()).flush(...refus(400, 'album.editeur_invalide'));
    await stabiliser();

    expect(dialogue()).not.toBeNull();
    expect(erreurDuChamp('Éditeur (facultatif)')).toBe(
      'Saisissez un éditeur de 200 caractères au plus.',
    );
    expect(erreurDuChamp('Titre')).toBeUndefined();
    expect(bandeau()).toBeUndefined();

    await saisir('Éditeur (facultatif)', 'Milan jeunesse');
    expect(erreurDuChamp('Éditeur (facultatif)')).toBeUndefined();

    (await enregistrer()).flush(...refus(400, 'album.titre_invalide'));
    await stabiliser();
    expect(erreurDuChamp('Titre')).toBe('Saisissez un titre de 1 à 200 caractères.');

    (await enregistrer()).flush(...refus(400, 'album.auteur_invalide'));
    await stabiliser();
    expect(erreurDuChamp('Auteur')).toBe('Saisissez un auteur de 1 à 200 caractères.');
  });

  it('doublon : Bandeau d’erreur, la saisie reste, « Réessayer » efface seulement le message', async () => {
    await saisir('Titre', 'La Moufle');
    (await enregistrer()).flush(...refus(409, 'album.deja_existant'));
    await stabiliser();

    expect(bandeau()).toBe('Un autre album porte déjà ce titre et cet auteur.');
    expect(saisie('Titre').value).toBe('La Moufle');
    bouton('Réessayer').click();
    await stabiliser();
    serveur.expectNone(URL_ALBUM);
    expect(bandeau()).toBeUndefined();
  });

  it('refus 403 : Bandeau d’erreur traduit', async () => {
    (await enregistrer()).flush(...refus(403, 'album.reserve_au_createur'));
    await stabiliser();

    expect(bandeau()).toBe("Seuls le créateur de l'album et l'administrateur peuvent le corriger.");
    expect(dialogue()).not.toBeNull();
  });

  it('échec réseau : Bandeau d’erreur, « Réessayer » renvoie la correction', async () => {
    (await enregistrer()).error(new ProgressEvent('error'));
    await stabiliser();
    expect(bandeau()).toBe(MESSAGE_RESEAU);

    bouton('Réessayer').click();
    await stabiliser();
    serveur.expectOne(URL_ALBUM).flush(MOUFLE);
    await stabiliser();
    expect(await resultat).toEqual(MOUFLE);
  });
});
