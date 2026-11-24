import { LiveAnnouncer } from '@angular/cdk/a11y';
import { BreakpointObserver } from '@angular/cdk/layout';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { convertToParamMap, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BehaviorSubject, map } from 'rxjs';
import { CarteIdentiteImageDto } from '../api/models/carte-identite-image-dto';
import { EnseignantDto } from '../api/models/enseignant-dto';
import { MonCompteDto } from '../api/models/mon-compte-dto';
import { ImageBanqueDto } from '../api/models/image-banque-dto';
import { Annuaire, EtatAnnuaire } from '../commun/annuaire';
import { CompteCourant } from '../commun/compte-courant';
import { provideIcones } from '../commun/icones';
import { AjouterImage } from '../preparations/ajouter-image';
import { Banque, libelleImages, provenanceDeLUrl } from './banque';
import { MESSAGE_RESEAU } from '../commun/erreurs/message-erreur';
import { MESSAGE_PRECISER_ALBUM } from './barre-filtres';
import { filtresDeLUrl } from './filtres-banque';

const MOI = '0190f0a0-0000-7000-8000-00000000e001';
const SOPHIE = '0190f0a0-0000-7000-8000-00000000e002';
const PARTIE = '0190f0a0-0000-7000-8000-00000000e003';

const ENSEIGNANTS: EnseignantDto[] = [
  { id: MOI, nomAffiche: 'Paul', statut: 'actif' },
  { id: SOPHIE, nomAffiche: 'Sophie', statut: 'actif' },
];

const SENS_LOUP = '0190f0a0-0000-7000-8000-0000000d0001';
const SENS_RENARD = '0190f0a0-0000-7000-8000-0000000d0002';

let compteur = 0;

/** Image de la Banque ; identifiant unique à chaque appel. */
function image(modifications: Partial<ImageBanqueDto> = {}): ImageBanqueDto {
  compteur++;
  return {
    id: `0190f0a0-0000-7000-8000-${String(compteur).padStart(12, '0')}`,
    proprietaireId: MOI,
    etat: 'privee',
    aRemplacer: null,
    reutilisable: true,
    versee: false,
    typeImage: 'image_libre',
    sections: ['gs'],
    motId: '0190f0a0-0000-7000-8000-0000000e0001',
    forme: 'loup',
    sensId: SENS_LOUP,
    sensLibelle: 'animal',
    categorie: 'nom',
    ...modifications,
  };
}

/** Carte d'identité de l'Image `image`, lue ou renvoyée par un enregistrement. */
function carteDe(
  image: ImageBanqueDto,
  modifications: Partial<CarteIdentiteImageDto> = {},
): CarteIdentiteImageDto {
  return {
    id: image.id,
    proprietaireId: image.proprietaireId,
    etat: image.etat,
    aRemplacer: null,
    reutilisable: true,
    typeImage: image.typeImage,
    aCompleter: false,
    motId: image.motId,
    forme: image.forme,
    sens: {
      id: image.sensId,
      libelle: image.sensLibelle,
      categorie: image.categorie ?? null,
      aCompleter: false,
    },
    albumOrigine: null,
    licence: 'cc0_domaine_public',
    source: 'site web',
    auteur: null,
    sections: image.sections,
    module: null,
    themes: [],
    sensModifiable: false,
    ...modifications,
  };
}

function images(nombre: number, modifications: Partial<ImageBanqueDto> = {}): ImageBanqueDto[] {
  return Array.from({ length: nombre }, () => image(modifications));
}

describe('provenanceDeLUrl et libelleImages', () => {
  it.each([
    [null, 'mes-mots'],
    ['mes-mots', 'mes-mots'],
    ['banque', 'banque'],
    ['tout', 'tout'],
    ['autre', 'mes-mots'],
    ['', 'mes-mots'],
  ])('%s → %s', (valeur, attendue) => {
    expect(provenanceDeLUrl(valeur)).toBe(attendue);
  });

  it('accorde « image »', () => {
    expect(libelleImages(0)).toBe('0 image');
    expect(libelleImages(1)).toBe('1 image');
    expect(libelleImages(84)).toBe('84 images');
  });
});

describe('filtresDeLUrl', () => {
  const ID = '0190f0a0-0000-7000-8000-0000000a0001';

  it('lit chaque filtre valide, nommé comme le paramètre de l’API', () => {
    expect(
      filtresDeLUrl(
        convertToParamMap({
          provenance: 'tout',
          mot: '  la Citrouille ',
          sensId: ID,
          section: 'gs',
          albumId: ID,
          moduleId: ID,
          themeId: ID,
          categorie: 'verbe',
          typeImage: 'photo_personnelle',
          proprietaireId: ID,
        }),
      ),
    ).toEqual({
      mot: 'la Citrouille',
      sensId: ID,
      section: 'gs',
      albumId: ID,
      moduleId: ID,
      themeId: ID,
      categorie: 'verbe',
      typeImage: 'photo_personnelle',
      proprietaireId: ID,
    });
  });

  it('ignore les valeurs invalides, répétées, un Mot vide ou trop long et un Module sans Album', () => {
    expect(
      filtresDeLUrl(
        convertToParamMap({
          mot: '   ',
          sensId: '1-2-3-4-5',
          section: 'cp',
          albumId: 'abc',
          moduleId: ID,
          themeId: [ID, ID],
          categorie: 'Verbe',
          typeImage: 'dessin',
          proprietaireId: '',
        }),
      ),
    ).toEqual({});
    expect(filtresDeLUrl(convertToParamMap({ mot: 'a'.repeat(101) }))).toEqual({});
    expect(filtresDeLUrl(convertToParamMap({ themeId: ID.toUpperCase() }))).toEqual({
      themeId: ID,
    });
    expect(filtresDeLUrl(convertToParamMap({ mot: 'a'.repeat(100) }))).toEqual({
      mot: 'a'.repeat(100),
    });
  });
});

describe('Banque', () => {
  let serveur: HttpTestingController;
  let harnais: RouterTestingHarness;
  let racine: HTMLElement;
  const etatAnnuaire = signal<EtatAnnuaire>({ statut: 'charge', enseignants: ENSEIGNANTS });
  const imagesAjoutees = signal(0);
  const compte = signal<MonCompteDto | null>(null);
  const announce = vi.fn(() => Promise.resolve());
  const petitEcran = new BehaviorSubject(false);
  const ouvrir = vi.fn(() => Promise.resolve(undefined));
  const original = { creer: URL.createObjectURL, revoquer: URL.revokeObjectURL };

  const tour = () => new Promise((fin) => setTimeout(fin));

  async function stabiliser() {
    await tour();
    await harnais.fixture.whenStable();
    await tour();
  }

  beforeEach(() => {
    compteur = 0;
    petitEcran.next(false);
    ouvrir.mockClear();
    announce.mockClear();
    compte.set({ id: MOI, nomAffiche: 'Paul', email: 'paul@ecole.fr', administrateur: false });
    imagesAjoutees.set(0);
    etatAnnuaire.set({ statut: 'charge', enseignants: ENSEIGNANTS });
    URL.createObjectURL = vi.fn(() => 'blob:http://localhost/miniature');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'banque', component: Banque }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideIcones(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
        {
          provide: Annuaire,
          useValue: {
            charger: () => Promise.resolve(),
            etat: etatAnnuaire,
            enseignant: (id: string) => {
              const etat = etatAnnuaire();
              return etat.statut === 'charge'
                ? (etat.enseignants.find((enseignant) => enseignant.id === id) ?? null)
                : null;
            },
          },
        },
        {
          provide: CompteCourant,
          useValue: {
            charger: () => Promise.resolve(),
            compte,
          },
        },
        { provide: AjouterImage, useValue: { ouvrir, imagesAjoutees } },
        { provide: LiveAnnouncer, useValue: { announce } },
        {
          provide: BreakpointObserver,
          useValue: {
            observe: () => petitEcran.pipe(map((matches) => ({ matches, breakpoints: {} }))),
          },
        },
      ],
    });
    serveur = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((surcouche) => surcouche.remove());
    servirMiniatures();
    serveur.verify();
    URL.createObjectURL = original.creer;
    URL.revokeObjectURL = original.revoquer;
  });

  async function ouvrirPage(url = '/banque') {
    harnais = await RouterTestingHarness.create();
    await harnais.navigateByUrl(url);
    racine = harnais.routeNativeElement!;
    await stabiliser();
  }

  const texte = (element: Element | null | undefined) =>
    element?.textContent?.replace(/\s+/g, ' ').trim();
  const requeteImages = (provenance: string, page = 0) =>
    serveur.expectOne(
      (requete) =>
        requete.url === '/api/images' &&
        requete.params.get('provenance') === provenance &&
        requete.params.get('page') === String(page) &&
        requete.params.get('taille') === '100',
    );

  async function servir(
    requete: TestRequest,
    elements: ImageBanqueDto[],
    total: number = elements.length,
  ) {
    requete.flush({ elements, total });
    await stabiliser();
    servirMiniatures();
    await stabiliser();
  }

  function servirMiniatures() {
    serveur
      .match((requete) => requete.url.endsWith('/fichier'))
      .forEach((requete) => requete.flush(new Blob([new Uint8Array([1])], { type: 'image/png' })));
  }

  const vignettes = () => [...racine.querySelectorAll('app-vignette-banque')];
  const entetes = () => [...racine.querySelectorAll('.groupe__entete')].map((h) => texte(h));
  const puce = (libelle: string) =>
    [...racine.querySelectorAll<HTMLElement>('mat-chip-option')].find(
      (option) => texte(option) === libelle,
    )!;
  const puceChoisie = () =>
    [...racine.querySelectorAll<HTMLElement>('mat-chip-option.mat-mdc-chip-selected')].map((o) =>
      texte(o),
    );
  async function choisir(libelle: string) {
    puce(libelle).querySelector<HTMLElement>('.mdc-evolution-chip__action--primary')!.click();
    await stabiliser();
  }
  const bouton = (libelle: string) =>
    [...racine.querySelectorAll<HTMLButtonElement>('button')].find((b) => texte(b) === libelle);
  const bandeau = () => texte(racine.querySelector('app-bandeau-erreur [role="alert"]'));

  it('s’ouvre sur Mes mots : grille groupée par Mot et Sens, Badges, « versée » et « vous »', async () => {
    await ouvrirPage();
    expect(racine.querySelector('app-squelette .squelette--vignette')).not.toBeNull();
    expect(puceChoisie()).toEqual(['Mes mots']);

    await servir(requeteImages('mes-mots'), [
      image({ versee: true, sections: ['ms', 'gs'] }),
      image({ typeImage: 'image_album' }),
      image({
        forme: 'renard',
        sensId: SENS_RENARD,
        sensLibelle: 'animal',
        typeImage: 'inconnu',
        sections: [],
      }),
    ]);

    expect(racine.querySelector('app-squelette')).toBeNull();
    expect(texte(racine.querySelector('h1'))).toBe('Banque');
    expect(texte(racine.querySelector('.banque__total'))).toBe('3 images');
    expect(entetes()).toEqual(['loup (animal) nom · 2 images', 'renard (animal) nom · 1 image']);
    expect(vignettes()).toHaveLength(3);
    const premiere = vignettes()[0];
    expect(texte(premiere.querySelector('.vignette__meta'))).toBe(
      'Section MS Section GS Type : image libre versée',
    );
    expect(texte(premiere.querySelector('.vignette__proprietaire'))).toBe('Propriétaire : vous');
    expect(texte(vignettes()[1].querySelector('.vignette__meta'))).toBe(
      "Section GS Type : image d'album",
    );
    expect(premiere.querySelector('img')?.getAttribute('alt')).toBe('loup, animal');
    expect(premiere.querySelector('img')?.getAttribute('src')).toBe(
      'blob:http://localhost/miniature',
    );
    expect(bouton('Afficher plus')).toBeUndefined();
  });

  it('la miniature est demandée en taille miniature', async () => {
    await ouvrirPage();
    const seule = image();
    requeteImages('mes-mots').flush({ elements: [seule], total: 1 });
    await stabiliser();

    const fichier = serveur.expectOne(`/api/images/${seule.id}/fichier?taille=miniature`);
    fichier.flush(new Blob([new Uint8Array([1])], { type: 'image/png' }));
    await stabiliser();
  });

  it('« Banque de l’école » : l’URL suit, la liste repart, propriétaires résolus ou « ancien compte »', async () => {
    await ouvrirPage();
    await servir(requeteImages('mes-mots'), [image()]);

    await choisir("Banque de l'école");

    expect(TestBed.inject(Router).url).toBe('/banque?provenance=banque');
    expect(puceChoisie()).toEqual(["Banque de l'école"]);
    expect(vignettes()).toHaveLength(0);
    await servir(requeteImages('banque'), [
      image({ proprietaireId: SOPHIE, etat: 'versee', versee: true }),
      image({ proprietaireId: PARTIE, etat: 'versee', versee: true }),
    ]);

    expect(vignettes().map((v) => texte(v.querySelector('.vignette__proprietaire')))).toEqual([
      'Propriétaire : Sophie',
      'Propriétaire : ancien compte',
    ]);
  });

  it('un clic sur la Puce déjà choisie la laisse choisie, sans nouvelle requête', async () => {
    await ouvrirPage();
    await servir(requeteImages('mes-mots'), [image()]);

    await choisir('Mes mots');

    expect(puceChoisie()).toEqual(['Mes mots']);
    expect(vignettes()).toHaveLength(1);
  });

  it('?provenance=tout ouvre Tout ; une provenance inconnue vaut Mes mots', async () => {
    await ouvrirPage('/banque?provenance=tout');
    expect(puceChoisie()).toEqual(['Tout']);
    await servir(requeteImages('tout'), [image()]);

    await harnais.navigateByUrl('/banque?provenance=autre');
    await stabiliser();

    expect(puceChoisie()).toEqual(['Mes mots']);
    await servir(requeteImages('mes-mots'), [image()]);
  });

  it('230 Images : 100, « Afficher plus » → 200, puis 230 ; un Sens à cheval reste un seul groupe', async () => {
    await ouvrirPage();
    await servir(requeteImages('mes-mots'), images(100), 230);
    expect(vignettes()).toHaveLength(100);
    expect(texte(racine.querySelector('.banque__total'))).toBe('230 images');

    bouton('Afficher plus')!.focus();
    bouton('Afficher plus')!.click();
    await stabiliser();
    expect(racine.querySelector('.banque__squelette-suite')).not.toBeNull();
    // Le bouton reste en place, occupé : le focus ne tombe pas sur la page, un second clic ne relit rien.
    expect(document.activeElement).toBe(bouton('Afficher plus'));
    expect(bouton('Afficher plus')!.getAttribute('aria-disabled')).toBe('true');
    expect(bouton('Afficher plus')!.getAttribute('aria-busy')).toBe('true');
    bouton('Afficher plus')!.click();
    await stabiliser();
    await servir(
      requeteImages('mes-mots', 1),
      [...images(50), ...images(50, { forme: 'renard', sensId: SENS_RENARD })],
      230,
    );
    expect(vignettes()).toHaveLength(200);
    expect(announce).toHaveBeenLastCalledWith('100 images de plus.', 'polite');
    expect(bouton('Afficher plus')!.getAttribute('aria-busy')).toBe('false');
    expect(entetes()).toEqual([
      'loup (animal) nom · 150 images',
      'renard (animal) nom · 50 images',
    ]);

    bouton('Afficher plus')!.click();
    await stabiliser();
    await servir(
      requeteImages('mes-mots', 2),
      images(30, { forme: 'renard', sensId: SENS_RENARD }),
      230,
    );

    expect(vignettes()).toHaveLength(230);
    expect(announce).toHaveBeenLastCalledWith('30 images de plus.', 'polite');
    expect(entetes()).toEqual([
      'loup (animal) nom · 150 images',
      'renard (animal) nom · 80 images',
    ]);
    expect(bouton('Afficher plus')).toBeUndefined();
  });

  it('échec d’« Afficher plus » : Bandeau d’erreur, Images gardées, « Réessayer » relit la même page', async () => {
    await ouvrirPage();
    await servir(requeteImages('mes-mots'), images(100), 150);

    bouton('Afficher plus')!.click();
    await stabiliser();
    requeteImages('mes-mots', 1).flush(null, { status: 503, statusText: 'Service Unavailable' });
    await stabiliser();

    expect(bandeau()).toBeTruthy();
    expect(vignettes()).toHaveLength(100);
    expect(bouton('Afficher plus')).toBeDefined();

    bouton('Réessayer')!.click();
    await stabiliser();
    await servir(requeteImages('mes-mots', 1), images(50), 150);

    expect(bandeau()).toBeUndefined();
    expect(vignettes()).toHaveLength(150);
  });

  it('échec de la première page : Bandeau d’erreur, « Réessayer » relit', async () => {
    await ouvrirPage();
    requeteImages('mes-mots').flush(null, { status: 0, statusText: 'Unknown Error' });
    await stabiliser();

    expect(bandeau()).toBeTruthy();
    expect(racine.querySelector('app-squelette')).toBeNull();

    bouton('Réessayer')!.click();
    await stabiliser();
    await servir(requeteImages('mes-mots'), [image()]);

    expect(bandeau()).toBeUndefined();
    expect(vignettes()).toHaveLength(1);
  });

  it('échec de la première page, Bandeau fermé : « Réessayer » reste à portée', async () => {
    await ouvrirPage();
    requeteImages('mes-mots').flush(null, { status: 0, statusText: 'Unknown Error' });
    await stabiliser();

    racine
      .querySelector<HTMLButtonElement>('app-bandeau-erreur button[aria-label="Fermer"]')!
      .click();
    await stabiliser();

    expect(bandeau()).toBeUndefined();
    bouton('Réessayer')!.click();
    await stabiliser();
    await servir(requeteImages('mes-mots'), [image()]);

    expect(vignettes()).toHaveLength(1);
    expect(bouton('Réessayer')).toBeUndefined();
  });

  it('une page qui répète une Image déjà chargée ne l’affiche qu’une fois', async () => {
    await ouvrirPage();
    const premieres = images(100);
    await servir(requeteImages('mes-mots'), premieres, 150);

    bouton('Afficher plus')!.click();
    await stabiliser();
    await servir(requeteImages('mes-mots', 1), [premieres[99], ...images(49)], 150);

    expect(vignettes()).toHaveLength(149);
    expect(announce).toHaveBeenLastCalledWith('49 images de plus.', 'polite');
  });

  it('une page incomplète malgré un total plus grand : « Afficher plus » masqué, total des Images chargées', async () => {
    await ouvrirPage();
    await servir(requeteImages('mes-mots'), images(100), 250);

    bouton('Afficher plus')!.click();
    await stabiliser();
    await servir(requeteImages('mes-mots', 1), images(20), 250);

    expect(vignettes()).toHaveLength(120);
    expect(bouton('Afficher plus')).toBeUndefined();
    expect(texte(racine.querySelector('.banque__total'))).toBe('120 images');
  });

  it('l’en-tête ne compte jamais moins d’Images que la grille', async () => {
    await ouvrirPage();
    await servir(requeteImages('mes-mots'), images(100), 90);

    expect(texte(racine.querySelector('.banque__total'))).toBe('100 images');
  });

  it('changement rapide : la réponse de la provenance quittée n’écrit rien', async () => {
    await ouvrirPage();
    const mesMots = requeteImages('mes-mots');

    await choisir('Tout');
    const tout = requeteImages('tout');
    await servir(tout, [image({ forme: 'renard', sensId: SENS_RENARD })]);
    await servir(mesMots, images(3));

    expect(vignettes()).toHaveLength(1);
    expect(entetes()).toEqual(['renard (animal) nom · 1 image']);
    expect(texte(racine.querySelector('.banque__total'))).toBe('1 image');
  });

  it('Mes mots vide : « Ajouter une image » ouvre le dialogue ; une Image enregistrée recharge la Banque', async () => {
    await ouvrirPage();
    await servir(requeteImages('mes-mots'), []);

    expect(texte(racine.querySelector('app-etat-vide .etat-vide__phrase'))).toBe(
      'Aucune image dans Mes mots.',
    );
    bouton('Ajouter une image')!.click();
    expect(ouvrir).toHaveBeenCalledWith(bouton('Ajouter une image'));

    imagesAjoutees.set(1);
    await stabiliser();
    await servir(requeteImages('mes-mots'), [image()]);

    expect(racine.querySelector('app-etat-vide')).toBeNull();
    expect(vignettes()).toHaveLength(1);
  });

  it('Image enregistrée sur Tout : la liste repart de la première page', async () => {
    await ouvrirPage('/banque?provenance=tout');
    await servir(requeteImages('tout'), [image()]);

    imagesAjoutees.set(1);
    await stabiliser();

    await servir(requeteImages('tout'), images(2));
    expect(vignettes()).toHaveLength(2);
  });

  it('Image enregistrée sur la Banque de l’école : rien n’est relu, elle n’y paraît pas', async () => {
    await ouvrirPage('/banque?provenance=banque');
    await servir(requeteImages('banque'), [image({ versee: true })]);

    imagesAjoutees.set(1);
    await stabiliser();

    serveur.expectNone((requete) => requete.url === '/api/images');
    expect(vignettes()).toHaveLength(1);
  });

  it.each([
    ['banque', "Banque de l'école"],
    ['tout', 'Tout'],
  ])('%s vide : « Aucune image. », sans action', async (provenance) => {
    await ouvrirPage(`/banque?provenance=${provenance}`);
    await servir(requeteImages(provenance), []);

    expect(texte(racine.querySelector('app-etat-vide'))).toBe('Aucune image.');
    expect(racine.querySelector('app-etat-vide button')).toBeNull();
  });

  it('compte pas encore chargé : aucun propriétaire affiché, plutôt que son nom au lieu de « vous »', async () => {
    compte.set(null);
    await ouvrirPage();
    await servir(requeteImages('mes-mots'), [image()]);

    expect(vignettes()[0].querySelector('.vignette__proprietaire')).toBeNull();

    compte.set({ id: MOI, nomAffiche: 'Paul', email: 'paul@ecole.fr', administrateur: false });
    await stabiliser();
    expect(texte(vignettes()[0].querySelector('.vignette__proprietaire'))).toBe(
      'Propriétaire : vous',
    );
  });

  it('annuaire pas encore chargé : propriétaire vide plutôt que « ancien compte »', async () => {
    etatAnnuaire.set({ statut: 'chargement' });
    await ouvrirPage('/banque?provenance=banque');
    await servir(requeteImages('banque'), [image({ proprietaireId: SOPHIE, versee: true })]);

    expect(vignettes()[0].querySelector('.vignette__proprietaire')).toBeNull();
  });

  describe('Carte d’identité', () => {
    const boutonVignette = (index: number) =>
      vignettes()[index].querySelector<HTMLButtonElement>('button.vignette')!;
    const panneau = () => racine.querySelector<HTMLElement>('app-carte-identite aside');
    const meta = (index: number) => texte(vignettes()[index].querySelector('.vignette__meta'));
    const ouvertes = () =>
      vignettes().map((v) => v.querySelector('button')!.getAttribute('aria-expanded'));
    const fermer = async () => {
      panneau()!.querySelector<HTMLButtonElement>('button[aria-label="Fermer"]')!.click();
      await stabiliser();
    };

    /** Clic sur la vignette `index` ; la Carte de `image` est lue puis servie. */
    async function ouvrirCarte(index: number, image: ImageBanqueDto, carte = carteDe(image)) {
      boutonVignette(index).click();
      await stabiliser();
      serveur.expectOne(`/api/images/${image.id}`).flush(carte);
      await stabiliser();
      servirMiniatures();
      await stabiliser();
    }

    async function choisirOption(libelle: string) {
      [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option')]
        .find((option) => texte(option) === libelle)!
        .click();
      await stabiliser();
    }

    async function choisirType(libelle: string) {
      panneau()!
        .querySelector<HTMLElement>('.carte-identite__type .mat-mdc-select-trigger')!
        .click();
      await stabiliser();
      await choisirOption(libelle);
    }

    it('la vignette est un bouton nommé « Carte d’identité de « forme » », Badges et propriétaire en description', async () => {
      await ouvrirPage();
      await servir(requeteImages('mes-mots'), [image({ versee: true })]);

      const vignette = boutonVignette(0);
      expect(vignette.getAttribute('type')).toBe('button');
      expect(vignette.getAttribute('aria-label')).toBe("Carte d'identité de « loup » (animal)");
      expect(vignette.getAttribute('aria-expanded')).toBe('false');
      expect(vignette.hasAttribute('aria-controls')).toBe(false);
      const description = document.getElementById(vignette.getAttribute('aria-describedby')!);
      expect(texte(description)).toBe('Section GS Type : image libre versée Propriétaire : vous');
    });

    it('sa propre Image : panneau à droite, grille visible, champs modifiables, vignette ouverte', async () => {
      await ouvrirPage();
      const [loup, renard] = [image(), image({ forme: 'renard', sensId: SENS_RENARD })];
      await servir(requeteImages('mes-mots'), [loup, renard]);
      expect(panneau()).toBeNull();

      await ouvrirCarte(0, loup);

      const disposition = racine.querySelector('.disposition')!.classList;
      expect(disposition).toContain('disposition--panneau');
      expect(disposition).not.toContain('disposition--plein-ecran');
      expect(racine.querySelector('.page')?.hasAttribute('inert')).toBe(false);
      expect(vignettes()).toHaveLength(2);
      expect(ouvertes()).toEqual(['true', 'false']);
      expect(boutonVignette(0).classList).toContain('vignette--ouverte');
      const controle = boutonVignette(0).getAttribute('aria-controls')!;
      expect(document.getElementById(controle)).toBe(racine.querySelector('app-carte-identite'));
      expect(boutonVignette(1).hasAttribute('aria-controls')).toBe(false);
      expect(panneau()!.querySelector('mat-select.carte-identite__type')).not.toBeNull();
      expect(panneau()!.querySelector('.carte-identite__lecture-seule')).toBeNull();
      expect(document.activeElement).toBe(panneau());
    });

    it('l’Image versée d’un collègue : panneau en lecture seule, propriétaire affiché', async () => {
      await ouvrirPage('/banque?provenance=banque');
      const deSophie = image({ proprietaireId: SOPHIE, etat: 'versee', versee: true });
      await servir(requeteImages('banque'), [deSophie]);

      await ouvrirCarte(0, deSophie);

      expect(texte(panneau()!.querySelector('.carte-identite__lecture-seule'))).toBe(
        'lecture seule',
      );
      expect(texte(panneau()!.querySelector('.carte-identite__proprietaire'))).toBe('Sophie');
      expect(panneau()!.querySelector('mat-select')).toBeNull();
    });

    it('clavier : la vignette atteinte par Tab s’active (bouton natif), le focus passe au panneau', async () => {
      await ouvrirPage();
      const loup = image();
      await servir(requeteImages('mes-mots'), [loup]);

      boutonVignette(0).focus();
      expect(document.activeElement).toBe(boutonVignette(0));
      await ouvrirCarte(0, loup);

      expect(document.activeElement).toBe(panneau());
    });

    it('une autre vignette remplace l’Image ; la même ne relit rien et rend le focus au panneau', async () => {
      await ouvrirPage();
      const [loup, renard] = [image(), image({ forme: 'renard', sensId: SENS_RENARD })];
      await servir(requeteImages('mes-mots'), [loup, renard]);
      await ouvrirCarte(0, loup);

      await ouvrirCarte(1, renard);

      expect(racine.querySelectorAll('app-carte-identite')).toHaveLength(1);
      expect(ouvertes()).toEqual(['false', 'true']);
      expect(panneau()!.querySelector('.carte-identite__vignette img')?.getAttribute('alt')).toBe(
        'renard, animal',
      );

      boutonVignette(1).focus();
      boutonVignette(1).click();
      await stabiliser();

      serveur.expectNone(`/api/images/${renard.id}`);
      expect(document.activeElement).toBe(panneau());
      expect(ouvertes()).toEqual(['false', 'true']);
    });

    it('« Fermer » ferme le panneau et rend le focus à la vignette', async () => {
      await ouvrirPage();
      const loup = image();
      await servir(requeteImages('mes-mots'), [loup]);
      await ouvrirCarte(0, loup);

      await fermer();

      expect(panneau()).toBeNull();
      expect(racine.querySelector('.disposition')?.classList).not.toContain('disposition--panneau');
      expect(ouvertes()).toEqual(['false']);
      expect(document.activeElement).toBe(boutonVignette(0));
    });

    it('Échap ferme le panneau et rend le focus à la vignette', async () => {
      await ouvrirPage();
      const loup = image();
      await servir(requeteImages('mes-mots'), [loup]);
      await ouvrirCarte(0, loup);

      panneau()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await stabiliser();

      expect(panneau()).toBeNull();
      expect(document.activeElement).toBe(boutonVignette(0));
    });

    it('vignette plus affichée à la fermeture : le focus va au titre « Banque »', async () => {
      await ouvrirPage();
      const loup = image();
      await servir(requeteImages('mes-mots'), [loup]);
      await ouvrirCarte(0, loup);
      // Une Image ajoutée recharge Mes mots : la vignette disparaît le temps de la lecture.
      imagesAjoutees.set(1);
      await stabiliser();
      expect(vignettes()).toHaveLength(0);
      expect(panneau()).not.toBeNull();

      await servir(requeteImages('mes-mots'), [image()]);

      expect(panneau()).toBeNull();
      expect(announce).toHaveBeenLastCalledWith("L'image n'est plus dans la liste.", 'polite');
      expect(document.activeElement).toBe(racine.querySelector('h1'));
    });

    it('liste rechargée avec l’Image ouverte : le panneau reste ouvert', async () => {
      await ouvrirPage();
      const loup = image();
      await servir(requeteImages('mes-mots'), [loup]);
      await ouvrirCarte(0, loup);

      imagesAjoutees.set(1);
      await stabiliser();
      await servir(requeteImages('mes-mots'), [loup, image()]);

      expect(panneau()).not.toBeNull();
      expect(ouvertes()).toEqual(['true', 'false']);
    });

    it('retour arrière du navigateur, focus dans le panneau : panneau fermé, focus au titre', async () => {
      await ouvrirPage();
      const loup = image();
      await servir(requeteImages('mes-mots'), [loup]);
      await ouvrirCarte(0, loup);
      expect(document.activeElement).toBe(panneau());

      await harnais.navigateByUrl('/banque?provenance=tout');
      await stabiliser();

      expect(racine.querySelector('app-carte-identite')).toBeNull();
      expect(document.activeElement).toBe(racine.querySelector('h1'));
      await servir(requeteImages('tout'), [loup]);
    });

    it('passage sous 600 px, panneau ouvert, focus dans la page : le focus passe au panneau', async () => {
      await ouvrirPage();
      const loup = image();
      await servir(requeteImages('mes-mots'), [loup]);
      await ouvrirCarte(0, loup);
      boutonVignette(0).focus();

      petitEcran.next(true);
      await stabiliser();

      expect(racine.querySelector('.page')?.hasAttribute('inert')).toBe(true);
      expect(document.activeElement).toBe(panneau());
    });

    it('la Carte enregistrée reporte l’état et le libellé du Sens sur les Images chargées de ce Sens', async () => {
      await ouvrirPage();
      const loup = image();
      await servir(requeteImages('mes-mots'), [loup, image()]);
      await ouvrirCarte(0, loup);

      await choisirType('photo personnelle');
      serveur.expectOne(`/api/images/${loup.id}/description`).flush(
        carteDe(loup, {
          etat: 'versee',
          typeImage: 'photo_personnelle',
          licence: 'droits_auteur_enseignant',
          sens: { id: SENS_LOUP, libelle: 'canidé', categorie: 'nom', aCompleter: false },
        }),
      );
      await stabiliser();

      expect(meta(0)).toBe('Section GS Type : photo personnelle versée');
      expect(entetes()).toEqual(['loup (canidé) nom · 2 images']);
      expect(boutonVignette(1).getAttribute('aria-label')).toBe(
        "Carte d'identité de « loup » (canidé)",
      );
    });

    it('« Verser » dans la Carte : la vignette prend le badge « versée »', async () => {
      await ouvrirPage();
      const loup = image();
      await servir(requeteImages('mes-mots'), [loup, image()]);
      await ouvrirCarte(0, loup, carteDe(loup, { versabilite: 'versable' }));
      expect(meta(0)).toBe('Section GS Type : image libre');

      panneau()!.querySelector<HTMLButtonElement>('app-versement-image button')!.click();
      await stabiliser();
      serveur
        .expectOne(`/api/images/${loup.id}/versement`)
        .flush(carteDe(loup, { etat: 'versee', versabilite: null }));
      await stabiliser();

      expect(meta(0)).toBe('Section GS Type : image libre versée');
      expect(meta(1)).toBe('Section GS Type : image libre');
      expect(panneau()!.querySelector('.versement__message')?.textContent?.trim()).toBe(
        "L'image reste la vôtre. Les collègues peuvent l'utiliser, personne ne peut la modifier.",
      );
    });

    it('le propriétaire change le type puis les Sections : la vignette suit, le total ne change pas', async () => {
      await ouvrirPage();
      const loup = image();
      await servir(requeteImages('mes-mots'), [loup, image()]);
      await ouvrirCarte(0, loup);

      await choisirType('photo personnelle');
      serveur
        .expectOne(`/api/images/${loup.id}/description`)
        .flush(
          carteDe(loup, { typeImage: 'photo_personnelle', licence: 'droits_auteur_enseignant' }),
        );
      await stabiliser();
      expect(meta(0)).toBe('Section GS Type : photo personnelle');
      expect(meta(1)).toBe('Section GS Type : image libre');

      panneau()!
        .querySelector<HTMLElement>(
          '.carte-identite__section--ms .mdc-evolution-chip__action--primary',
        )!
        .click();
      await stabiliser();
      serveur.expectOne(`/api/images/${loup.id}/classement`).flush(
        carteDe(loup, {
          typeImage: 'photo_personnelle',
          licence: 'droits_auteur_enseignant',
          sections: ['ms', 'gs'],
        }),
      );
      await stabiliser();

      expect(meta(0)).toBe('Section MS Section GS Type : photo personnelle');
      expect(texte(racine.querySelector('.banque__total'))).toBe('2 images');
      expect(panneau()).not.toBeNull();
    });

    it('échec de l’enregistrement : erreur dans le panneau, vignette inchangée', async () => {
      await ouvrirPage();
      const loup = image();
      await servir(requeteImages('mes-mots'), [loup]);
      await ouvrirCarte(0, loup);

      await choisirType('photo personnelle');
      serveur
        .expectOne(`/api/images/${loup.id}/description`)
        .flush(null, { status: 503, statusText: 'Service Unavailable' });
      await stabiliser();

      expect(panneau()!.querySelector('app-bandeau-erreur [role="alert"]')).not.toBeNull();
      expect(meta(0)).toBe('Section GS Type : image libre');
    });

    it('panneau fermé pendant l’envoi : la réponse met quand même la vignette à jour, focus inchangé', async () => {
      await ouvrirPage();
      const loup = image();
      await servir(requeteImages('mes-mots'), [loup]);
      await ouvrirCarte(0, loup);

      await choisirType('photo personnelle');
      const requete = serveur.expectOne(`/api/images/${loup.id}/description`);
      await fermer();
      expect(panneau()).toBeNull();
      expect(document.activeElement).toBe(boutonVignette(0));

      requete.flush(
        carteDe(loup, { typeImage: 'photo_personnelle', licence: 'droits_auteur_enseignant' }),
      );
      await stabiliser();

      expect(meta(0)).toBe('Section GS Type : photo personnelle');
      expect(document.activeElement).toBe(boutonVignette(0));
    });

    describe('changement de Sens', () => {
      const SENS_A_COMPLETER = '0190f0a0-0000-7000-8000-0000000d0003';
      const SENS_PREDATEUR = '0190f0a0-0000-7000-8000-0000000d0004';
      const A_COMPLETER = {
        id: SENS_A_COMPLETER,
        libelle: 'à compléter',
        categorie: null,
        aCompleter: true,
      };

      /** Le propriétaire choisit le Sens dans le panneau ; renvoie l'enregistrement en attente. */
      async function choisirSens(cible: ImageBanqueDto, sens: { id: string; libelle: string }) {
        const champ = panneau()!.querySelector<HTMLElement>('.carte-identite__sens mat-select')!;
        champ.focus();
        champ.querySelector<HTMLElement>('.mat-mdc-select-trigger')!.click();
        await stabiliser();
        serveur
          .expectOne(`/api/images/${cible.id}/sens`)
          .flush([A_COMPLETER, { ...sens, categorie: 'nom', aCompleter: false }]);
        await stabiliser();
        await choisirOption(`${sens.libelle} · nom`);
        const requete = serveur.expectOne(`/api/images/${cible.id}/sens`);
        expect(requete.request.method).toBe('PUT');
        return {
          repondre: async () => {
            requete.flush(
              carteDe(cible, {
                sensModifiable: true,
                sens: { ...sens, categorie: 'nom', aCompleter: false },
              }),
            );
            await stabiliser();
          },
        };
      }

      const aCompleter = () =>
        image({ sensId: SENS_A_COMPLETER, sensLibelle: 'à compléter', categorie: null });

      it('vers un Sens déjà affiché : la vignette rejoint ce groupe, sans groupe en double', async () => {
        await ouvrirPage();
        const cible = aCompleter();
        await servir(requeteImages('mes-mots'), [
          image(),
          image({ forme: 'renard', sensId: SENS_RENARD }),
          cible,
        ]);
        expect(entetes()).toEqual([
          'loup (animal) nom · 1 image',
          'renard (animal) nom · 1 image',
          'loup (à compléter) 1 image',
        ]);
        await ouvrirCarte(2, cible, carteDe(cible, { sensModifiable: true }));

        await (await choisirSens(cible, { id: SENS_LOUP, libelle: 'animal' })).repondre();

        expect(entetes()).toEqual([
          'loup (animal) nom · 2 images',
          'renard (animal) nom · 1 image',
        ]);
        expect(texte(racine.querySelector('.banque__total'))).toBe('3 images');
        expect(ouvertes()).toEqual(['false', 'true', 'false']);
      });

      it('vers un Sens pas encore chargé : un nouveau groupe à sa place', async () => {
        await ouvrirPage();
        const deuxieme = image();
        await servir(requeteImages('mes-mots'), [
          image(),
          deuxieme,
          image({ forme: 'renard', sensId: SENS_RENARD }),
        ]);
        await ouvrirCarte(1, deuxieme, carteDe(deuxieme, { sensModifiable: true }));

        await (
          await choisirSens(deuxieme, { id: SENS_PREDATEUR, libelle: 'prédateur' })
        ).repondre();

        expect(entetes()).toEqual([
          'loup (animal) nom · 1 image',
          'loup (prédateur) nom · 1 image',
          'renard (animal) nom · 1 image',
        ]);
      });

      it('à compléter vers un Sens pas encore chargé : la catégorie de la Carte passe dans l’en-tête', async () => {
        await ouvrirPage();
        const cible = aCompleter();
        await servir(requeteImages('mes-mots'), [
          image({ forme: 'renard', sensId: SENS_RENARD }),
          cible,
        ]);
        expect(entetes()).toEqual(['renard (animal) nom · 1 image', 'loup (à compléter) 1 image']);
        await ouvrirCarte(1, cible, carteDe(cible, { sensModifiable: true }));

        await (await choisirSens(cible, { id: SENS_PREDATEUR, libelle: 'prédateur' })).repondre();

        expect(entetes()).toEqual([
          'renard (animal) nom · 1 image',
          'loup (prédateur) nom · 1 image',
        ]);
      });

      it('panneau fermé pendant l’envoi : la vignette déplacée garde le focus', async () => {
        await ouvrirPage();
        const cible = aCompleter();
        await servir(requeteImages('mes-mots'), [
          image({ forme: 'renard', sensId: SENS_RENARD }),
          cible,
          image(),
        ]);
        await ouvrirCarte(1, cible, carteDe(cible, { sensModifiable: true }));
        const envoi = await choisirSens(cible, { id: SENS_LOUP, libelle: 'animal' });
        await fermer();
        expect(document.activeElement).toBe(boutonVignette(1));

        await envoi.repondre();

        expect(entetes()).toEqual([
          'renard (animal) nom · 1 image',
          'loup (animal) nom · 2 images',
        ]);
        expect(document.activeElement).toBe(boutonVignette(2));
      });
    });

    it('sous 600 px : panneau plein écran, page inerte ; à la fermeture, page active et focus sur la vignette', async () => {
      petitEcran.next(true);
      await ouvrirPage();
      const loup = image();
      await servir(requeteImages('mes-mots'), [loup]);
      expect(racine.querySelector('.page')?.hasAttribute('inert')).toBe(false);

      await ouvrirCarte(0, loup);

      expect(racine.querySelector('.disposition')?.classList).toContain('disposition--plein-ecran');
      expect(racine.querySelector('.page')?.hasAttribute('inert')).toBe(true);

      await fermer();

      expect(racine.querySelector('.page')?.hasAttribute('inert')).toBe(false);
      expect(document.activeElement).toBe(boutonVignette(0));
    });

    it('changement de provenance : panneau fermé, liste rechargée', async () => {
      await ouvrirPage();
      const loup = image();
      await servir(requeteImages('mes-mots'), [loup]);
      await ouvrirCarte(0, loup);

      await choisir('Tout');

      expect(racine.querySelector('app-carte-identite')).toBeNull();
      await servir(requeteImages('tout'), [loup, image({ proprietaireId: SOPHIE, versee: true })]);
      expect(vignettes()).toHaveLength(2);
      expect(ouvertes()).toEqual(['false', 'false']);
    });

    it('« Afficher plus » laisse le panneau ouvert', async () => {
      await ouvrirPage();
      const premieres = images(100);
      await servir(requeteImages('mes-mots'), premieres, 150);
      await ouvrirCarte(0, premieres[0]);

      bouton('Afficher plus')!.click();
      await stabiliser();
      await servir(requeteImages('mes-mots', 1), images(50), 150);

      expect(vignettes()).toHaveLength(150);
      expect(panneau()).not.toBeNull();
      expect(ouvertes()[0]).toBe('true');
    });
  });

  describe('filtres', () => {
    const ALBUM_LOUP = '0190f0a0-0000-7000-8000-0000000a0001';
    const ALBUM_ROUGE = '0190f0a0-0000-7000-8000-0000000a0002';
    const MODULE_1 = '0190f0a0-0000-7000-8000-0000000b0001';
    const THEME_ANIMAUX = '0190f0a0-0000-7000-8000-0000000c0001';
    const ALBUM = { auteur: 'X', createurId: MOI, nombreModules: 0 };
    const ECHEC = { status: 503, statusText: 'Service Unavailable' };
    const INTROUVABLE = { status: 404, statusText: 'Not Found' };
    const RESEAU = { status: 0, statusText: 'Unknown Error' };

    const attendre = (ms: number) => new Promise((fin) => setTimeout(fin, ms));

    /** Requête de la Banque : provenance, première page et exactement ces filtres. */
    const requeteFiltree = (provenance: string, filtres: Record<string, string> = {}, page = 0) =>
      serveur.expectOne((requete) => {
        if (requete.url !== '/api/images') {
          return false;
        }
        const attendus: Record<string, string> = {
          ...filtres,
          provenance,
          page: String(page),
          taille: '100',
        };
        const cles = requete.params.keys();
        return (
          cles.length === Object.keys(attendus).length &&
          cles.every((cle) => requete.params.get(cle) === attendus[cle])
        );
      });

    const puceFiltre = (cle: string) =>
      racine.querySelector<HTMLElement>(`app-barre-filtres [data-filtre="${cle}"]`)!;
    const libellesPuces = () =>
      [...racine.querySelectorAll('app-barre-filtres [data-filtre]')].map((p) => texte(p));
    const retirer = (nom: string) =>
      racine.querySelector<HTMLButtonElement>(
        `app-barre-filtres button[aria-label="Retirer le filtre ${nom}"]`,
      );
    const entreesMenu = () => [
      ...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane [mat-menu-item]'),
    ];
    const libellesMenu = () => entreesMenu().map((entree) => texte(entree));
    const messagesMenu = () =>
      [...document.querySelectorAll('.cdk-overlay-pane .filtres__message')].map((m) => texte(m));
    const url = () => TestBed.inject(Router).url;

    async function ouvrirMenu(cle: string) {
      puceFiltre(cle).click();
      await stabiliser();
    }

    async function choisirEntree(libelle: string) {
      entreesMenu()
        .find((entree) => texte(entree) === libelle)!
        .click();
      await stabiliser();
    }

    it('combiner : Section GS puis catégorie verbe, un paramètre par filtre, grille relue avec les deux', async () => {
      await ouvrirPage();
      await servir(requeteFiltree('mes-mots'), images(2));
      expect(libellesPuces()).toEqual([
        'Section',
        'Thème',
        'Album',
        'Module',
        'Catégorie',
        "Type d'image",
        'Propriétaire',
      ]);
      expect(bouton('Effacer les filtres')).toBeUndefined();

      await ouvrirMenu('section');
      expect(puceFiltre('section').getAttribute('aria-haspopup')).toBe('menu');
      expect(libellesMenu()).toEqual(['PS', 'MS', 'GS']);
      expect(entreesMenu().every((e) => e.getAttribute('role') === 'menuitemradio')).toBe(true);
      await choisirEntree('GS');

      expect(url()).toBe('/banque?section=gs');
      expect(document.activeElement).toBe(puceFiltre('section'));
      expect(vignettes()).toHaveLength(0);
      await servir(requeteFiltree('mes-mots', { section: 'gs' }), images(3));
      expect(announce).toHaveBeenLastCalledWith('3 images.', 'polite');

      await ouvrirMenu('categorie');
      expect(libellesMenu()).toEqual(['nom', 'verbe', 'adjectif', 'adverbe', 'autre']);
      await choisirEntree('verbe');

      expect(url()).toBe('/banque?section=gs&categorie=verbe');
      await servir(requeteFiltree('mes-mots', { section: 'gs', categorie: 'verbe' }), [image()]);
      expect(announce).toHaveBeenLastCalledWith('1 image.', 'polite');
      expect(texte(puceFiltre('section'))).toBe('Section : GS');
      expect(texte(puceFiltre('categorie'))).toBe('Catégorie : verbe');
      expect(puceFiltre('section').closest('.puce')!.classList).toContain('puce--choisie');
      expect(puceFiltre('section').querySelector('mat-icon[svgicon="coche"]')).not.toBeNull();
      expect(bouton('Effacer les filtres')).toBeDefined();

      // Le type d'image reprend les libellés de la Carte d'identité ; Échap ferme et rend le focus à la puce.
      await ouvrirMenu('typeImage');
      expect(libellesMenu()).toEqual([
        'image libre',
        'photo personnelle',
        "image d'album",
        'inconnu',
      ]);
      const echap = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      Object.defineProperty(echap, 'keyCode', { get: () => 27 });
      document.querySelector('.mat-mdc-menu-panel')!.dispatchEvent(echap);
      await stabiliser();
      expect(entreesMenu()).toHaveLength(0);
      expect(document.activeElement).toBe(puceFiltre('typeImage'));
    });

    it('retirer un filtre : paramètre retiré de l’URL, grille relue, focus sur la puce', async () => {
      await ouvrirPage('/banque?section=gs&categorie=verbe');
      await servir(requeteFiltree('mes-mots', { section: 'gs', categorie: 'verbe' }), [image()]);

      retirer('Section')!.click();
      await stabiliser();

      expect(url()).toBe('/banque?categorie=verbe');
      expect(document.activeElement).toBe(puceFiltre('section'));
      expect(retirer('Section')).toBeNull();
      expect(texte(puceFiltre('section'))).toBe('Section');
      await servir(requeteFiltree('mes-mots', { categorie: 'verbe' }), images(2));
      expect(vignettes()).toHaveLength(2);
    });

    it('Module sans Album : puce désactivée, avec l’indication', async () => {
      await ouvrirPage();
      await servir(requeteFiltree('mes-mots'), [image()]);

      const module = puceFiltre('moduleId');
      expect(module.getAttribute('aria-disabled')).toBe('true');
      expect(module.hasAttribute('aria-haspopup')).toBe(false);
      expect(texte(document.getElementById(module.getAttribute('aria-describedby')!))).toBe(
        "Choisissez d'abord un album",
      );
      module.click();
      await stabiliser();
      expect(entreesMenu()).toHaveLength(0);
    });

    it('Album changé : le Module est retiré, le titre choisi nomme la puce', async () => {
      await ouvrirPage(`/banque?albumId=${ALBUM_LOUP}&moduleId=${MODULE_1}`);
      serveur
        .expectOne(`/api/albums/${ALBUM_LOUP}`)
        .flush({ ...ALBUM, id: ALBUM_LOUP, titre: 'Le loup' });
      serveur
        .expectOne(`/api/albums/${ALBUM_LOUP}/modules`)
        .flush([{ id: MODULE_1, albumId: ALBUM_LOUP, nom: 'chapitre 1', ordre: 0 }]);
      await servir(requeteFiltree('mes-mots', { albumId: ALBUM_LOUP, moduleId: MODULE_1 }), [
        image(),
      ]);
      expect(texte(puceFiltre('albumId'))).toBe('Album : Le loup');
      expect(texte(puceFiltre('moduleId'))).toBe('Module : chapitre 1');

      await ouvrirMenu('moduleId');
      expect(libellesMenu()).toEqual(['chapitre 1']);
      expect(entreesMenu()[0].getAttribute('aria-checked')).toBe('true');
      await choisirEntree('chapitre 1');
      expect(url()).toBe(`/banque?albumId=${ALBUM_LOUP}&moduleId=${MODULE_1}`);

      await ouvrirMenu('albumId');
      const champ = document.querySelector<HTMLInputElement>('.cdk-overlay-pane input')!;
      expect(document.activeElement).toBe(champ);
      expect(messagesMenu()).toEqual(['Tapez au moins 2 caractères du titre.']);
      champ.value = 'rou';
      champ.dispatchEvent(new Event('input'));
      await attendre(300);
      await stabiliser();
      serveur
        .expectOne(
          (requete) => requete.url === '/api/albums' && requete.params.get('recherche') === 'rou',
        )
        .flush({
          elements: [{ ...ALBUM, id: ALBUM_ROUGE, titre: 'Le petit chaperon rouge' }],
          total: 1,
        });
      await stabiliser();
      // Flèche bas passe de la recherche aux résultats.
      champ.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(document.activeElement).toBe(entreesMenu()[0]);
      await choisirEntree('Le petit chaperon rouge');

      expect(url()).toBe(`/banque?albumId=${ALBUM_ROUGE}`);
      serveur.expectNone(`/api/albums/${ALBUM_ROUGE}`);
      serveur.expectOne(`/api/albums/${ALBUM_ROUGE}/modules`).flush([]);
      await servir(requeteFiltree('mes-mots', { albumId: ALBUM_ROUGE }), [image()]);
      expect(texte(puceFiltre('albumId'))).toBe('Album : Le petit chaperon rouge');
      expect(texte(puceFiltre('moduleId'))).toBe('Module');
      expect(document.activeElement).toBe(puceFiltre('albumId'));
    });

    it('retirer l’Album retire aussi le Module', async () => {
      await ouvrirPage(`/banque?albumId=${ALBUM_LOUP}&moduleId=${MODULE_1}`);
      serveur.expectOne(`/api/albums/${ALBUM_LOUP}`).flush(null, INTROUVABLE);
      serveur.expectOne(`/api/albums/${ALBUM_LOUP}/modules`).flush(null, ECHEC);
      await servir(requeteFiltree('mes-mots', { albumId: ALBUM_LOUP, moduleId: MODULE_1 }), [
        image(),
      ]);
      expect(texte(puceFiltre('moduleId'))).toBe('Module (inconnu)');

      retirer('Album')!.click();
      await stabiliser();

      expect(url()).toBe('/banque');
      await servir(requeteFiltree('mes-mots'), [image()]);
    });

    it('propriétaires : « Moi » d’abord, puis les collègues nommés par l’annuaire', async () => {
      await ouvrirPage('/banque?provenance=tout');
      await servir(requeteFiltree('tout'), [image()]);

      await ouvrirMenu('proprietaireId');
      expect(messagesMenu()).toEqual(['Chargement…']);
      serveur.expectOne('/api/images/proprietaires').flush([SOPHIE, MOI, PARTIE]);
      await stabiliser();

      expect(libellesMenu()).toEqual(['Moi', 'Sophie', 'ancien compte']);
      await choisirEntree('Sophie');

      expect(url()).toBe(`/banque?provenance=tout&proprietaireId=${SOPHIE}`);
      expect(texte(puceFiltre('proprietaireId'))).toBe('Propriétaire : Sophie');
      await servir(requeteFiltree('tout', { proprietaireId: SOPHIE }), [
        image({ proprietaireId: SOPHIE, versee: true }),
      ]);
    });

    it('propriétaires en échec : message dans le menu et « Réessayer »', async () => {
      await ouvrirPage();
      await servir(requeteFiltree('mes-mots'), [image()]);

      await ouvrirMenu('proprietaireId');
      serveur.expectOne('/api/images/proprietaires').flush(null, RESEAU);
      await stabiliser();
      expect(messagesMenu()).toEqual([MESSAGE_RESEAU]);
      expect(libellesMenu()).toEqual(['Réessayer']);

      await choisirEntree('Réessayer');
      serveur.expectOne('/api/images/proprietaires').flush([MOI]);
      await stabiliser();

      expect(libellesMenu()).toEqual(['Moi']);
    });

    it('« Filtrer sur ce sens » : ?sensId=…, puce au libellé du Sens', async () => {
      await ouvrirPage();
      await servir(requeteFiltree('mes-mots'), [
        image(),
        image({ forme: 'renard', sensId: SENS_RENARD, sensLibelle: 'goupil' }),
      ]);
      const filtrer = racine.querySelectorAll<HTMLButtonElement>('.groupe__filtrer');
      expect(filtrer).toHaveLength(2);
      expect(texte(filtrer[1])).toBe('Filtrer sur ce sens');
      expect(texte(document.getElementById(filtrer[1].getAttribute('aria-describedby')!))).toBe(
        'renard (goupil) nom · 1 image',
      );

      filtrer[1].click();
      await stabiliser();

      expect(url()).toBe(`/banque?sensId=${SENS_RENARD}`);
      expect(texte(puceFiltre('sensId'))).toBe('Sens : renard (goupil)');
      await servir(requeteFiltree('mes-mots', { sensId: SENS_RENARD }), [
        image({ forme: 'renard', sensId: SENS_RENARD, sensLibelle: 'goupil' }),
      ]);
      expect(texte(puceFiltre('sensId'))).toBe('Sens : renard (goupil)');
      expect(racine.querySelector('.groupe__filtrer')).toBeNull();

      retirer('Sens')!.click();
      await stabiliser();
      expect(url()).toBe('/banque');
      expect(document.activeElement).toBe(puceFiltre('section'));
      await servir(requeteFiltree('mes-mots'), [image()]);
    });

    it('sans résultat : « Aucune image. » et « Effacer les filtres », sans « Ajouter une image »', async () => {
      await ouvrirPage('/banque?section=gs');
      await servir(requeteFiltree('mes-mots', { section: 'gs' }), []);

      expect(texte(racine.querySelector('app-etat-vide .etat-vide__phrase'))).toBe('Aucune image.');
      expect(racine.querySelector('app-etat-vide button.banque__effacer')).not.toBeNull();
      expect(bouton('Ajouter une image')).toBeUndefined();
    });

    it('changement de filtre sans résultat : « Aucune image. » annoncé', async () => {
      await ouvrirPage();
      await servir(requeteFiltree('mes-mots'), [image()]);
      await ouvrirMenu('section');
      await choisirEntree('PS');

      await servir(requeteFiltree('mes-mots', { section: 'ps' }), []);

      expect(announce).toHaveBeenLastCalledWith('Aucune image.', 'polite');
    });

    it('« Effacer les filtres » : ne reste que la provenance, focus sur le titre', async () => {
      await ouvrirPage(`/banque?provenance=tout&section=gs&themeId=${THEME_ANIMAUX}`);
      serveur.expectOne('/api/themes').flush([{ id: THEME_ANIMAUX, nom: 'animaux' }]);
      await servir(requeteFiltree('tout', { section: 'gs', themeId: THEME_ANIMAUX }), []);

      racine.querySelector<HTMLButtonElement>('app-etat-vide button.banque__effacer')!.click();
      await stabiliser();

      expect(url()).toBe('/banque?provenance=tout');
      expect(document.activeElement).toBe(racine.querySelector('h1'));
      await servir(requeteFiltree('tout'), [image()]);
      expect(bouton('Effacer les filtres')).toBeUndefined();
    });

    it('« Effacer les filtres » de la barre, sans provenance dans l’URL', async () => {
      await ouvrirPage('/banque?typeImage=inconnu');
      await servir(requeteFiltree('mes-mots', { typeImage: 'inconnu' }), [image()]);
      expect(texte(puceFiltre('typeImage'))).toBe("Type d'image : inconnu");

      racine.querySelector<HTMLButtonElement>('app-barre-filtres .filtres__effacer')!.click();
      await stabiliser();

      expect(url()).toBe('/banque');
      expect(document.activeElement).toBe(racine.querySelector('h1'));
      await servir(requeteFiltree('mes-mots'), [image()]);
    });

    it('recherche : ?provenance=tout&mot=la%20Citrouille, puce « Mot : la Citrouille »', async () => {
      await ouvrirPage('/banque?provenance=tout&mot=la%20Citrouille');
      expect(puceChoisie()).toEqual(['Tout']);
      await servir(requeteFiltree('tout', { mot: 'la Citrouille' }), [image()]);

      expect(texte(puceFiltre('mot'))).toBe('Mot : la Citrouille');
      retirer('Mot')!.click();
      await stabiliser();

      expect(url()).toBe('/banque?provenance=tout');
      await servir(requeteFiltree('tout'), [image()]);
    });

    it('lien partagé : Album et Thème nommés après rechargement', async () => {
      await ouvrirPage(`/banque?albumId=${ALBUM_LOUP}&themeId=${THEME_ANIMAUX}`);
      expect(texte(puceFiltre('albumId'))).toBe('Album choisi');
      serveur.expectOne('/api/themes').flush([{ id: THEME_ANIMAUX, nom: 'animaux' }]);
      serveur
        .expectOne(`/api/albums/${ALBUM_LOUP}`)
        .flush({ ...ALBUM, id: ALBUM_LOUP, titre: 'Le loup' });
      serveur.expectOne(`/api/albums/${ALBUM_LOUP}/modules`).flush([]);
      await servir(requeteFiltree('mes-mots', { albumId: ALBUM_LOUP, themeId: THEME_ANIMAUX }), [
        image(),
      ]);

      expect(texte(puceFiltre('albumId'))).toBe('Album : Le loup');
      expect(texte(puceFiltre('themeId'))).toBe('Thème : animaux');
      expect(puceFiltre('moduleId').hasAttribute('aria-disabled')).toBe(false);
    });

    it('lien partagé, lecture en échec : « Album (inconnu) », « Thème (inconnu) », retirables', async () => {
      await ouvrirPage(`/banque?albumId=${ALBUM_LOUP}&themeId=${THEME_ANIMAUX}`);
      serveur.expectOne('/api/themes').flush(null, ECHEC);
      serveur.expectOne(`/api/albums/${ALBUM_LOUP}`).flush(null, INTROUVABLE);
      serveur.expectOne(`/api/albums/${ALBUM_LOUP}/modules`).flush([]);
      await servir(requeteFiltree('mes-mots', { albumId: ALBUM_LOUP, themeId: THEME_ANIMAUX }), [
        image(),
      ]);

      expect(texte(puceFiltre('albumId'))).toBe('Album (inconnu)');
      expect(texte(puceFiltre('themeId'))).toBe('Thème (inconnu)');

      retirer('Album')!.click();
      await stabiliser();
      expect(url()).toBe(`/banque?themeId=${THEME_ANIMAUX}`);
      await servir(requeteFiltree('mes-mots', { themeId: THEME_ANIMAUX }), [image()]);
    });

    it('URL invalide : filtres ignorés, non envoyés', async () => {
      await ouvrirPage(
        `/banque?section=cp&albumId=abc&typeImage=dessin&mot=%20&moduleId=${MODULE_1}`,
      );
      await servir(requeteFiltree('mes-mots'), [image()]);

      expect(racine.querySelectorAll('app-barre-filtres .puce--choisie')).toHaveLength(0);
      expect(bouton('Effacer les filtres')).toBeUndefined();
    });

    it('réponse périmée : seule la réponse des derniers filtres s’affiche', async () => {
      await ouvrirPage();
      await servir(requeteFiltree('mes-mots'), [image()]);
      await ouvrirMenu('section');
      await choisirEntree('MS');
      const ms = requeteFiltree('mes-mots', { section: 'ms' });

      await ouvrirMenu('section');
      await choisirEntree('GS');
      await servir(requeteFiltree('mes-mots', { section: 'gs' }), [
        image({ forme: 'renard', sensId: SENS_RENARD }),
      ]);
      await servir(ms, images(3));

      expect(vignettes()).toHaveLength(1);
      expect(entetes()).toEqual(['renard (animal) nom · 1 image']);
      expect(texte(racine.querySelector('.banque__total'))).toBe('1 image');
    });

    it('changement de filtre : le panneau Carte d’identité se ferme', async () => {
      await ouvrirPage();
      const loup = image();
      await servir(requeteFiltree('mes-mots'), [loup]);
      vignettes()[0].querySelector<HTMLButtonElement>('button.vignette')!.click();
      await stabiliser();
      serveur.expectOne(`/api/images/${loup.id}`).flush(carteDe(loup));
      await stabiliser();
      servirMiniatures();
      await stabiliser();
      expect(racine.querySelector('app-carte-identite')).not.toBeNull();

      await ouvrirMenu('section');
      await choisirEntree('GS');

      expect(racine.querySelector('app-carte-identite')).toBeNull();
      await servir(requeteFiltree('mes-mots', { section: 'gs' }), [loup]);
    });

    it('erreur de la route (400 requete.invalide) : Bandeau d’erreur et « Réessayer »', async () => {
      await ouvrirPage('/banque?section=gs');
      requeteFiltree('mes-mots', { section: 'gs' }).flush(
        { code: 'requete.invalide', status: 400, title: 'Bad Request' },
        { status: 400, statusText: 'Bad Request' },
      );
      await stabiliser();

      expect(bandeau()).toBeTruthy();
      bouton('Réessayer')!.click();
      await stabiliser();
      await servir(requeteFiltree('mes-mots', { section: 'gs' }), [image()]);
      expect(bandeau()).toBeUndefined();
    });
    it('« Afficher plus » filtré : la page suivante garde exactement les filtres', async () => {
      await ouvrirPage('/banque?section=gs');
      await servir(requeteFiltree('mes-mots', { section: 'gs' }), images(100), 150);

      bouton('Afficher plus')!.click();
      await stabiliser();
      await servir(requeteFiltree('mes-mots', { section: 'gs' }, 1), images(50), 150);

      expect(vignettes()).toHaveLength(150);
    });

    it('arrivée filtrée annoncée ; la provenance changée garde les filtres et annonce le nombre', async () => {
      await ouvrirPage('/banque?section=gs');
      await servir(requeteFiltree('mes-mots', { section: 'gs' }), [image()]);
      expect(announce).toHaveBeenLastCalledWith('1 image.', 'polite');

      await choisir('Tout');

      expect(url()).toBe('/banque?section=gs&provenance=tout');
      await servir(requeteFiltree('tout', { section: 'gs' }), images(2));
      expect(announce).toHaveBeenLastCalledWith('2 images.', 'polite');
    });

    it('« Réessayer » après un échec simple et le rechargement après un ajout n’annoncent rien', async () => {
      await ouvrirPage();
      requeteFiltree('mes-mots').flush(null, RESEAU);
      await stabiliser();

      bouton('Réessayer')!.click();
      await stabiliser();
      await servir(requeteFiltree('mes-mots'), [image()]);
      imagesAjoutees.set(1);
      await stabiliser();
      await servir(requeteFiltree('mes-mots'), images(2));

      expect(announce).not.toHaveBeenCalled();
    });

    it('« Réessayer » après l’échec d’un changement de filtre annonce le nombre', async () => {
      await ouvrirPage();
      await servir(requeteFiltree('mes-mots'), [image()]);
      await ouvrirMenu('section');
      await choisirEntree('GS');
      requeteFiltree('mes-mots', { section: 'gs' }).flush(null, RESEAU);
      await stabiliser();
      expect(announce).not.toHaveBeenCalled();

      bouton('Réessayer')!.click();
      await stabiliser();
      await servir(requeteFiltree('mes-mots', { section: 'gs' }), [image()]);

      expect(announce).toHaveBeenLastCalledWith('1 image.', 'polite');
    });

    it('menu Thème sans Thème dans l’URL : la liste est lue à l’ouverture, le choix pose ?themeId=', async () => {
      await ouvrirPage();
      await servir(requeteFiltree('mes-mots'), [image()]);

      await ouvrirMenu('themeId');
      expect(messagesMenu()).toEqual(['Chargement…']);
      serveur.expectOne('/api/themes').flush([{ id: THEME_ANIMAUX, nom: 'animaux' }]);
      await stabiliser();
      expect(libellesMenu()).toEqual(['animaux']);
      await choisirEntree('animaux');

      expect(url()).toBe(`/banque?themeId=${THEME_ANIMAUX}`);
      expect(texte(puceFiltre('themeId'))).toBe('Thème : animaux');
      await servir(requeteFiltree('mes-mots', { themeId: THEME_ANIMAUX }), [image()]);
    });

    it('menu Module en échec : message traduit et « Réessayer »', async () => {
      await ouvrirPage(`/banque?albumId=${ALBUM_LOUP}`);
      serveur
        .expectOne(`/api/albums/${ALBUM_LOUP}`)
        .flush({ ...ALBUM, id: ALBUM_LOUP, titre: 'Le loup' });
      serveur.expectOne(`/api/albums/${ALBUM_LOUP}/modules`).flush(null, RESEAU);
      await servir(requeteFiltree('mes-mots', { albumId: ALBUM_LOUP }), [image()]);

      await ouvrirMenu('moduleId');
      expect(messagesMenu()).toEqual([MESSAGE_RESEAU]);
      await choisirEntree('Réessayer');
      serveur
        .expectOne(`/api/albums/${ALBUM_LOUP}/modules`)
        .flush([{ id: MODULE_1, albumId: ALBUM_LOUP, nom: 'chapitre 1', ordre: 0 }]);
      await stabiliser();

      expect(libellesMenu()).toEqual(['chapitre 1']);
    });

    it('recherche d’Album : échec et « Réessayer », « Aucun album trouvé », « Précisez… », flèches', async () => {
      await ouvrirPage();
      await servir(requeteFiltree('mes-mots'), [image()]);
      await ouvrirMenu('albumId');
      const champ = document.querySelector<HTMLInputElement>('.cdk-overlay-pane input')!;
      const recherche = (texteCherche: string) =>
        serveur.expectOne(
          (requete) =>
            requete.url === '/api/albums' && requete.params.get('recherche') === texteCherche,
        );
      async function taper(texteTape: string) {
        champ.value = texteTape;
        champ.dispatchEvent(new Event('input'));
        await attendre(300);
        await stabiliser();
      }

      await taper('zz');
      recherche('zz').flush(null, RESEAU);
      await stabiliser();
      expect(messagesMenu()).toEqual([MESSAGE_RESEAU]);
      await choisirEntree('Réessayer');
      recherche('zz').flush({ elements: [], total: 0 });
      await stabiliser();
      expect(messagesMenu()).toEqual(['Aucun album trouvé']);

      await taper('le');
      recherche('le').flush({
        elements: [
          { ...ALBUM, id: ALBUM_LOUP, titre: 'Le loup' },
          { ...ALBUM, id: ALBUM_ROUGE, titre: 'Le petit chaperon rouge' },
        ],
        total: 25,
      });
      await stabiliser();
      expect(libellesMenu()).toEqual(['Le loup', 'Le petit chaperon rouge']);
      expect(messagesMenu()).toEqual([MESSAGE_PRECISER_ALBUM]);

      champ.focus();
      champ.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await stabiliser();
      expect(document.activeElement).toBe(entreesMenu()[0]);
      // Le gestionnaire de clavier du menu suit : Flèche bas passe au second résultat.
      const fleche = (cible: Element, key: string, keyCode: number) => {
        const evenement = new KeyboardEvent('keydown', { key, bubbles: true });
        Object.defineProperty(evenement, 'keyCode', { get: () => keyCode });
        cible.dispatchEvent(evenement);
      };
      fleche(entreesMenu()[0], 'ArrowDown', 40);
      await stabiliser();
      expect(document.activeElement).toBe(entreesMenu()[1]);
      fleche(entreesMenu()[1], 'ArrowUp', 38);
      await stabiliser();
      expect(document.activeElement).toBe(entreesMenu()[0]);
      fleche(entreesMenu()[0], 'ArrowUp', 38);
      expect(document.activeElement).toBe(champ);
    });

    it('URL aux filtres valides inchangés (&albumId=abc) : aucune nouvelle lecture', async () => {
      await ouvrirPage('/banque?section=gs');
      await servir(requeteFiltree('mes-mots', { section: 'gs' }), [image()]);

      await harnais.navigateByUrl('/banque?section=gs&albumId=abc');
      await stabiliser();

      serveur.expectNone((requete) => requete.url === '/api/images');
      expect(vignettes()).toHaveLength(1);
    });

    it('Sens d’un lien partagé absent de la liste : « Sens (inconnu) », retirable', async () => {
      await ouvrirPage(`/banque?sensId=${SENS_RENARD}`);
      expect(texte(puceFiltre('sensId'))).toBe('Sens choisi');
      await servir(requeteFiltree('mes-mots', { sensId: SENS_RENARD }), []);

      expect(texte(puceFiltre('sensId'))).toBe('Sens (inconnu)');
      retirer('Sens')!.click();
      await stabiliser();
      expect(url()).toBe('/banque');
      await servir(requeteFiltree('mes-mots'), [image()]);
    });

    it('le libellé du Sens filtré reste d’une lecture à l’autre, même sans résultat', async () => {
      await ouvrirPage();
      await servir(requeteFiltree('mes-mots'), [
        image({ forme: 'renard', sensId: SENS_RENARD, sensLibelle: 'goupil' }),
      ]);
      racine.querySelector<HTMLButtonElement>('.groupe__filtrer')!.click();
      await stabiliser();
      await servir(requeteFiltree('mes-mots', { sensId: SENS_RENARD }), [
        image({ forme: 'renard', sensId: SENS_RENARD, sensLibelle: 'goupil' }),
      ]);

      await ouvrirMenu('section');
      await choisirEntree('PS');
      expect(texte(puceFiltre('sensId'))).toBe('Sens : renard (goupil)');
      await servir(requeteFiltree('mes-mots', { sensId: SENS_RENARD, section: 'ps' }), []);

      expect(texte(puceFiltre('sensId'))).toBe('Sens : renard (goupil)');
    });
  });
});
