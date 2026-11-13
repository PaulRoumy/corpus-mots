import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { AlbumDto } from '../../api/models/album-dto';
import { CarteIdentiteImageDto } from '../../api/models/carte-identite-image-dto';
import { DELAI_RECHERCHE_ALBUMS_MS } from '../../preparations/recherche-albums';
import { CompteCourant } from '../compte-courant';
import { DialogueConfirmation } from '../dialogue-confirmation/dialogue-confirmation';
import { MESSAGE_RESEAU, MESSAGES_PAR_CODE } from '../erreurs/message-erreur';
import { provideIcones } from '../icones';
import { CarteIdentite, CONFIRMATION_IMAGE_ALBUM, MESSAGE_SENS_FIGE } from './carte-identite';

const MOI = '0190f0a0-0000-7000-8000-00000000e001';
const ZOE = '0190f0a0-0000-7000-8000-00000000e002';
const ANCIEN = '0190f0a0-0000-7000-8000-00000000e003';
const IMAGE = '0190f0a0-0000-7000-8000-0000000c0001';
const AUTRE = '0190f0a0-0000-7000-8000-0000000c0002';

const CARTE: CarteIdentiteImageDto = {
  id: IMAGE,
  proprietaireId: MOI,
  etat: 'privee',
  aRemplacer: null,
  reutilisable: true,
  typeImage: 'image_libre',
  aCompleter: false,
  motId: '0190f0a0-0000-7000-8000-0000000e0001',
  forme: 'citrouille',
  sens: {
    id: '0190f0a0-0000-7000-8000-0000000d0001',
    libelle: 'légume',
    categorie: 'nom',
    aCompleter: false,
  },
  albumOrigine: null,
  licence: 'cc0_domaine_public',
  source: 'site web',
  auteur: null,
  sections: [],
  module: null,
  themes: [],
  sensModifiable: true,
};

const ROULE_GALETTE: AlbumDto = {
  id: '0190f0a0-0000-7000-8000-00000000a001',
  titre: 'Roule galette',
  auteur: 'Natha Caputo',
  createurId: MOI,
  nombreModules: 0,
};

const MODULE_1 = { id: '0190f0a0-0000-7000-8000-00000000b001', nom: 'Module 1' };
const MODULE_2 = { id: '0190f0a0-0000-7000-8000-00000000b002', nom: 'Module 2' };
const ANIMAUX = { id: '0190f0a0-0000-7000-8000-00000000f001', nom: 'animaux' };
const FORET = { id: '0190f0a0-0000-7000-8000-00000000f002', nom: 'forêt' };

describe('CarteIdentite', () => {
  let fixture: ComponentFixture<CarteIdentite>;
  let racine: HTMLElement;
  let serveur: HttpTestingController;
  let confirmer: ReturnType<typeof vi.fn>;
  const original = { creer: URL.createObjectURL, revoquer: URL.revokeObjectURL };

  async function stabiliser() {
    await new Promise((fin) => setTimeout(fin));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    URL.createObjectURL = vi.fn(() => 'blob:http://localhost/grande');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideIcones(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
        { provide: DialogueConfirmation, useValue: { confirmer: (confirmer = vi.fn()) } },
      ],
    });
    serveur = TestBed.inject(HttpTestingController);
    TestBed.inject(CompteCourant).mettreAJour({
      id: MOI,
      nomAffiche: 'Claire',
      email: 'claire@ecole.fr',
      administrateur: false,
    });
    fixture = TestBed.createComponent(CarteIdentite);
    fixture.componentRef.setInput('imageId', IMAGE);
    racine = fixture.nativeElement as HTMLElement;
    document.body.appendChild(racine);
    await stabiliser();
    serveur.expectOne('/api/enseignants').flush([
      { id: MOI, nomAffiche: 'Claire', statut: 'actif' },
      { id: ZOE, nomAffiche: 'Zoé', statut: 'actif' },
    ]);
  });

  afterEach(() => {
    serveur.match((requete) => requete.url.endsWith('/fichier'));
    serveur.verify();
    racine.remove();
    document.querySelectorAll('.cdk-overlay-container').forEach((surcouche) => surcouche.remove());
    URL.createObjectURL = original.creer;
    URL.revokeObjectURL = original.revoquer;
  });

  async function servir(carte: CarteIdentiteImageDto, id = IMAGE) {
    serveur.expectOne(`/api/images/${id}`).flush(carte);
    await stabiliser();
  }

  /** Paires « intitulé : valeur » de la liste des champs, dans l'ordre. */
  const champs = () =>
    [...racine.querySelectorAll('dt')].map(
      (dt) =>
        `${dt.textContent?.trim()} : ${dt.nextElementSibling?.textContent?.replace(/\s+/g, ' ').trim()}`,
    );
  const texte = (selecteur: string) =>
    racine.querySelector(selecteur)?.textContent?.replace(/\s+/g, ' ').trim();

  it('aside nommé « Carte d’identité », squelette pendant la lecture, puis le focus va au panneau', async () => {
    const panneau = racine.querySelector<HTMLElement>('aside')!;
    expect(document.getElementById(panneau.getAttribute('aria-labelledby')!)?.textContent).toBe(
      "Carte d'identité",
    );
    expect(racine.querySelector('app-squelette')).not.toBeNull();
    expect(document.activeElement).toBe(panneau);

    await servir(CARTE);
    expect(racine.querySelector('app-squelette')).toBeNull();
  });

  it('non-propriétaire : les douze champs dans l’ordre du Glossaire, aucun champ modifiable', async () => {
    await servir({ ...CARTE, proprietaireId: ZOE, reutilisable: false });

    expect(champs()).toEqual([
      'Mot : citrouille',
      'Sens : légume',
      'Catégorie : nom',
      'Sections : —',
      "Album d'origine : —",
      'Module : —',
      'Thèmes : —',
      'Type : image libre',
      'Source : site web',
      'Licence : domaine public / CC0',
      'Auteur : —',
      'Propriétaire : Zoé',
    ]);
    expect(racine.querySelector('.carte-identite__mot')?.textContent).toBe('citrouille');
    expect(texte('app-badge-type-image')).toBe('Type : image libre');
    expect(racine.querySelector('mat-form-field, input, mat-select')).toBeNull();
    expect(texte('.carte-identite__lecture-seule')).toBe('lecture seule');
    expect(racine.querySelector('.carte-identite__basse-resolution')).toBeNull();
    expect(racine.querySelector('footer, .carte-identite__actions')).toBeNull();
  });

  it('grande vignette en blob par `?taille=grande`, alternative « Mot, Sens »', async () => {
    await servir(CARTE);
    const requete = serveur.expectOne((r) => r.url === `/api/images/${IMAGE}/fichier`);
    expect(requete.request.params.get('taille')).toBe('grande');
    expect(requete.request.responseType).toBe('blob');
    requete.flush(new Blob(['png']));
    await stabiliser();

    const image = racine.querySelector<HTMLImageElement>('.carte-identite__image')!;
    expect(image.getAttribute('src')).toBe('blob:http://localhost/grande');
    expect(image.getAttribute('alt')).toBe('citrouille, légume');
  });

  it('image d’album d’un collègue : album (titre puis auteur), « basse résolution », « lecture seule »', async () => {
    await servir({
      ...CARTE,
      proprietaireId: ZOE,
      reutilisable: false,
      typeImage: 'image_album',
      licence: 'usage_pedagogique_album',
      albumOrigine: {
        id: '0190f0a0-0000-7000-8000-00000000a001',
        titre: 'Roule galette',
        auteur: 'Natha Caputo',
      },
    });

    expect(champs()).toContain("Album d'origine : Roule galette, Natha Caputo");
    expect(champs()).toContain("Licence : usage pédagogique de l'album");
    expect(champs()).toContain('Propriétaire : Zoé');
    expect(texte('.carte-identite__basse-resolution')).toBe('basse résolution');
    expect(texte('.carte-identite__lecture-seule')).toBe('lecture seule');
  });

  it('collègue : Sections en Repères, Module « Module 1 · Roule galette » et Thèmes en lecture', async () => {
    await servir({
      ...CARTE,
      proprietaireId: ZOE,
      reutilisable: false,
      sections: ['ms', 'gs'],
      module: { id: MODULE_1.id, nom: 'Module 1', albumId: ROULE_GALETTE.id, titreAlbum: 'Roule galette' },
      themes: [
        { id: ANIMAUX.id, nom: 'animaux' },
        { id: FORET.id, nom: 'forêt' },
      ],
    });

    expect(champs()).toContain('Sections : Section MS Section GS');
    expect(racine.querySelectorAll('app-repere-section')).toHaveLength(2);
    expect(champs()).toContain('Module : Module 1 · Roule galette');
    expect(texte('.carte-identite__titre-album')).toBe('Roule galette');
    expect(champs()).toContain('Thèmes : animaux, forêt');
    expect(racine.querySelector('mat-chip-listbox, app-champ-themes, mat-form-field')).toBeNull();
  });

  it('propriétaire absent de l’annuaire : « un ancien membre de l’équipe »', async () => {
    await servir({ ...CARTE, proprietaireId: ANCIEN });

    expect(champs().at(-1)).toBe("Propriétaire : un ancien membre de l'équipe");
  });

  it('Sens « à compléter » mis en avant par la couleur, l’icône et le libellé', async () => {
    await servir({
      ...CARTE,
      sens: { ...CARTE.sens, libelle: 'à compléter', categorie: null, aCompleter: true },
    });

    const sens = racine.querySelector('.carte-identite__sens-a-completer')!;
    expect(sens.textContent?.trim()).toBe('à compléter');
    expect(sens.querySelector('mat-icon')?.getAttribute('svgicon')).toBe('crayon');
    expect(champs()).toContain('Catégorie : —');
  });

  it('échec : message traduit et « Réessayer » dans le panneau, qui relit', async () => {
    serveur.expectOne(`/api/images/${IMAGE}`).error(new ProgressEvent('error'));
    await stabiliser();

    expect(racine.querySelector('aside app-bandeau-erreur [role="alert"]')).not.toBeNull();
    [...racine.querySelectorAll<HTMLButtonElement>('app-bandeau-erreur button')]
      .find((bouton) => bouton.textContent?.trim() === 'Réessayer')!
      .click();
    await stabiliser();
    await servir(CARTE);
    expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
    expect(champs()[0]).toBe('Mot : citrouille');
  });

  it('404 ressource.introuvable : message traduit, sans « Réessayer »', async () => {
    serveur
      .expectOne(`/api/images/${IMAGE}`)
      .flush(
        { status: 404, code: 'ressource.introuvable' },
        { status: 404, statusText: 'Not Found' },
      );
    await stabiliser();

    expect(racine.querySelector('app-bandeau-erreur [role="alert"]')?.textContent?.trim()).toBe(
      MESSAGES_PAR_CODE['ressource.introuvable'],
    );
    expect(
      [...racine.querySelectorAll('app-bandeau-erreur button')].map((b) => b.textContent?.trim()),
    ).not.toContain('Réessayer');
  });

  it('réponse tardive : la première lecture, servie après la seconde, ne remplace pas la Carte', async () => {
    const premiere = serveur.expectOne(`/api/images/${IMAGE}`);
    fixture.componentRef.setInput('imageId', AUTRE);
    await stabiliser();

    await servir({ ...CARTE, id: AUTRE, forme: 'galette' }, AUTRE);
    premiere.flush(CARTE);
    await stabiliser();
    expect(champs()[0]).toBe('Mot : galette');

    // Même chose pour un échec tardif.
    fixture.componentRef.setInput('imageId', IMAGE);
    await stabiliser();
    const troisieme = serveur.expectOne(`/api/images/${IMAGE}`);
    fixture.componentRef.setInput('imageId', AUTRE);
    await stabiliser();
    await servir({ ...CARTE, id: AUTRE, forme: 'galette' }, AUTRE);
    troisieme.error(new ProgressEvent('error'));
    await stabiliser();
    expect(champs()[0]).toBe('Mot : galette');
    expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
  });

  it('une autre Image remplace la Carte affichée', async () => {
    await servir(CARTE);
    fixture.componentRef.setInput('imageId', AUTRE);
    await stabiliser();
    expect(racine.querySelector('app-squelette')).not.toBeNull();

    await servir({ ...CARTE, id: AUTRE, forme: 'galette' }, AUTRE);
    expect(champs()[0]).toBe('Mot : galette');
  });

  it('« Fermer » et Échap émettent `fermer`', async () => {
    await servir(CARTE);
    let fermetures = 0;
    fixture.componentInstance.fermer.subscribe(() => fermetures++);

    racine.querySelector<HTMLButtonElement>('button[aria-label="Fermer"]')!.click();
    racine
      .querySelector('aside')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(fermetures).toBe(2);
  });

  describe('propriétaire', () => {
    const URL_DESCRIPTION = `/api/images/${IMAGE}/description`;
    const attendreFrappe = () =>
      new Promise((fin) => setTimeout(fin, DELAI_RECHERCHE_ALBUMS_MS + 50));

    const champ = (etiquette: string) =>
      [...racine.querySelectorAll<HTMLElement>('mat-form-field')].find(
        (element) => element.querySelector('mat-label')?.textContent?.trim() === etiquette,
      );
    const entree = (etiquette: string) =>
      champ(etiquette)!.querySelector<HTMLInputElement>('input')!;
    const bandeau = () => texte('app-bandeau-erreur [role="alert"]');

    async function saisirEtQuitter(etiquette: string, valeur: string) {
      const element = entree(etiquette);
      element.focus();
      element.value = valeur;
      element.dispatchEvent(new Event('input'));
      element.dispatchEvent(new Event('blur'));
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

    async function chercherEtChoisirAlbum() {
      const album = entree("Album d'origine");
      album.focus();
      album.value = 'roule';
      album.dispatchEvent(new Event('input'));
      await attendreFrappe();
      await stabiliser();
      serveur
        .expectOne('/api/albums?recherche=roule&taille=20')
        .flush({ elements: [ROULE_GALETTE], total: 1 });
      await stabiliser();
      document.querySelector<HTMLElement>('.cdk-overlay-pane mat-option')!.click();
      await stabiliser();
    }

    it('Sens, Sections, Module, Thèmes, type, source, licence et auteur modifiables ; les autres champs en lecture', async () => {
      await servir(CARTE);

      expect(champs()).toEqual([
        'Mot : citrouille',
        'Catégorie : nom',
        'Sections : Section PS Section MS Section GS',
        'Module : —',
        'Propriétaire : Claire (vous)',
      ]);
      expect(
        [...racine.querySelectorAll('mat-form-field mat-label')].map((l) => l.textContent?.trim()),
      ).toEqual(['Sens', 'Album du module', 'Thèmes', "Type d'image", 'Source', 'Licence', 'Auteur']);
      expect(texte('.carte-identite__sens-choix')).toBe('légume');
      expect(texte('.carte-identite__type')).toBe('image libre');
      expect(entree('Source').value).toBe('site web');
      expect(texte('.carte-identite__licence')).toBe('domaine public / CC0');
      expect(entree('Auteur').value).toBe('');
      expect(racine.querySelector('.carte-identite__lecture-seule')).toBeNull();
    });

    it('image d’album : Album d’origine modifiable, auteur de l’album dessous, licence imposée', async () => {
      await servir({
        ...CARTE,
        typeImage: 'image_album',
        licence: 'usage_pedagogique_album',
        albumOrigine: { id: ROULE_GALETTE.id, titre: 'Roule galette', auteur: 'Natha Caputo' },
      });

      expect(entree("Album d'origine").value).toBe('Roule galette');
      expect(texte('.carte-identite__album-auteur')).toBe('Natha Caputo');
      expect(entree('Licence').value).toBe("usage pédagogique de l'album");
      expect(entree('Licence').readOnly).toBe(true);
      expect(texte('.carte-identite__basse-resolution')).toBe('basse résolution');
    });

    it('un champ quitté sans changement n’envoie rien', async () => {
      await servir(CARTE);

      await saisirEtQuitter('Source', 'site web');
      await saisirEtQuitter('Auteur', '   ');
      await choisirOption('Licence', 'domaine public / CC0');
      await choisirOption("Type d'image", 'image libre');

      serveur.expectNone(URL_DESCRIPTION);
    });

    it('source quittée : les cinq valeurs envoyées, la Carte renvoyée est émise', async () => {
      await servir(CARTE);
      const emises: CarteIdentiteImageDto[] = [];
      fixture.componentRef.setInput('appliquer', (carte: CarteIdentiteImageDto) =>
        emises.push(carte),
      );

      await saisirEtQuitter('Source', '  pixabay.com ');

      const requete = serveur.expectOne(URL_DESCRIPTION);
      expect(requete.request.method).toBe('PUT');
      expect(requete.request.body).toEqual({
        typeImage: 'image_libre',
        licence: 'cc0_domaine_public',
        source: 'pixabay.com',
        auteur: null,
      });
      const maj = { ...CARTE, source: 'pixabay.com' };
      requete.flush(maj);
      await stabiliser();
      expect(emises).toEqual([maj]);
      expect(entree('Source').value).toBe('pixabay.com');
    });

    it('type photo personnelle : enregistré au choix, licence imposée affichée', async () => {
      await servir(CARTE);
      const emises: CarteIdentiteImageDto[] = [];
      fixture.componentRef.setInput('appliquer', (carte: CarteIdentiteImageDto) =>
        emises.push(carte),
      );

      await choisirOption("Type d'image", 'photo personnelle');

      const requete = serveur.expectOne(URL_DESCRIPTION);
      expect(requete.request.body).toEqual({
        typeImage: 'photo_personnelle',
        licence: null,
        source: 'site web',
        auteur: null,
      });
      requete.flush({
        ...CARTE,
        typeImage: 'photo_personnelle',
        licence: 'droits_auteur_enseignant',
      });
      await stabiliser();
      expect(emises.map((carte) => carte.typeImage)).toEqual(['photo_personnelle']);
      expect(texte('app-badge-type-image')).toBe('Type : photo personnelle');
      expect(entree('Licence').value).toBe("droits d'auteur de l'enseignant");
    });

    it('échec : la saisie reste, le champ est signalé, Bandeau d’erreur dans le panneau', async () => {
      await servir(CARTE);

      await saisirEtQuitter('Source', 'pixabay.com');
      serveur
        .expectOne(URL_DESCRIPTION)
        .flush({ status: 500, code: 'erreur.interne' }, { status: 500, statusText: 'Error' });
      await stabiliser();

      expect(entree('Source').value).toBe('pixabay.com');
      expect(champ('Source')!.classList).toContain('mat-form-field-invalid');
      expect(texte('mat-error')).toBe('Non enregistré');
      expect(bandeau()).toBe(MESSAGES_PAR_CODE['erreur.interne']);

      // « Réessayer » renvoie la saisie ; le succès efface le signalement.
      [...racine.querySelectorAll<HTMLButtonElement>('app-bandeau-erreur button')]
        .find((bouton) => bouton.textContent?.trim() === 'Réessayer')!
        .click();
      await stabiliser();
      serveur.expectOne(URL_DESCRIPTION).flush({ ...CARTE, source: 'pixabay.com' });
      await stabiliser();
      expect(champ('Source')!.classList).not.toContain('mat-form-field-invalid');
      expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
    });

    it('403 image.reservee_au_proprietaire : message traduit dans le Bandeau', async () => {
      await servir(CARTE);

      await saisirEtQuitter('Auteur', 'Zoé');
      serveur
        .expectOne(URL_DESCRIPTION)
        .flush(
          { status: 403, code: 'image.reservee_au_proprietaire' },
          { status: 403, statusText: 'Forbidden' },
        );
      await stabiliser();

      expect(bandeau()).toBe(MESSAGES_PAR_CODE['image.reservee_au_proprietaire']);
      expect(entree('Auteur').value).toBe('Zoé');
    });

    it('image d’album sans Album : « Album d’origine requis » en quittant le champ, rien n’est envoyé', async () => {
      await servir(CARTE);

      await choisirOption("Type d'image", "image d'album");
      expect(entree('Licence').value).toBe("usage pédagogique de l'album");
      const album = entree("Album d'origine");
      album.focus();
      album.dispatchEvent(new Event('blur'));
      await stabiliser();

      expect(texte('mat-error')).toBe(MESSAGES_PAR_CODE['image.album_requis']);
      serveur.expectNone(URL_DESCRIPTION);
      expect(confirmer).not.toHaveBeenCalled();
    });

    it('image d’album, Album choisi, « Annuler » : type précédent rétabli, aucune requête', async () => {
      await servir(CARTE);
      confirmer.mockResolvedValue(false);

      await choisirOption("Type d'image", "image d'album");
      await chercherEtChoisirAlbum();
      await stabiliser();

      expect(confirmer).toHaveBeenCalledWith(CONFIRMATION_IMAGE_ALBUM);
      expect(texte('.carte-identite__type')).toBe('image libre');
      expect(champ("Album d'origine")).toBeUndefined();
      expect(texte('.carte-identite__licence')).toBe('domaine public / CC0');
      serveur.expectNone(URL_DESCRIPTION);
    });

    it('image d’album, Album choisi, « Réduire » : enregistrée avec son Album', async () => {
      await servir(CARTE);
      confirmer.mockResolvedValue(true);

      await choisirOption("Type d'image", "image d'album");
      await chercherEtChoisirAlbum();
      await stabiliser();

      const requete = serveur.expectOne(URL_DESCRIPTION);
      expect(requete.request.body).toEqual({
        typeImage: 'image_album',
        licence: null,
        source: 'site web',
        auteur: null,
        albumId: ROULE_GALETTE.id,
      });
      requete.flush({
        ...CARTE,
        typeImage: 'image_album',
        licence: 'usage_pedagogique_album',
        albumOrigine: { id: ROULE_GALETTE.id, titre: 'Roule galette', auteur: 'Natha Caputo' },
      });
      await stabiliser();
      expect(texte('.carte-identite__basse-resolution')).toBe('basse résolution');
      expect(texte('.carte-identite__album-auteur')).toBe('Natha Caputo');
    });

    it('file : Source puis Auteur quittés avant la première réponse, la seconde requête suit la première', async () => {
      await servir(CARTE);

      await saisirEtQuitter('Source', 'pixabay.com');
      await saisirEtQuitter('Auteur', 'Claire D.');

      const premiere = serveur.expectOne(URL_DESCRIPTION);
      serveur.expectNone(URL_DESCRIPTION);
      premiere.flush({ ...CARTE, source: 'pixabay.com' });
      await stabiliser();

      const seconde = serveur.expectOne(URL_DESCRIPTION);
      expect(seconde.request.body).toEqual({
        typeImage: 'image_libre',
        licence: 'cc0_domaine_public',
        source: 'pixabay.com',
        auteur: 'Claire D.',
      });
      seconde.flush({ ...CARTE, source: 'pixabay.com', auteur: 'Claire D.' });
      await stabiliser();
    });

    it('Échap dans Source modifiée : la saisie est enregistrée, puis le panneau se ferme', async () => {
      await servir(CARTE);
      let fermetures = 0;
      fixture.componentInstance.fermer.subscribe(() => fermetures++);

      const source = entree('Source');
      source.focus();
      source.value = 'pixabay.com';
      source.dispatchEvent(new Event('input'));
      source.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await stabiliser();

      expect(fermetures).toBe(1);
      const requete = serveur.expectOne(URL_DESCRIPTION);
      expect(requete.request.body).toMatchObject({ source: 'pixabay.com' });
      requete.flush({ ...CARTE, source: 'pixabay.com' });
      await stabiliser();
    });

    it('Annuler la réduction : la Source quittée pendant l’attente de l’Album est enregistrée', async () => {
      await servir(CARTE);
      confirmer.mockResolvedValue(false);

      await choisirOption("Type d'image", "image d'album");
      await saisirEtQuitter('Source', 'scan');
      serveur.expectNone(URL_DESCRIPTION);
      await chercherEtChoisirAlbum();
      await stabiliser();

      const requete = serveur.expectOne(URL_DESCRIPTION);
      expect(requete.request.body).toEqual({
        typeImage: 'image_libre',
        licence: 'cc0_domaine_public',
        source: 'scan',
        auteur: null,
      });
      requete.flush({ ...CARTE, source: 'scan' });
      await stabiliser();
    });

    it('échec de la recherche d’Album : Bandeau propre, « Réessayer » relance la recherche', async () => {
      await servir(CARTE);
      await choisirOption("Type d'image", "image d'album");
      const album = entree("Album d'origine");
      album.focus();
      album.value = 'roule';
      album.dispatchEvent(new Event('input'));
      await attendreFrappe();
      await stabiliser();
      serveur.expectOne('/api/albums?recherche=roule&taille=20').error(new ProgressEvent('error'));
      await stabiliser();

      const bandeauRecherche = racine.querySelector('.carte-identite__erreur-recherche')!;
      expect(bandeauRecherche.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
        MESSAGE_RESEAU,
      );
      [...bandeauRecherche.querySelectorAll<HTMLButtonElement>('button')]
        .find((bouton) => bouton.textContent?.trim() === 'Réessayer')!
        .click();
      await stabiliser();
      serveur
        .expectOne('/api/albums?recherche=roule&taille=20')
        .flush({ elements: [ROULE_GALETTE], total: 1 });
      await stabiliser();

      expect(racine.querySelector('.carte-identite__erreur-recherche')).toBeNull();
      expect(
        [...document.querySelectorAll('.cdk-overlay-pane mat-option')].map((o) =>
          o.textContent?.trim(),
        ),
      ).toEqual(['Roule galette']);
      serveur.expectNone(URL_DESCRIPTION);
    });

    it('Échap dans la liste ouverte de l’Album la ferme sans fermer le panneau', async () => {
      await servir({
        ...CARTE,
        typeImage: 'image_album',
        licence: 'usage_pedagogique_album',
        albumOrigine: { id: ROULE_GALETTE.id, titre: 'Roule galette', auteur: 'Natha Caputo' },
      });
      let fermetures = 0;
      fixture.componentInstance.fermer.subscribe(() => fermetures++);
      const album = entree("Album d'origine");
      album.focus();
      album.value = 'roule';
      album.dispatchEvent(new Event('input'));
      await attendreFrappe();
      await stabiliser();
      serveur
        .expectOne('/api/albums?recherche=roule&taille=20')
        .flush({ elements: [ROULE_GALETTE], total: 1 });
      await stabiliser();
      expect(document.querySelector('.cdk-overlay-pane mat-option')).not.toBeNull();
      await stabiliser();
      expect(album.getAttribute('aria-expanded')).toBe('true');

      album.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }),
      );
      await stabiliser();

      expect(fermetures).toBe(0);
      expect(album.getAttribute('aria-expanded')).toBe('false');
    });

    it('Échap dans une liste ouverte la ferme sans fermer le panneau', async () => {
      await servir(CARTE);
      let fermetures = 0;
      fixture.componentInstance.fermer.subscribe(() => fermetures++);

      champ("Type d'image")!.querySelector<HTMLElement>('.mat-mdc-select-trigger')!.click();
      await stabiliser();
      champ("Type d'image")!
        .querySelector('mat-select')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await stabiliser();

      expect(fermetures).toBe(0);
    });

    describe('sens', () => {
      const URL_SENS = `/api/images/${IMAGE}/sens`;
      const A_COMPLETER = {
        id: CARTE.sens.id,
        libelle: 'à compléter',
        categorie: null,
        aCompleter: true,
      };
      const ANIMAL = {
        id: '0190f0a0-0000-7000-8000-0000000d0002',
        libelle: 'animal',
        categorie: 'nom',
        aCompleter: false,
      };
      const CARTE_A_COMPLETER: CarteIdentiteImageDto = {
        ...CARTE,
        forme: 'loup',
        sens: { id: A_COMPLETER.id, libelle: 'à compléter', categorie: null, aCompleter: true },
      };
      const CARTE_ANIMAL: CarteIdentiteImageDto = {
        ...CARTE_A_COMPLETER,
        sens: { id: ANIMAL.id, libelle: 'animal', categorie: 'nom', aCompleter: false },
      };
      const options = () =>
        [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option')].map((o) =>
          o.textContent?.replace(/\s+/g, ' ').trim(),
        );

      /** Ouvre la liste des Sens : les Sens du Mot sont lus à l'entrée dans le champ. */
      async function ouvrirSens(lus = [A_COMPLETER, ANIMAL]) {
        const declencheur = champ('Sens')!.querySelector<HTMLElement>('.mat-mdc-select-trigger')!;
        champ('Sens')!.querySelector<HTMLElement>('mat-select')!.focus();
        declencheur.click();
        await stabiliser();
        serveur.expectOne(URL_SENS).flush(lus);
        await stabiliser();
      }

      it('« à compléter » mis en avant dans le champ ; « animal » choisi : catégorie « nom », mise en avant retirée', async () => {
        await servir(CARTE_A_COMPLETER);
        const emises: CarteIdentiteImageDto[] = [];
        fixture.componentRef.setInput('appliquer', (carte: CarteIdentiteImageDto) =>
          emises.push(carte),
        );
        const enAvant = racine.querySelector('.carte-identite__sens-choix .carte-identite__sens-a-completer')!;
        expect(enAvant.textContent?.trim()).toBe('à compléter');
        expect(enAvant.querySelector('mat-icon')?.getAttribute('svgicon')).toBe('crayon');
        expect(champs()).toContain('Catégorie : —');

        await ouvrirSens();
        expect(options()).toEqual(['à compléter', 'animal · nom']);
        [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option')][1].click();
        await stabiliser();

        const requete = serveur.expectOne(URL_SENS);
        expect(requete.request.method).toBe('PUT');
        expect(requete.request.body).toEqual({ sensId: ANIMAL.id });
        requete.flush(CARTE_ANIMAL);
        await stabiliser();
        expect(emises).toEqual([CARTE_ANIMAL]);
        expect(champs()).toContain('Catégorie : nom');
        expect(texte('.carte-identite__sens-choix')).toBe('animal');
        expect(racine.querySelector('.carte-identite__sens-a-completer')).toBeNull();
        serveur.expectNone(URL_DESCRIPTION);

        // Les Sens proposés dépendent du Sens actuel : relus à la prochaine ouverture.
        champ('Sens')!.querySelector<HTMLElement>('.mat-mdc-select-trigger')!.click();
        await stabiliser();
        serveur.expectOne(URL_SENS).flush([ANIMAL]);
        await stabiliser();
        expect(options()).toEqual(['animal · nom']);
      });

      it('le même Sens choisi n’envoie rien ; les Sens ne sont lus qu’une fois', async () => {
        await servir(CARTE_A_COMPLETER);

        await ouvrirSens();
        [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option')][0].click();
        await stabiliser();
        champ('Sens')!.querySelector<HTMLElement>('.mat-mdc-select-trigger')!.click();
        await stabiliser();

        serveur.expectNone(URL_SENS);
      });

      it('Image déjà liée : Sens en lecture, explication dessous, aucune lecture des Sens', async () => {
        await servir({ ...CARTE, sensModifiable: false });

        expect(champ('Sens')).toBeUndefined();
        expect(champs().slice(0, 3)).toEqual(['Mot : citrouille', 'Sens : légume', 'Catégorie : nom']);
        expect(texte('.carte-identite__sens-fige')).toBe(MESSAGE_SENS_FIGE);
        racine.querySelector<HTMLElement>('.carte-identite__formulaire')!.dispatchEvent(
          new FocusEvent('focusin', { bubbles: true }),
        );
        await stabiliser();
        serveur.expectNone(URL_SENS);
      });

      it('collègue : Sens et catégorie en lecture, aucune lecture des Sens', async () => {
        await servir({ ...CARTE, proprietaireId: ZOE, reutilisable: false, sensModifiable: false });

        expect(champs().slice(0, 3)).toEqual(['Mot : citrouille', 'Sens : légume', 'Catégorie : nom']);
        expect(racine.querySelector('mat-select, .carte-identite__sens-fige')).toBeNull();
        serveur.expectNone(URL_SENS);
      });

      it('409 : lien créé entre l’ouverture et le choix, Sens précédent remis en lecture, explication, Bandeau', async () => {
        await servir(CARTE_A_COMPLETER);

        await ouvrirSens();
        [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option')][1].click();
        await stabiliser();
        serveur
          .expectOne(URL_SENS)
          .flush(
            { status: 409, code: 'image.sens_non_modifiable' },
            { status: 409, statusText: 'Conflict' },
          );
        await stabiliser();

        expect(champ('Sens')).toBeUndefined();
        expect(racine.querySelector('.carte-identite__sens-choix')).toBeNull();
        expect(champs()).toContain('Sens : à compléter');
        expect(texte('.carte-identite__sens-fige')).toBe(MESSAGE_SENS_FIGE);
        expect(bandeau()).toBe(MESSAGES_PAR_CODE['image.sens_non_modifiable']);
        expect(champs()).toContain('Catégorie : —');
      });

      it('400 image.sens_invalide : Sens enregistré remis, champ signalé, Sens relus à la prochaine ouverture', async () => {
        await servir(CARTE_A_COMPLETER);

        await ouvrirSens();
        [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option')][1].click();
        await stabiliser();
        serveur
          .expectOne(URL_SENS)
          .flush(
            { status: 400, code: 'image.sens_invalide' },
            { status: 400, statusText: 'Bad Request' },
          );
        await stabiliser();

        expect(texte('.carte-identite__sens-choix')).toBe('à compléter');
        expect(champ('Sens')!.classList).toContain('mat-form-field-invalid');
        expect(texte('mat-error')).toBe('Non enregistré');
        expect(bandeau()).toBe(MESSAGES_PAR_CODE['image.sens_invalide']);

        champ('Sens')!.querySelector<HTMLElement>('.mat-mdc-select-trigger')!.click();
        await stabiliser();
        serveur.expectOne(URL_SENS).flush([A_COMPLETER]);
        await stabiliser();
        expect(options()).toEqual(['à compléter']);
      });

      it('échec de la lecture des Sens : Bandeau propre, « Réessayer » les relit', async () => {
        await servir(CARTE_A_COMPLETER);

        champ('Sens')!.querySelector<HTMLElement>('mat-select')!.focus();
        await stabiliser();
        serveur.expectOne(URL_SENS).error(new ProgressEvent('error'));
        await stabiliser();
        expect(texte('.carte-identite__erreur-sens [role="alert"]')).toBe(MESSAGE_RESEAU);

        [...racine.querySelectorAll<HTMLButtonElement>('.carte-identite__erreur-sens button')]
          .find((bouton) => bouton.textContent?.trim() === 'Réessayer')!
          .click();
        await stabiliser();
        serveur.expectOne(URL_SENS).flush([A_COMPLETER, ANIMAL]);
        await stabiliser();
        expect(racine.querySelector('.carte-identite__erreur-sens')).toBeNull();
      });
    });

    describe('classement', () => {
      const URL_CLASSEMENT = `/api/images/${IMAGE}/classement`;
      const URL_MODULES = `/api/albums/${ROULE_GALETTE.id}/modules`;
      const puce = (section: string) =>
        racine.querySelector<HTMLElement>(`.carte-identite__section--${section}`)!;
      const cocher = async (section: string) => {
        puce(section).querySelector<HTMLElement>('.mdc-evolution-chip__action--primary')!.click();
        await stabiliser();
      };
      const cochee = (section: string) => puce(section).classList.contains('mat-mdc-chip-selected');
      const saisieThemes = () =>
        racine.querySelector<HTMLInputElement>('input.champ-themes__saisie')!;
      const options = () =>
        [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option')].map((o) =>
          o.textContent?.replace(/\s+/g, ' ').trim(),
        );
      const choisirProposition = async (debut: string) => {
        [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option')]
          .find((o) => o.textContent?.replace(/\s+/g, ' ').trim().startsWith(debut))!
          .click();
        await stabiliser();
      };

      /** Entre dans le Champ à étiquettes (les Thèmes de l'école sont lus), puis tape `texte`. */
      async function taperTheme(texte: string) {
        saisieThemes().focus();
        await stabiliser();
        serveur.expectOne('/api/themes').flush([ANIMAUX, FORET]);
        await stabiliser();
        saisieThemes().value = texte;
        saisieThemes().dispatchEvent(new Event('input'));
        await stabiliser();
      }

      it('puce MS cochée : le classement est enregistré, la puce reste cochée, la Carte est émise', async () => {
        await servir(CARTE);
        const emises: CarteIdentiteImageDto[] = [];
        fixture.componentRef.setInput('appliquer', (carte: CarteIdentiteImageDto) =>
          emises.push(carte),
        );

        await cocher('ms');

        const requete = serveur.expectOne(URL_CLASSEMENT);
        expect(requete.request.method).toBe('PUT');
        expect(requete.request.body).toEqual({ sections: ['ms'], moduleId: null, themeIds: [] });
        const maj: CarteIdentiteImageDto = { ...CARTE, sections: ['ms'] };
        requete.flush(maj);
        await stabiliser();
        expect(emises).toEqual([maj]);
        expect(cochee('ms')).toBe(true);
        expect(cochee('ps')).toBe(false);
        serveur.expectNone(URL_DESCRIPTION);
      });

      it('échec à la puce GS : puce gardée cochée, Sections signalées, Bandeau ; « Réessayer » renvoie', async () => {
        await servir({ ...CARTE, sections: ['ps'] });
        expect(cochee('ps')).toBe(true);

        await cocher('gs');
        const requete = serveur.expectOne(URL_CLASSEMENT);
        expect(requete.request.body).toEqual({
          sections: ['ps', 'gs'],
          moduleId: null,
          themeIds: [],
        });
        requete.flush({ status: 500, code: 'erreur.interne' }, { status: 500, statusText: 'Error' });
        await stabiliser();

        expect(cochee('gs')).toBe(true);
        expect(texte('.carte-identite__non-enregistre')).toBe('Non enregistré');
        expect(bandeau()).toBe(MESSAGES_PAR_CODE['erreur.interne']);

        [...racine.querySelectorAll<HTMLButtonElement>('app-bandeau-erreur button')]
          .find((bouton) => bouton.textContent?.trim() === 'Réessayer')!
          .click();
        await stabiliser();
        serveur.expectOne(URL_CLASSEMENT).flush({ ...CARTE, sections: ['ps', 'gs'] });
        await stabiliser();
        expect(racine.querySelector('.carte-identite__non-enregistre')).toBeNull();
        expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
      });

      it('Module : Album cherché, puis Module choisi, puis « Aucun module », chacun enregistré', async () => {
        await servir(CARTE);
        expect(champ('Module de cet album')).toBeUndefined();

        const album = entree('Album du module');
        album.focus();
        album.value = 'roule';
        album.dispatchEvent(new Event('input'));
        await attendreFrappe();
        await stabiliser();
        serveur
          .expectOne('/api/albums?recherche=roule&taille=20')
          .flush({ elements: [ROULE_GALETTE], total: 1 });
        await stabiliser();
        document.querySelector<HTMLElement>('.cdk-overlay-pane mat-option')!.click();
        await stabiliser();
        serveur.expectOne(URL_MODULES).flush([
          { ...MODULE_1, albumId: ROULE_GALETTE.id, ordre: 1 },
          { ...MODULE_2, albumId: ROULE_GALETTE.id, ordre: 2 },
        ]);
        await stabiliser();

        await choisirOption('Module de cet album', 'Module 2');
        const requete = serveur.expectOne(URL_CLASSEMENT);
        expect(requete.request.body).toEqual({
          sections: [],
          moduleId: MODULE_2.id,
          themeIds: [],
        });
        requete.flush({
          ...CARTE,
          module: { ...MODULE_2, albumId: ROULE_GALETTE.id, titreAlbum: 'Roule galette' },
        });
        await stabiliser();
        expect(champs()).toContain('Module : Module 2 · Roule galette');

        await choisirOption('Module de cet album', 'Aucun module');
        const retrait = serveur.expectOne(URL_CLASSEMENT);
        expect(retrait.request.body).toEqual({ sections: [], moduleId: null, themeIds: [] });
        retrait.flush(CARTE);
        await stabiliser();
        expect(champs()).toContain('Module : —');
      });

      it('image d’album sans Module : la recherche part de l’Album d’origine', async () => {
        await servir({
          ...CARTE,
          typeImage: 'image_album',
          licence: 'usage_pedagogique_album',
          albumOrigine: { id: ROULE_GALETTE.id, titre: 'Roule galette', auteur: 'Natha Caputo' },
        });

        expect(entree('Album du module').value).toBe('Roule galette');
        champ('Module de cet album')!
          .querySelector<HTMLElement>('.mat-mdc-select-trigger')!
          .click();
        await stabiliser();
        serveur
          .expectOne(URL_MODULES)
          .flush([{ ...MODULE_1, albumId: ROULE_GALETTE.id, ordre: 1 }]);
        await stabiliser();
        expect(options()).toEqual(['Aucun module', 'Module 1']);
      });

      it('échec de la lecture des Modules : Bandeau propre, « Réessayer » les relit et les propose', async () => {
        await servir({
          ...CARTE,
          typeImage: 'image_album',
          licence: 'usage_pedagogique_album',
          albumOrigine: { id: ROULE_GALETTE.id, titre: 'Roule galette', auteur: 'Natha Caputo' },
        });
        champ('Module de cet album')!
          .querySelector<HTMLElement>('.mat-mdc-select-trigger')!
          .click();
        await stabiliser();
        serveur.expectOne(URL_MODULES).error(new ProgressEvent('error'));
        await stabiliser();

        const bandeauModules = racine.querySelector('.carte-identite__erreur-modules')!;
        expect(bandeauModules.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
          MESSAGE_RESEAU,
        );
        [...bandeauModules.querySelectorAll<HTMLButtonElement>('button')]
          .find((bouton) => bouton.textContent?.trim() === 'Réessayer')!
          .click();
        await stabiliser();
        serveur
          .expectOne(URL_MODULES)
          .flush([{ ...MODULE_1, albumId: ROULE_GALETTE.id, ordre: 1 }]);
        await stabiliser();

        expect(racine.querySelector('.carte-identite__erreur-modules')).toBeNull();
        champ('Module de cet album')!
          .querySelector<HTMLElement>('.mat-mdc-select-trigger')!
          .click();
        await stabiliser();
        expect(options()).toEqual(['Aucun module', 'Module 1']);
      });

      it('Échap dans la liste ouverte des Thèmes la ferme sans fermer le panneau', async () => {
        await servir(CARTE);
        let fermetures = 0;
        fixture.componentInstance.fermer.subscribe(() => fermetures++);

        await taperTheme('anim');
        expect(saisieThemes().getAttribute('aria-expanded')).toBe('true');
        saisieThemes().dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }),
        );
        await stabiliser();

        expect(fermetures).toBe(0);
      });

      it('Thème choisi dans le Champ à étiquettes : enregistré aussitôt', async () => {
        await servir({ ...CARTE, themes: [FORET] });

        await taperTheme('anim');
        expect(options()).toEqual(['animaux', 'Créer le thème « anim »']);
        await choisirProposition('animaux');

        const requete = serveur.expectOne(URL_CLASSEMENT);
        expect(requete.request.body).toEqual({
          sections: [],
          moduleId: null,
          themeIds: [FORET.id, ANIMAUX.id],
        });
        requete.flush({ ...CARTE, themes: [ANIMAUX, FORET] });
        await stabiliser();
      });

      it('« Créer le thème « automne » » : le Thème est créé pour l’école puis enregistré sur l’Image', async () => {
        await servir(CARTE);
        const automne = { id: '0190f0a0-0000-7000-8000-00000000f003', nom: 'automne' };

        await taperTheme('automne');
        await choisirProposition('Créer le thème « automne »');
        const creation = serveur.expectOne('/api/themes');
        expect(creation.request.method).toBe('POST');
        expect(creation.request.body).toEqual({ nom: 'automne' });
        creation.flush({ ...automne, createurId: MOI });
        await stabiliser();

        const requete = serveur.expectOne(URL_CLASSEMENT);
        expect(requete.request.body).toEqual({
          sections: [],
          moduleId: null,
          themeIds: [automne.id],
        });
        requete.flush({ ...CARTE, themes: [automne] });
        await stabiliser();
        expect(
          [...racine.querySelectorAll('mat-chip-row')].map((p) =>
            p.querySelector('.mdc-evolution-chip__text-label')?.textContent?.trim(),
          ),
        ).toEqual(['automne']);
      });
    });
  });
});
