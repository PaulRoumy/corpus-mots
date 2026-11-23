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
import { provideRouter, Router } from '@angular/router';
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
});
