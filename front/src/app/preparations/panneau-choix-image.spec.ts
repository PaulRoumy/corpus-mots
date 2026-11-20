import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { DetectionImageDto } from '../api/models/detection-image-dto';
import { DetectionMotDto } from '../api/models/detection-mot-dto';
import { MotPreparationDto } from '../api/models/mot-preparation-dto';
import { CompteCourant } from '../commun/compte-courant';
import { MESSAGE_RESEAU } from '../commun/erreurs/message-erreur';
import { provideIcones } from '../commun/icones';
import {
  MESSAGE_AUCUNE_IMAGE,
  MESSAGE_IMAGE_INDISPONIBLE,
  MESSAGE_SENS_INDISPONIBLE,
  PanneauChoixImage,
} from './panneau-choix-image';

const PAUL = '0190f0a0-0000-7000-8000-000000000891';
const ZOE = '0190f0a0-0000-7000-8000-000000000892';
const FRUIT = { id: 's1', libelle: 'fruit', categorie: 'nom', aCompleter: false };
const METIER = { id: 's2', libelle: 'métier', categorie: 'nom', aCompleter: false };

function image(id: string, modifications: Partial<DetectionImageDto> = {}): DetectionImageDto {
  return {
    id,
    proprietaireId: PAUL,
    etat: 'privee',
    aRemplacer: null,
    reutilisable: true,
    typeImage: 'image_libre',
    aCompleter: false,
    sections: ['ms'],
    albumOrigine: null,
    sens: FRUIT,
    dejaUtilisee: false,
    ...modifications,
  };
}

const AVOCAT: MotPreparationDto = {
  id: 'mp1',
  motId: 'm1',
  forme: 'avocat',
  ordre: 1,
  sens: { id: 's1', libelle: 'fruit', categorie: 'nom' },
  illustre: true,
  image: {
    id: 'i1',
    proprietaireId: PAUL,
    etat: 'privee',
    aRemplacer: null,
    reutilisable: true,
    typeImage: 'image_libre',
    aCompleter: false,
  },
};

/** « avocat » : son Image actuelle (fruit), une Image de Zoé versée (métier, déjà utilisée), une autre de Paul. */
const PROPOSITIONS: DetectionMotDto = {
  motId: 'm1',
  forme: 'avocat',
  dejaDansLaPreparation: true,
  sens: [FRUIT, METIER],
  albums: [],
  images: [
    image('i2', {
      proprietaireId: ZOE,
      etat: 'versee',
      sens: METIER,
      dejaUtilisee: true,
      sections: ['ms', 'gs'],
      typeImage: 'image_album',
      albumOrigine: { id: 'a1', titre: 'La petite poule rousse' },
    }),
    image('i1'),
    image('i3'),
  ],
};

const URL_PROPOSITIONS = '/api/preparations/p1/mots/mp1/propositions';
const URL_IMAGE = '/api/preparations/p1/mots/mp1/image';
const URL_SENS = '/api/preparations/p1/mots/mp1/sens';
const A_COMPLETER = { id: 's0', libelle: 'à compléter', categorie: null, aCompleter: true };

/** Lecture des propositions du Mot de Préparation `motId`, quel que soit le filtre `sensId`. */
const lecture =
  (motId = 'mp1') =>
  (requete: HttpRequest<unknown>) =>
    requete.url === `/api/preparations/p1/mots/${motId}/propositions`;

describe('PanneauChoixImage', () => {
  let fixture: ComponentFixture<PanneauChoixImage>;
  let racine: HTMLElement;
  let serveur: HttpTestingController;
  const original = { creer: URL.createObjectURL, revoquer: URL.revokeObjectURL };

  const tour = () => new Promise((fin) => setTimeout(fin));
  async function stabiliser() {
    await tour();
    await fixture.whenStable();
    await tour();
  }
  const texte = (selecteur: string) =>
    racine.querySelector(selecteur)?.textContent?.replace(/\s+/g, ' ').trim();
  const liste = () => racine.querySelector<HTMLElement>('[role="listbox"]')!;
  const options = () => [...racine.querySelectorAll<HTMLElement>('[role="option"]')];
  const touche = (key: string) =>
    liste().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

  async function ouvrir(propositions: DetectionMotDto = PROPOSITIONS, mot = AVOCAT) {
    fixture.componentRef.setInput('mot', mot);
    await stabiliser();
    serveur.expectOne(lecture()).flush(propositions);
    await stabiliser();
    serveur.match('/api/enseignants');
  }

  beforeEach(async () => {
    URL.createObjectURL = vi.fn(() => 'blob:http://localhost/1');
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
    TestBed.inject(CompteCourant).mettreAJour({
      id: PAUL,
      nomAffiche: 'Paul',
      email: 'paul@ecole.fr',
      administrateur: false,
    });
    fixture = TestBed.createComponent(PanneauChoixImage);
    fixture.componentRef.setInput('preparationId', 'p1');
    racine = fixture.nativeElement as HTMLElement;
    document.body.appendChild(racine);
  });

  afterEach(() => {
    serveur.match((requete) => requete.url.endsWith('/fichier'));
    serveur.verify();
    racine.remove();
    URL.createObjectURL = original.creer;
    URL.revokeObjectURL = original.revoquer;
  });

  it('région nommée « Choisir une image » : Mot en cursive, Sens, Image actuelle, Repère de qualité', async () => {
    await ouvrir();

    const panneau = racine.querySelector('aside')!;
    expect(
      racine.querySelector(`[id="${panneau.getAttribute('aria-labelledby')}"]`)?.textContent,
    ).toBe('Choisir une image');
    expect(texte('.choix-image__forme')).toBe('avocat');
    expect(texte('.choix-image__champ-sens mat-label')).toBe('Sens');
    expect(texte('.choix-image__libelle')).toBe('Image actuelle');
    expect(texte('.choix-image__carte-identite')).toBe("Carte d'identité");
    expect(texte('.choix-image__repere')).toBe('simple, claire, peu de détails');
    expect(texte('.choix-image__ajouter')).toBe('Ajouter une image');
  });

  it('Images de tous les Sens, dans l’ordre du back, au rendu de la détection ; l’actuelle porte « actuelle »', async () => {
    await ouvrir();

    expect(liste().getAttribute('aria-label')).toBe('Images proposées pour « avocat »');
    expect(options().map((option) => option.id)).toEqual([
      'choix-image-i2',
      'choix-image-i1',
      'choix-image-i3',
    ]);
    const [zoe, actuelle] = options();
    // Plusieurs Sens : chaque vignette montre le sien.
    expect(zoe.querySelector('.vignette__sens')?.textContent).toBe('métier');
    expect(zoe.querySelector('.vignette__marque')?.textContent?.trim()).toBe('déjà utilisée');
    expect(zoe.querySelectorAll('app-repere-section')).toHaveLength(2);
    expect(zoe.querySelector('app-badge-type-image')).not.toBeNull();
    expect(zoe.getAttribute('aria-label')).toBe(
      "avocat, métier (nom), —, déjà utilisée, MS GS, image d'album, album La petite poule rousse",
    );
    expect(actuelle.querySelector('.vignette__actuelle')?.textContent).toBe('actuelle');
    expect(actuelle.getAttribute('aria-label')).toBe(
      'avocat, fruit (nom), vous, actuelle, MS, image libre',
    );
    expect(options().every((option) => option.getAttribute('aria-selected') === 'false')).toBe(
      true,
    );
  });

  it('↓ ↑ déplacent le choix sans boucler, Début et Fin vont aux extrémités', async () => {
    await ouvrir();

    touche('ArrowUp');
    await stabiliser();
    expect(liste().getAttribute('aria-activedescendant')).toBeNull();
    touche('ArrowDown');
    touche('ArrowDown');
    await stabiliser();
    expect(liste().getAttribute('aria-activedescendant')).toBe('choix-image-i1');
    expect(options()[1].querySelector('.vignette__coche')).not.toBeNull();
    touche('End');
    touche('ArrowDown');
    await stabiliser();
    expect(liste().getAttribute('aria-activedescendant')).toBe('choix-image-i3');
    touche('Home');
    touche('ArrowUp');
    await stabiliser();
    expect(liste().getAttribute('aria-activedescendant')).toBe('choix-image-i2');
  });

  it('Entrée retient l’Image active : le Mot renvoyé est émis', async () => {
    await ouvrir();
    const choisis: MotPreparationDto[] = [];
    fixture.componentInstance.choisi.subscribe((mot) => choisis.push(mot));

    touche('ArrowDown');
    touche('Enter');
    await stabiliser();
    const requete = serveur.expectOne(URL_IMAGE);
    expect(requete.request.method).toBe('PUT');
    expect(requete.request.body).toEqual({ imageId: 'i2' });
    const change = { ...AVOCAT, sens: { id: 's2', libelle: 'métier', categorie: 'nom' } };
    requete.flush(change);
    await stabiliser();

    expect(choisis).toEqual([change]);
  });

  it('Image passée entre-temps à un autre Mot : traitée comme indisponible, la liste est relue', async () => {
    await ouvrir();

    options()[2].click();
    await stabiliser();
    serveur
      .expectOne(URL_IMAGE)
      .flush(
        { status: 400, code: 'preparation.sens_invalide' },
        { status: 400, statusText: 'Bad Request' },
      );
    await stabiliser();

    expect(texte('.choix-image__message')).toBe(MESSAGE_IMAGE_INDISPONIBLE);
    expect(racine.querySelector('.choix-image__message')?.getAttribute('role')).toBe('alert');
    serveur.expectOne(lecture()).flush({ ...PROPOSITIONS, images: [image('i1')] });
    await stabiliser();
    expect(options()).toHaveLength(1);
    expect(document.activeElement).toBe(liste());
  });

  it('passé à un autre Mot pendant un envoi : la réponse de l’ancien est ignorée, le nouveau reste utilisable', async () => {
    await ouvrir();
    const choisis: MotPreparationDto[] = [];
    fixture.componentInstance.choisi.subscribe((mot) => choisis.push(mot));
    options()[0].click();
    await stabiliser();
    const ancienne = serveur.expectOne(URL_IMAGE);

    const AUTRE: MotPreparationDto = { ...AVOCAT, id: 'mp2', forme: 'avoine', image: null };
    fixture.componentRef.setInput('mot', AUTRE);
    await stabiliser();
    serveur
      .expectOne(lecture('mp2'))
      .flush({ ...PROPOSITIONS, forme: 'avoine', images: [image('i9')] });
    await stabiliser();
    ancienne.flush(
      { status: 404, code: 'image.indisponible' },
      { status: 404, statusText: 'Not Found' },
    );
    await stabiliser();

    expect(racine.querySelector('.choix-image__message')).toBeNull();
    serveur.expectNone(lecture('mp2'));
    options()[0].click();
    await stabiliser();
    const nouvelle = serveur.expectOne('/api/preparations/p1/mots/mp2/image');
    expect(nouvelle.request.body).toEqual({ imageId: 'i9' });
    nouvelle.flush({ ...AUTRE, illustre: true });
    await stabiliser();
    expect(choisis.map((mot) => mot.id)).toEqual(['mp2']);
  });

  it('passé à un autre Mot pendant un envoi réussi : le Mot de l’ancien n’est pas émis', async () => {
    await ouvrir();
    const choisis: MotPreparationDto[] = [];
    fixture.componentInstance.choisi.subscribe((mot) => choisis.push(mot));
    options()[0].click();
    await stabiliser();
    const ancienne = serveur.expectOne(URL_IMAGE);

    fixture.componentRef.setInput('mot', { ...AVOCAT, id: 'mp2', forme: 'avoine', image: null });
    await stabiliser();
    serveur.expectOne(lecture('mp2')).flush(PROPOSITIONS);
    await stabiliser();
    ancienne.flush(AVOCAT);
    await stabiliser();

    expect(choisis).toEqual([]);
  });

  it('aucune Image : « Aucune image pour ce mot. », sans liste', async () => {
    await ouvrir({ ...PROPOSITIONS, images: [] }, { ...AVOCAT, illustre: false, image: null });

    expect(texte('.choix-image__vide')).toBe(MESSAGE_AUCUNE_IMAGE);
    expect(racine.querySelector('[role="listbox"]')).toBeNull();
    expect(racine.querySelector('.choix-image__actuelle')).toBeNull();
  });

  it('« Carte d’identité », « Ajouter une image », « Fermer » et Échap émettent sans requête', async () => {
    await ouvrir();
    const evenements: string[] = [];
    fixture.componentInstance.ouvrirCarteIdentite.subscribe(() => evenements.push('carte'));
    fixture.componentInstance.ajouterImage.subscribe((bouton) =>
      evenements.push(`ajouter:${bouton.textContent?.trim()}`),
    );
    fixture.componentInstance.fermer.subscribe(() => evenements.push('fermer'));

    racine.querySelector<HTMLButtonElement>('.choix-image__carte-identite')!.click();
    racine.querySelector<HTMLButtonElement>('.choix-image__ajouter')!.click();
    racine.querySelector<HTMLButtonElement>('button[aria-label="Fermer"]')!.click();
    touche('Escape');

    expect(evenements).toEqual(['carte', 'ajouter:Ajouter une image', 'fermer', 'fermer']);
  });

  it('échec de lecture : message dans le panneau', async () => {
    fixture.componentRef.setInput('mot', AVOCAT);
    await stabiliser();
    serveur.expectOne(lecture()).error(new ProgressEvent('error'));
    await stabiliser();

    expect(texte('.choix-image__message')).toBe(MESSAGE_RESEAU);
    expect(racine.querySelector('[role="listbox"]')).toBeNull();
  });

  describe('Sens (story 2.8)', () => {
    const declencheurSens = () =>
      racine.querySelector<HTMLElement>('.choix-image__champ-sens .mat-mdc-select-trigger')!;
    const valeurSens = () => texte('.choix-image__champ-sens .mat-mdc-select-value');
    const optionsSens = () => [
      ...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option'),
    ];
    async function ouvrirSens() {
      declencheurSens().click();
      await stabiliser();
    }
    async function choisirSens(libelle: string) {
      await ouvrirSens();
      optionsSens()
        .find((option) => option.textContent?.replace(/\s+/g, ' ').trim() === libelle)!
        .click();
      await stabiliser();
    }
    const AVOCAT_METIER: MotPreparationDto = {
      ...AVOCAT,
      sens: { id: 's2', libelle: 'métier', categorie: 'nom' },
      illustre: false,
      image: null,
    };

    it('ouverture : le champ est sur le Sens retenu et la liste se limite à ses Images', async () => {
      fixture.componentRef.setInput('mot', AVOCAT);
      await stabiliser();
      const requete = serveur.expectOne(lecture());
      expect(requete.request.params.get('sensId')).toBe('s1');
      requete.flush({ ...PROPOSITIONS, images: [image('i1'), image('i3')] });
      await stabiliser();
      serveur.match('/api/enseignants');

      expect(racine.querySelector('mat-select')).not.toBeNull();
      expect(valeurSens()).toBe('fruit (nom)');
      expect(options()).toHaveLength(2);
      await ouvrirSens();
      // « Tous les sens » n'est proposé que pour un Sens retenu « à compléter ».
      expect(optionsSens().map((option) => option.textContent?.trim())).toEqual([
        'fruit (nom)',
        'métier (nom)',
      ]);
      optionsSens()[0].click();
      await stabiliser();
    });

    it('Sens retenu « à compléter » : champ sur « Tous les sens », toutes les Images, « à compléter » en dernier', async () => {
      const aCompleter: MotPreparationDto = {
        ...AVOCAT,
        sens: { id: 's0', libelle: 'à compléter' },
        illustre: false,
        image: null,
      };
      fixture.componentRef.setInput('mot', aCompleter);
      await stabiliser();
      const requete = serveur.expectOne(lecture());
      expect(requete.request.params.has('sensId')).toBe(false);
      requete.flush({ ...PROPOSITIONS, sens: [FRUIT, METIER, A_COMPLETER] });
      await stabiliser();
      serveur.match('/api/enseignants');

      expect(valeurSens()).toBe('Tous les sens');
      expect(options()).toHaveLength(3);
      await ouvrirSens();
      const libelles = optionsSens().map((option) =>
        option.textContent?.replace(/\s+/g, ' ').trim(),
      );
      expect(libelles).toEqual(['Tous les sens', 'fruit (nom)', 'métier (nom)', 'à compléter']);
      // « à compléter » est mis en avant par une icône et son libellé, pas par la couleur seule.
      expect(optionsSens()[3].querySelector('.choix-image__a-completer mat-icon')).not.toBeNull();
      optionsSens()[0].click();
      await stabiliser();
      serveur.expectNone(URL_SENS);
    });

    it('changer : enregistré aussitôt, Mot émis, liste relue pour ce Sens, panneau ouvert, focus sur le champ', async () => {
      await ouvrir();
      const changes: MotPreparationDto[] = [];
      const choisis: MotPreparationDto[] = [];
      let fermetures = 0;
      fixture.componentInstance.sensChange.subscribe((mot) => changes.push(mot));
      fixture.componentInstance.choisi.subscribe((mot) => choisis.push(mot));
      fixture.componentInstance.fermer.subscribe(() => fermetures++);

      await choisirSens('métier (nom)');
      const requete = serveur.expectOne(URL_SENS);
      expect(requete.request.method).toBe('PUT');
      expect(requete.request.body).toEqual({ sensId: 's2' });
      expect(racine.querySelector('mat-select')?.getAttribute('aria-disabled')).toBe('true');
      requete.flush(AVOCAT_METIER);
      await stabiliser();

      expect(changes).toEqual([AVOCAT_METIER]);
      fixture.componentRef.setInput('mot', AVOCAT_METIER);
      await stabiliser();
      const relecture = serveur.expectOne(lecture());
      expect(relecture.request.params.get('sensId')).toBe('s2');
      relecture.flush({ ...PROPOSITIONS, images: [PROPOSITIONS.images[0]] });
      await stabiliser();

      expect(valeurSens()).toBe('métier (nom)');
      expect(options()).toHaveLength(1);
      expect(racine.querySelector('mat-select')?.getAttribute('aria-disabled')).toBe('false');
      expect(racine.querySelector('mat-select')?.contains(document.activeElement)).toBe(true);
      expect(choisis).toEqual([]);
      expect(fermetures).toBe(0);
    });

    it('après un Sens changé, choisir une Image la lie avec ce Sens', async () => {
      await ouvrir();
      const choisis: MotPreparationDto[] = [];
      fixture.componentInstance.choisi.subscribe((mot) => choisis.push(mot));
      await choisirSens('métier (nom)');
      serveur.expectOne(URL_SENS).flush(AVOCAT_METIER);
      await stabiliser();
      fixture.componentRef.setInput('mot', AVOCAT_METIER);
      await stabiliser();
      serveur.expectOne(lecture()).flush({ ...PROPOSITIONS, images: [PROPOSITIONS.images[0]] });
      await stabiliser();
      serveur.match('/api/enseignants');

      options()[0].click();
      await stabiliser();
      const requete = serveur.expectOne(URL_IMAGE);
      expect(requete.request.body).toEqual({ imageId: 'i2' });
      const lie = { ...AVOCAT_METIER, illustre: true, image: AVOCAT.image };
      requete.flush(lie);
      await stabiliser();
      expect(choisis).toEqual([lie]);
    });

    it('choisir le Sens déjà retenu n’enregistre rien', async () => {
      await ouvrir();

      await choisirSens('fruit (nom)');

      serveur.expectNone(URL_SENS);
      serveur.expectNone(lecture());
      expect(valeurSens()).toBe('fruit (nom)');
    });

    it('un seul Sens : texte en lecture, sans champ', async () => {
      await ouvrir({ ...PROPOSITIONS, sens: [FRUIT], images: [image('i1')] });

      expect(racine.querySelector('mat-select')).toBeNull();
      expect(texte('.choix-image__sens')).toBe('Sens : fruit (nom)');
    });

    it('échec : le champ revient au Sens précédent, message dans le panneau', async () => {
      await ouvrir();
      const changes: MotPreparationDto[] = [];
      fixture.componentInstance.sensChange.subscribe((mot) => changes.push(mot));

      await choisirSens('métier (nom)');
      serveur.expectOne(URL_SENS).error(new ProgressEvent('error'));
      await stabiliser();

      expect(valeurSens()).toBe('fruit (nom)');
      expect(texte('.choix-image__message')).toBe(MESSAGE_RESEAU);
      expect(racine.querySelector('.choix-image__message')?.getAttribute('role')).toBe('alert');
      expect(racine.querySelector('mat-select')?.getAttribute('aria-disabled')).toBe('false');
      expect(changes).toEqual([]);
      serveur.expectNone(lecture());
    });

    it('Sens qui n’est plus proposé : message dédié, champ revenu, liste relue pour le Sens précédent', async () => {
      await ouvrir();
      const changes: MotPreparationDto[] = [];
      fixture.componentInstance.sensChange.subscribe((mot) => changes.push(mot));

      await choisirSens('métier (nom)');
      serveur
        .expectOne(URL_SENS)
        .flush(
          { status: 400, code: 'preparation.sens_invalide' },
          { status: 400, statusText: 'Bad Request' },
        );
      await stabiliser();

      expect(texte('.choix-image__message')).toBe(MESSAGE_SENS_INDISPONIBLE);
      expect(valeurSens()).toBe('fruit (nom)');
      const relectures = serveur.match(lecture());
      expect(relectures).toHaveLength(1);
      expect(relectures[0].request.params.get('sensId')).toBe('s1');
      relectures[0].flush({ ...PROPOSITIONS, sens: [FRUIT] });
      await stabiliser();
      expect(changes).toEqual([]);
    });

    it('« à compléter » puis « Tous les sens » limitent seulement la liste, sans enregistrement', async () => {
      const aCompleter: MotPreparationDto = {
        ...AVOCAT,
        sens: { id: 's0', libelle: 'à compléter' },
        illustre: false,
        image: null,
      };
      const avecACompleter = { ...PROPOSITIONS, sens: [FRUIT, METIER, A_COMPLETER] };
      fixture.componentRef.setInput('mot', aCompleter);
      await stabiliser();
      serveur.expectOne(lecture()).flush(avecACompleter);
      await stabiliser();
      serveur.match('/api/enseignants');

      await choisirSens('à compléter');
      serveur.expectNone(URL_SENS);
      const limitee = serveur.match(lecture());
      expect(limitee).toHaveLength(1);
      expect(limitee[0].request.params.get('sensId')).toBe('s0');
      limitee[0].flush({ ...avecACompleter, images: [] });
      await stabiliser();

      await choisirSens('Tous les sens');
      serveur.expectNone(URL_SENS);
      const toutes = serveur.match(lecture());
      expect(toutes).toHaveLength(1);
      expect(toutes[0].request.params.has('sensId')).toBe(false);
      toutes[0].flush(avecACompleter);
      await stabiliser();
      expect(valeurSens()).toBe('Tous les sens');
    });

    it('pendant le choix d’une Image, le champ Sens est désactivé', async () => {
      await ouvrir();

      options()[0].click();
      await stabiliser();
      const requete = serveur.expectOne(URL_IMAGE);
      expect(racine.querySelector('mat-select')?.getAttribute('aria-disabled')).toBe('true');
      requete.flush(
        { status: 404, code: 'image.indisponible' },
        { status: 404, statusText: 'Not Found' },
      );
      await stabiliser();
      serveur.expectOne(lecture()).flush(PROPOSITIONS);
      await stabiliser();
      expect(racine.querySelector('mat-select')?.getAttribute('aria-disabled')).toBe('false');
    });

    it('pendant l’enregistrement du Sens, la liste est occupée et ses Images ne se choisissent pas', async () => {
      await ouvrir();

      await choisirSens('métier (nom)');
      const requete = serveur.expectOne(URL_SENS);
      expect(liste().getAttribute('aria-busy')).toBe('true');
      options()[0].click();
      await stabiliser();
      serveur.expectNone(URL_IMAGE);
      requete.flush(AVOCAT_METIER);
      await stabiliser();
      serveur.match(lecture());
    });

    it('passé à un autre Mot pendant l’enregistrement réussi : le Mot est émis, le panneau courant reste intact', async () => {
      await ouvrir();
      const changes: MotPreparationDto[] = [];
      fixture.componentInstance.sensChange.subscribe((mot) => changes.push(mot));
      await choisirSens('métier (nom)');
      const ancienne = serveur.expectOne(URL_SENS);

      const AUTRE: MotPreparationDto = { ...AVOCAT, id: 'mp2', forme: 'avoine', image: null };
      fixture.componentRef.setInput('mot', AUTRE);
      await stabiliser();
      serveur.expectOne(lecture('mp2')).flush({ ...PROPOSITIONS, forme: 'avoine' });
      await stabiliser();
      ancienne.flush(AVOCAT_METIER);
      await stabiliser();

      expect(changes).toEqual([AVOCAT_METIER]);
      serveur.expectNone(lecture());
      serveur.expectNone(lecture('mp2'));
      expect(valeurSens()).toBe('fruit (nom)');
      expect(racine.querySelector('mat-select')?.getAttribute('aria-disabled')).toBe('false');
    });
  });
});
