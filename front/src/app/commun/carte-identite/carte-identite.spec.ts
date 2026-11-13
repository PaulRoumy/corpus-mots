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
import { CarteIdentite, CONFIRMATION_IMAGE_ALBUM } from './carte-identite';

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
};

const ROULE_GALETTE: AlbumDto = {
  id: '0190f0a0-0000-7000-8000-00000000a001',
  titre: 'Roule galette',
  auteur: 'Natha Caputo',
  createurId: MOI,
  nombreModules: 0,
};

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

    it('type, source, licence et auteur en champs Material ; les autres champs restent en lecture', async () => {
      await servir(CARTE);

      expect(champs()).toEqual([
        'Mot : citrouille',
        'Sens : légume',
        'Catégorie : nom',
        'Sections : —',
        'Module : —',
        'Thèmes : —',
        'Propriétaire : Claire (vous)',
      ]);
      expect(
        [...racine.querySelectorAll('mat-form-field mat-label')].map((l) => l.textContent?.trim()),
      ).toEqual(["Type d'image", 'Source', 'Licence', 'Auteur']);
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
  });
});
