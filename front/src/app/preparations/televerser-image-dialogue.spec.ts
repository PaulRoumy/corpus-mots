import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MotPreparationDto } from '../api/models/mot-preparation-dto';
import { provideIcones } from '../commun/icones';
import {
  MESSAGE_FICHIER_NON_IMAGE,
  MESSAGE_FICHIER_TROP_LOURD,
  ouvrirDialogueTeleverserImage,
  TAILLE_MAX_FICHIER,
} from './televerser-image-dialogue';

const PREPARATION = '0190f0a0-0000-7000-8000-00000000d001';
const CITROUILLE: MotPreparationDto = {
  id: '0190f0a0-0000-7000-8000-0000000f0001',
  motId: '0190f0a0-0000-7000-8000-0000000e0001',
  forme: 'citrouille',
  ordre: 1,
  sens: { id: '0190f0a0-0000-7000-8000-0000000d0001', libelle: 'à compléter' },
  illustre: false,
};
const ILLUSTREE: MotPreparationDto = {
  ...CITROUILLE,
  illustre: true,
  image: {
    id: '0190f0a0-0000-7000-8000-0000000c0001',
    proprietaireId: '0190f0a0-0000-7000-8000-00000000e001',
    etat: 'privee',
    aRemplacer: null,
    reutilisable: true,
    typeImage: 'image_libre',
    aCompleter: false,
  },
};
const URL_TELEVERSEMENT = `/api/preparations/${PREPARATION}/mots/${CITROUILLE.id}/image`;

describe('Dialogue « Téléverser une image »', () => {
  let serveur: HttpTestingController;
  let declencheur: HTMLButtonElement;
  let resultat: Promise<MotPreparationDto | undefined>;
  const original = { creer: URL.createObjectURL, revoquer: URL.revokeObjectURL };

  const tour = () => new Promise((fin) => setTimeout(fin));

  async function stabiliser() {
    await tour();
    await TestBed.inject(ApplicationRef).whenStable();
    await tour();
  }

  async function ouvrir() {
    resultat = ouvrirDialogueTeleverserImage(
      TestBed.inject(Injector),
      { preparationId: PREPARATION, mot: CITROUILLE, titreAlbum: 'La Roule Galette' },
      declencheur,
    );
    await stabiliser();
  }

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:http://localhost/apercu');
    URL.revokeObjectURL = vi.fn();
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
    declencheur.textContent = 'Téléverser';
    document.body.appendChild(declencheur);
    declencheur.focus();
  });

  afterEach(() => {
    serveur.verify();
    declencheur.remove();
    document.querySelectorAll('.cdk-overlay-container').forEach((surcouche) => surcouche.remove());
    URL.createObjectURL = original.creer;
    URL.revokeObjectURL = original.revoquer;
  });

  const dialogue = () => document.querySelector<HTMLElement>('app-televerser-image')!;
  const texte = (selecteur: string) =>
    dialogue().querySelector(selecteur)?.textContent?.replace(/\s+/g, ' ').trim();
  const bouton = (libelle: string) =>
    [...dialogue().querySelectorAll<HTMLButtonElement>('button')].find(
      (element) => element.textContent?.trim() === libelle,
    )!;
  const champ = (etiquette: string) =>
    [...dialogue().querySelectorAll<HTMLElement>('mat-form-field')].find(
      (element) => element.querySelector('mat-label')?.textContent?.trim() === etiquette,
    );
  const bandeau = () => texte('app-bandeau-erreur [role="alert"]');

  function fichier(nom: string, type: string, taille = 4): File {
    const choisi = new File([new Uint8Array(4)], nom, { type });
    if (taille !== 4) {
      Object.defineProperty(choisi, 'size', { value: taille });
    }
    return choisi;
  }

  async function choisirFichier(choisi: File) {
    const selecteur = dialogue().querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(selecteur, 'files', { value: [choisi], configurable: true });
    selecteur.dispatchEvent(new Event('change'));
    await stabiliser();
  }

  async function choisirOption(etiquette: string, libelle: string) {
    champ(etiquette)!.querySelector<HTMLElement>('.mat-mdc-select-trigger')!.click();
    await stabiliser();
    [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option')]
      .find((option) => option.textContent?.replace(/\s+/g, ' ').trim().startsWith(libelle))!
      .click();
    await stabiliser();
  }

  async function saisir(etiquette: string, valeur: string) {
    const entree = champ(etiquette)!.querySelector<HTMLInputElement>('input')!;
    entree.value = valeur;
    entree.dispatchEvent(new Event('input'));
    await stabiliser();
  }

  it('titre, Mot en cursive, choix de fichier par bouton et dépôt, Repère de qualité, Album en lecture seule', async () => {
    await ouvrir();

    expect(texte('h2')).toBe('Téléverser une image');
    expect(texte('.televerser__mot')).toBe('Mot : citrouille');
    expect(document.activeElement).toBe(bouton('Choisir un fichier'));
    expect(dialogue().querySelector('input[type="file"]')?.getAttribute('accept')).toBe(
      'image/jpeg,image/png,image/gif',
    );
    expect(texte('.televerser__repere')).toBe('simple, claire, peu de détails');
    const album = champ("Album d'origine")!.querySelector<HTMLInputElement>('input')!;
    expect(album.value).toBe('La Roule Galette');
    expect(album.readOnly).toBe(true);
    expect(bouton('Enregistrer').disabled).toBe(true);
  });

  it('la licence suit le type ; « non partageable » sur Pixabay et « autre / inconnue » ; le Repère reste', async () => {
    await ouvrir();
    expect(champ('Licence')).toBeUndefined();

    await choisirOption("Type d'image", 'photo personnelle');
    let licence = champ('Licence')!.querySelector<HTMLInputElement>('input')!;
    expect(licence.value).toBe("droits d'auteur de l'enseignant");
    expect(licence.readOnly).toBe(true);

    await choisirOption("Type d'image", "image d'album");
    licence = champ('Licence')!.querySelector<HTMLInputElement>('input')!;
    expect(licence.value).toBe("usage pédagogique de l'album");

    await choisirOption("Type d'image", 'image libre');
    champ('Licence')!.querySelector<HTMLElement>('.mat-mdc-select-trigger')!.click();
    await stabiliser();
    const options = [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option')].map(
      (option) => option.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(options).toEqual([
      'Non renseignée',
      'ARASAAC (CC BY-NC-SA)',
      'Sclera (CC BY-NC)',
      'Mulberry (CC BY-SA)',
      'domaine public / CC0',
      'Pixabay · non partageable',
      'autre / inconnue · non partageable',
    ]);
    expect(texte('.televerser__repere')).toBe('simple, claire, peu de détails');
  });

  it('« Enregistrer » envoie le fichier et sa Carte d’identité en multipart, ferme avec le Mot illustré', async () => {
    await ouvrir();
    const png = fichier('citrouille.png', 'image/png');
    await choisirFichier(png);
    expect(texte('.televerser__fichier')).toBe('citrouille.png');
    expect(dialogue().querySelector('.televerser__apercu')?.getAttribute('src')).toBe(
      'blob:http://localhost/apercu',
    );
    await choisirOption("Type d'image", 'image libre');
    await saisir('Source', ' https://openclipart.org ');
    await choisirOption('Licence', 'domaine public / CC0');
    await saisir('Auteur', 'Anne');
    bouton('Enregistrer').click();
    await stabiliser();

    const requete = serveur.expectOne(URL_TELEVERSEMENT);
    expect(requete.request.method).toBe('POST');
    const corps = requete.request.body as FormData;
    expect(corps).toBeInstanceOf(FormData);
    expect((corps.get('fichier') as File).name).toBe('citrouille.png');
    expect(corps.get('typeImage')).toBe('image_libre');
    expect(corps.get('source')).toBe('https://openclipart.org');
    expect(corps.get('licence')).toBe('cc0_domaine_public');
    expect(corps.get('auteur')).toBe('Anne');
    requete.flush(ILLUSTREE, { status: 201, statusText: 'Created' });
    await stabiliser();

    expect(await resultat).toEqual(ILLUSTREE);
    expect(document.querySelector('app-televerser-image')).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/apercu');
  });

  it('photo personnelle : la licence choisie avant n’est pas envoyée, ni les champs vides', async () => {
    await ouvrir();
    await choisirFichier(fichier('photo.jpg', 'image/jpeg'));
    await choisirOption("Type d'image", 'image libre');
    await choisirOption('Licence', 'Pixabay');
    await choisirOption("Type d'image", 'photo personnelle');
    bouton('Enregistrer').click();
    await stabiliser();

    const corps = serveur.expectOne(URL_TELEVERSEMENT).request.body as FormData;
    expect(corps.get('typeImage')).toBe('photo_personnelle');
    expect(corps.has('licence')).toBe(false);
    expect(corps.has('source')).toBe(false);
    expect(corps.has('auteur')).toBe(false);
  });

  it('fichier de plus de 20 Mo : refusé sans requête, Bandeau sans « Réessayer »', async () => {
    await ouvrir();

    await choisirFichier(fichier('lourd.png', 'image/png', TAILLE_MAX_FICHIER + 1));
    await choisirOption("Type d'image", 'image libre');

    expect(bandeau()).toBe(MESSAGE_FICHIER_TROP_LOURD);
    expect(bouton('Réessayer')).toBeUndefined();
    expect(texte('.televerser__fichier')).toBe('Déposez une image ici, ou choisissez un fichier.');
    expect(bouton('Enregistrer').disabled).toBe(true);
    serveur.expectNone(URL_TELEVERSEMENT);
  });

  it('fichier qui n’est ni JPEG, ni PNG, ni GIF : refusé sans requête', async () => {
    await ouvrir();

    await choisirFichier(fichier('album.pdf', 'application/pdf'));

    expect(bandeau()).toBe(MESSAGE_FICHIER_NON_IMAGE);
    serveur.expectNone(URL_TELEVERSEMENT);
  });

  it('glisser-déposer : le fichier déposé est choisi', async () => {
    await ouvrir();
    const zone = dialogue().querySelector<HTMLElement>('.televerser__depot')!;
    const depot = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(depot, 'dataTransfer', {
      value: { files: [fichier('depose.gif', 'image/gif')] },
    });

    zone.dispatchEvent(depot);
    await stabiliser();

    expect(depot.defaultPrevented).toBe(true);
    expect(texte('.televerser__fichier')).toBe('depose.gif');
  });

  it('un fichier lâché hors de la zone n’est pas ouvert par le navigateur ni choisi', async () => {
    await ouvrir();
    const titre = dialogue().querySelector<HTMLElement>('h2')!;
    const survol = new Event('dragover', { bubbles: true, cancelable: true });
    const depot = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(depot, 'dataTransfer', {
      value: { files: [fichier('ailleurs.png', 'image/png')] },
    });

    titre.dispatchEvent(survol);
    titre.dispatchEvent(depot);
    await stabiliser();

    expect(survol.defaultPrevented).toBe(true);
    expect(depot.defaultPrevented).toBe(true);
    expect(texte('.televerser__fichier')).toBe('Déposez une image ici, ou choisissez un fichier.');
  });

  it('la surbrillance de la zone reste quand le pointeur passe sur un de ses éléments', async () => {
    await ouvrir();
    const zone = dialogue().querySelector<HTMLElement>('.televerser__depot')!;
    zone.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    await stabiliser();
    expect(zone.classList).toContain('televerser__depot--survol');

    const versEnfant = new Event('dragleave', { bubbles: true });
    Object.defineProperty(versEnfant, 'relatedTarget', {
      value: zone.querySelector('.televerser__fichier'),
    });
    zone.dispatchEvent(versEnfant);
    await stabiliser();
    expect(zone.classList).toContain('televerser__depot--survol');

    const dehors = new Event('dragleave', { bubbles: true });
    Object.defineProperty(dehors, 'relatedTarget', { value: document.body });
    zone.dispatchEvent(dehors);
    await stabiliser();
    expect(zone.classList).not.toContain('televerser__depot--survol');
  });

  it('pendant l’envoi, « Enregistrement de l’image… » est annoncé poliment', async () => {
    await ouvrir();
    const annonce = () => dialogue().querySelector('.televerser__envoi')!;
    expect(annonce().getAttribute('aria-live')).toBe('polite');
    expect(annonce().textContent?.trim()).toBe('');
    await choisirFichier(fichier('a.png', 'image/png'));
    await choisirOption("Type d'image", 'image libre');
    bouton('Enregistrer').click();
    await stabiliser();

    expect(annonce().textContent?.trim()).toBe("Enregistrement de l'image…");
    serveur.expectOne(URL_TELEVERSEMENT).flush(ILLUSTREE);
    expect(await resultat).toEqual(ILLUSTREE);
  });

  it('Source et Auteur : 500 caractères au plus', async () => {
    await ouvrir();

    for (const etiquette of ['Source', 'Auteur']) {
      expect(champ(etiquette)!.querySelector('input')!.getAttribute('maxlength')).toBe('500');
    }
  });

  it('refus du back : Bandeau traduit, le dialogue reste ouvert avec la saisie', async () => {
    await ouvrir();
    await choisirFichier(fichier('faux.png', 'image/png'));
    await choisirOption("Type d'image", 'inconnu');
    bouton('Enregistrer').click();
    await stabiliser();

    serveur
      .expectOne(URL_TELEVERSEMENT)
      .flush(
        { code: 'format.non_supporte' },
        { status: 415, statusText: 'Unsupported Media Type' },
      );
    await stabiliser();

    expect(bandeau()).toBe('Format de fichier non pris en charge.');
    expect(bouton('Réessayer')).toBeUndefined();
    expect(texte('.televerser__fichier')).toBe('faux.png');
    expect(bouton('Enregistrer').disabled).toBe(false);
  });

  it('échec réseau : « Réessayer » renvoie le formulaire', async () => {
    await ouvrir();
    await choisirFichier(fichier('a.png', 'image/png'));
    await choisirOption("Type d'image", 'image libre');
    bouton('Enregistrer').click();
    await stabiliser();
    serveur.expectOne(URL_TELEVERSEMENT).error(new ProgressEvent('error'), { status: 0 });
    await stabiliser();

    bouton('Réessayer').click();
    await stabiliser();
    serveur.expectOne(URL_TELEVERSEMENT).flush(ILLUSTREE);

    expect(await resultat).toEqual(ILLUSTREE);
  });

  it('« Annuler » ferme sans rien envoyer ; le focus revient au bouton « Téléverser »', async () => {
    await ouvrir();
    await choisirFichier(fichier('a.png', 'image/png'));

    bouton('Annuler').click();
    await stabiliser();

    expect(await resultat).toBeUndefined();
    expect(document.activeElement).toBe(declencheur);
    serveur.expectNone(URL_TELEVERSEMENT);
  });
});
