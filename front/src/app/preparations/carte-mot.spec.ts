import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetectionImageDto } from '../api/models/detection-image-dto';
import { DetectionMotDto } from '../api/models/detection-mot-dto';
import { MotPreparationDto } from '../api/models/mot-preparation-dto';
import { CompteCourant } from '../commun/compte-courant';
import { messageErreur } from '../commun/erreurs/message-erreur';
import { provideIcones } from '../commun/icones';
import { CarteMot } from './carte-mot';

describe('CarteMot', () => {
  let fixture: ComponentFixture<CarteMot>;
  let racine: HTMLElement;
  let serveur: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideIcones()],
    });
    serveur = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CarteMot);
    fixture.componentRef.setInput('preparationId', '0190f0a0-0000-7000-8000-0000000a0001');
    fixture.componentRef.setInput('mot', {
      id: '0190f0a0-0000-7000-8000-0000000f0001',
      motId: '0190f0a0-0000-7000-8000-0000000e0001',
      forme: 'citrouille',
      ordre: 1,
      sens: { id: '0190f0a0-0000-7000-8000-0000000d0001', libelle: 'à compléter' },
      illustre: false,
    });
    await fixture.whenStable();
    racine = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    // Recherche des suggestions ARASAAC et des Images existantes, vérifiées par les tests qui leur sont consacrés.
    serveur.match('/api/arasaac/suggestions?mot=citrouille');
    serveur.match((requete) => requete.url.endsWith('/propositions'));
    serveur.verify();
  });

  const boutonRetirer = () => racine.querySelector<HTMLButtonElement>('.carte-mot__retirer')!;

  it('Case de sélection : la première, nommée par le Mot ; son geste n’émet que `basculerSelection`', async () => {
    const gestes: boolean[] = [];
    let ouvertures = 0;
    fixture.componentInstance.basculerSelection.subscribe((geste) => gestes.push(geste.plage));
    fixture.componentInstance.choisirImage.subscribe(() => ouvertures++);
    const caseSelection = racine.querySelector<HTMLInputElement>('app-case-selection input')!;

    expect(racine.firstElementChild?.tagName.toLowerCase()).toBe('app-case-selection');
    expect(caseSelection.getAttribute('aria-label')).toBe('Sélectionner « citrouille »');
    caseSelection.click();
    caseSelection.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
    expect(gestes).toEqual([false, true]);
    expect(ouvertures).toBe(0);
    expect(racine.classList).not.toContain('carte-mot--selectionnee');

    fixture.componentRef.setInput('selectionnee', true);
    fixture.componentRef.setInput('selectionActive', true);
    await fixture.whenStable();
    expect(racine.classList).toContain('carte-mot--selectionnee');
    expect(racine.classList).toContain('carte-mot--selection-active');
    expect(caseSelection.checked).toBe(true);
  });

  it('Carte « à illustrer » : vignette vide, Mot en cursive, badge « à illustrer »', () => {
    expect(racine.classList).toContain('carte-mot--a-illustrer');
    expect(racine.querySelector('.carte-mot__vignette mat-icon')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
    expect(racine.querySelector('.carte-mot__mot')?.textContent?.trim()).toBe('citrouille');
    expect(racine.querySelector('.carte-mot__etat')?.textContent?.trim()).toBe('à illustrer');
  });

  it('Carte « à illustrer » : partie gauche, puis suggestions ARASAAC et « Téléverser » à droite', async () => {
    const recherche = serveur.expectOne('/api/arasaac/suggestions?mot=citrouille');
    recherche.flush([]);
    await new Promise((fin) => setTimeout(fin));
    await fixture.whenStable();

    const enfants = [...racine.children].map((enfant) => enfant.className.split(' ')[0]);
    expect(enfants.slice(-2)).toEqual(['carte-mot__gauche', 'carte-mot__droite']);
    expect(racine.querySelector('.carte-mot__gauche .carte-mot__mot')).not.toBeNull();
    expect(racine.querySelector('.carte-mot__droite .suggestions__repere')?.textContent).toBe(
      'Suggestions ARASAAC · simple, claire, peu de détails',
    );
    expect(racine.querySelector('.suggestions__message')?.textContent?.trim()).toBe(
      'Aucun pictogramme ARASAAC pour ce mot.',
    );
    // « Téléverser » sous les suggestions, y compris quand ARASAAC ne donne rien.
    const droite = [...racine.querySelector('.carte-mot__droite')!.children];
    expect(droite.at(-1)?.classList).toContain('carte-mot__televerser');
  });

  it('bouton texte « Téléverser » : nom accessible avec le Mot ; il émet `televerser`', () => {
    let ouvertures = 0;
    fixture.componentInstance.televerser.subscribe(() => ouvertures++);
    const bouton = racine.querySelector<HTMLButtonElement>('.carte-mot__televerser')!;

    expect(bouton.textContent?.trim()).toBe('Téléverser');
    expect(bouton.getAttribute('type')).toBe('button');
    expect(bouton.getAttribute('aria-label')).toBe('Téléverser une image pour « citrouille »');
    bouton.click();

    expect(ouvertures).toBe(1);
    expect(fixture.componentInstance.elementTeleverser()).toBe(bouton);
  });

  it('Carte « à illustrer » : la vignette « + » est un bouton « Choisir une image pour « citrouille » » qui émet `choisirImage`', () => {
    let ouvertures = 0;
    fixture.componentInstance.choisirImage.subscribe(() => ouvertures++);
    const bouton = racine.querySelector<HTMLButtonElement>('button.carte-mot__vignette')!;

    expect(bouton.getAttribute('type')).toBe('button');
    expect(bouton.getAttribute('aria-label')).toBe('Choisir une image pour « citrouille »');
    bouton.click();

    expect(ouvertures).toBe(1);
    expect(fixture.componentInstance.elementVignette()).toBe(bouton);
  });

  it('bouton icône « Retirer « citrouille » de la préparation » (croix), toujours visible', () => {
    expect(boutonRetirer().getAttribute('type')).toBe('button');
    expect(boutonRetirer().getAttribute('aria-label')).toBe(
      'Retirer « citrouille » de la préparation',
    );
    expect(boutonRetirer().querySelector('mat-icon[svgIcon="fermer"]')).not.toBeNull();
    expect(boutonRetirer().hidden).toBe(false);
  });

  it('« Retirer » émet `retirer` ; `focusRetirer` lui donne le focus', () => {
    let retraits = 0;
    fixture.componentInstance.retirer.subscribe(() => retraits++);

    boutonRetirer().click();
    fixture.componentInstance.focusRetirer();

    expect(retraits).toBe(1);
    expect(document.activeElement).toBe(boutonRetirer());
  });

  const boutonTheme = () => racine.querySelector<HTMLButtonElement>('.carte-mot__theme');

  it('Thèmes pas encore chargés (`theme` indéfini) : pas de bouton du Thème', () => {
    expect(boutonTheme()).toBeNull();
  });

  it('bouton texte du Thème : « cuisine », nom accessible complet ; il émet `changerTheme`', async () => {
    fixture.componentRef.setInput('theme', 'cuisine');
    await fixture.whenStable();
    let ouvertures = 0;
    fixture.componentInstance.changerTheme.subscribe(() => ouvertures++);

    expect(boutonTheme()?.textContent?.trim()).toBe('cuisine');
    expect(boutonTheme()?.getAttribute('type')).toBe('button');
    expect(boutonTheme()?.getAttribute('aria-label')).toBe('Thème de « citrouille » : cuisine');
    boutonTheme()!.click();

    expect(ouvertures).toBe(1);
    expect(fixture.componentInstance.elementTheme()).toBe(boutonTheme());
  });

  it('Mot sans thème : « Sans thème »', async () => {
    fixture.componentRef.setInput('theme', null);
    await fixture.whenStable();

    expect(boutonTheme()?.textContent?.trim()).toBe('Sans thème');
    expect(boutonTheme()?.getAttribute('aria-label')).toBe('Thème de « citrouille » : sans thème');
  });
});

describe('CarteMot illustrée', () => {
  const IMAGE = '0190f0a0-0000-7000-8000-0000000c0001';
  const MOI = '0190f0a0-0000-7000-8000-00000000e001';
  const ZOE = '0190f0a0-0000-7000-8000-00000000e002';
  const MOT_ILLUSTRE: MotPreparationDto = {
    id: '0190f0a0-0000-7000-8000-0000000f0001',
    motId: '0190f0a0-0000-7000-8000-0000000e0001',
    forme: 'citrouille',
    ordre: 1,
    sens: { id: '0190f0a0-0000-7000-8000-0000000d0001', libelle: 'légume', categorie: 'nom' },
    illustre: true,
    image: {
      id: IMAGE,
      proprietaireId: '0190f0a0-0000-7000-8000-00000000e001',
      etat: 'privee',
      aRemplacer: null,
      reutilisable: true,
      typeImage: 'image_libre',
      aCompleter: false,
    },
  };
  const original = { creer: URL.createObjectURL, revoquer: URL.revokeObjectURL };

  let fixture: ComponentFixture<CarteMot>;
  let racine: HTMLElement;
  let serveur: HttpTestingController;

  const tour = () => new Promise((fin) => setTimeout(fin));
  async function stabiliser() {
    await tour();
    await fixture.whenStable();
    await tour();
  }
  const miniature = () =>
    serveur.expectOne(
      (requete) =>
        requete.url === `/api/images/${IMAGE}/fichier` &&
        requete.params.get('taille') === 'miniature',
    );

  beforeEach(async () => {
    URL.createObjectURL = vi.fn(() => 'blob:http://localhost/miniature');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideIcones()],
    });
    serveur = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CarteMot);
    fixture.componentRef.setInput('preparationId', '0190f0a0-0000-7000-8000-0000000a0001');
    fixture.componentRef.setInput('mot', MOT_ILLUSTRE);
    racine = fixture.nativeElement as HTMLElement;
    await stabiliser();
  });

  afterEach(() => {
    serveur.verify();
    URL.createObjectURL = original.creer;
    URL.revokeObjectURL = original.revoquer;
  });

  it('une colonne : vignette en blob par `?taille=miniature`, alternative « Mot, Sens », Badge de type, Mot en cursive', async () => {
    const requete = miniature();
    expect(requete.request.responseType).toBe('blob');
    expect(requete.request.urlWithParams).not.toContain('token');
    requete.flush(new Blob(['png'], { type: 'image/png' }));
    await stabiliser();

    expect(racine.classList).not.toContain('carte-mot--a-illustrer');
    const image = racine.querySelector<HTMLImageElement>('.carte-mot__miniature')!;
    expect(image.getAttribute('src')).toBe('blob:http://localhost/miniature');
    expect(image.getAttribute('alt')).toBe('citrouille, légume');
    expect(
      racine.querySelector('app-badge-type-image')?.textContent?.replace(/\s+/g, ' ').trim(),
    ).toBe('Type : image libre');
    expect(racine.querySelector('.carte-mot__mot')?.textContent?.trim()).toBe('citrouille');
    // Ni badge « à illustrer », ni suggestions ARASAAC, ni « Téléverser ».
    expect(racine.querySelector('.carte-mot__etat')).toBeNull();
    expect(racine.querySelector('app-suggestions-arasaac')).toBeNull();
    expect(racine.querySelector('.carte-mot__televerser')).toBeNull();
    expect(racine.querySelector('.carte-mot__retirer')).not.toBeNull();
  });

  it('un changement de Thème ne recharge pas la miniature ; une autre Image, si', async () => {
    miniature().flush(new Blob(['png']));
    await stabiliser();

    fixture.componentRef.setInput('mot', {
      ...MOT_ILLUSTRE,
      themeId: '0190f0a0-0000-7000-8000-00000000c001',
    });
    await stabiliser();
    serveur.expectNone(() => true);

    const autre = '0190f0a0-0000-7000-8000-0000000c0002';
    fixture.componentRef.setInput('mot', {
      ...MOT_ILLUSTRE,
      image: { ...MOT_ILLUSTRE.image!, id: autre },
    });
    await stabiliser();
    serveur
      .expectOne((requete) => requete.url === `/api/images/${autre}/fichier`)
      .flush(new Blob(['png']));
  });

  it('miniature en échec : l’icône d’image, le bouton garde son nom et sa description', async () => {
    miniature().flush(null, { status: 404, statusText: 'Not Found' });
    await stabiliser();

    expect(racine.querySelector('.carte-mot__miniature')).toBeNull();
    expect(racine.querySelector('.carte-mot__repli')).not.toBeNull();
    expect(racine.querySelector('.carte-mot__image')?.getAttribute('aria-label')).toBe(
      "Changer l'image de « citrouille »",
    );
    const description = racine
      .querySelector('.carte-mot__image')!
      .getAttribute('aria-describedby')!;
    expect(racine.querySelector(`[id="${description}"]`)?.textContent).toBe('citrouille, légume');
  });

  it('la vignette est un bouton « Changer l’image de « citrouille » » qui émet `choisirImage`', async () => {
    miniature().flush(new Blob(['png']));
    await stabiliser();
    let ouvertures = 0;
    fixture.componentInstance.choisirImage.subscribe(() => ouvertures++);
    const bouton = racine.querySelector<HTMLButtonElement>('button.carte-mot__image')!;

    expect(bouton.getAttribute('type')).toBe('button');
    expect(bouton.getAttribute('aria-label')).toBe("Changer l'image de « citrouille »");
    // L'alternative « Mot, Sens » reste annoncée, en description du bouton.
    const description = racine.querySelector(`[id="${bouton.getAttribute('aria-describedby')}"]`);
    expect(description?.textContent).toBe('citrouille, légume');
    expect(description?.classList).toContain('cm-visuellement-masque');
    bouton.click();

    expect(ouvertures).toBe(1);
    expect(fixture.componentInstance.elementVignette()).toBe(bouton);
  });

  it('badge « versée » : sur une Image versée de l’enseignant connecté, jamais sur celle d’un collègue', async () => {
    miniature().flush(new Blob(['png'], { type: 'image/png' }));
    const versee = () => racine.querySelector('.carte-mot__versee')?.textContent?.trim();
    TestBed.inject(CompteCourant).mettreAJour({
      id: MOI,
      nomAffiche: 'Claire',
      email: 'claire@ecole.fr',
      administrateur: false,
    });
    await stabiliser();
    expect(versee()).toBeUndefined();

    fixture.componentRef.setInput('mot', {
      ...MOT_ILLUSTRE,
      image: { ...MOT_ILLUSTRE.image!, etat: 'versee' },
    });
    await stabiliser();
    expect(versee()).toBe('versée');
    expect(racine.querySelector('.carte-mot__versee mat-icon')?.getAttribute('svgicon')).toBe(
      'coche',
    );

    fixture.componentRef.setInput('mot', {
      ...MOT_ILLUSTRE,
      image: { ...MOT_ILLUSTRE.image!, etat: 'versee', proprietaireId: ZOE },
    });
    await stabiliser();
    expect(versee()).toBeUndefined();
  });
});

describe('CarteMot « à illustrer » : Images existantes (story 2.11, partie 3)', () => {
  const PREPARATION = '0190f0a0-0000-7000-8000-0000000a0001';
  const MOT_PREPARATION = '0190f0a0-0000-7000-8000-0000000f0001';
  const URL_PROPOSITIONS = `/api/preparations/${PREPARATION}/mots/${MOT_PREPARATION}/propositions`;
  const URL_IMAGE = `/api/preparations/${PREPARATION}/mots/${MOT_PREPARATION}/image`;
  const URL_SUGGESTIONS = '/api/arasaac/suggestions?mot=farine';
  const MOI = '0190f0a0-0000-7000-8000-00000000e001';
  const ZOE = '0190f0a0-0000-7000-8000-00000000e002';
  const SENS = {
    id: '0190f0a0-0000-7000-8000-0000000d0001',
    libelle: 'ingrédient',
    aCompleter: false,
  };
  const AUTRE_SENS = {
    id: '0190f0a0-0000-7000-8000-0000000d0002',
    libelle: 'poudre',
    aCompleter: false,
  };
  const MOT: MotPreparationDto = {
    id: MOT_PREPARATION,
    motId: '0190f0a0-0000-7000-8000-0000000e0001',
    forme: 'farine',
    ordre: 1,
    sens: { id: SENS.id, libelle: SENS.libelle },
    illustre: false,
  };
  const image = (numero: number, autres: Partial<DetectionImageDto> = {}): DetectionImageDto => ({
    id: `0190f0a0-0000-7000-8000-0000000c000${numero}`,
    proprietaireId: MOI,
    etat: 'privee',
    aRemplacer: null,
    reutilisable: true,
    typeImage: 'image_libre',
    aCompleter: false,
    sections: [],
    albumOrigine: null,
    sens: SENS,
    dejaUtilisee: false,
    idArasaac: null,
    ...autres,
  });
  const propositions = (images: DetectionImageDto[], sens = [SENS]): DetectionMotDto => ({
    motId: MOT.motId,
    forme: 'farine',
    formeSaisie: true,
    dejaDansLaPreparation: true,
    sens,
    albums: [],
    images,
  });
  const ILLUSTRE: MotPreparationDto = {
    ...MOT,
    illustre: true,
    image: {
      id: image(1).id,
      proprietaireId: MOI,
      etat: 'privee',
      aRemplacer: null,
      reutilisable: true,
      typeImage: 'image_libre',
      aCompleter: false,
    },
  };
  const original = { creer: URL.createObjectURL, revoquer: URL.revokeObjectURL };

  let fixture: ComponentFixture<CarteMot>;
  let racine: HTMLElement;
  let serveur: HttpTestingController;

  const tour = () => new Promise((fin) => setTimeout(fin));
  async function stabiliser() {
    await tour();
    await fixture.whenStable();
    await tour();
    await fixture.whenStable();
  }
  const vignettes = () => [
    ...racine.querySelectorAll<HTMLButtonElement>('button.carte-mot__image-existante'),
  ];

  /** Crée la Carte « à illustrer » et répond aux Images existantes, puis aux suggestions ARASAAC. */
  async function ouvrir(reponse: DetectionMotDto, suggestions: number[] = []): Promise<void> {
    fixture = TestBed.createComponent(CarteMot);
    fixture.componentRef.setInput('preparationId', PREPARATION);
    fixture.componentRef.setInput('mot', MOT);
    racine = fixture.nativeElement as HTMLElement;
    await stabiliser();
    const lecture = serveur.expectOne((requete) => requete.url === URL_PROPOSITIONS);
    expect(lecture.request.method).toBe('GET');
    // Images de tous les Sens, comme le Panneau de choix sans filtre.
    expect(lecture.request.params.has('sensId')).toBe(false);
    lecture.flush(reponse);
    serveur
      .expectOne(URL_SUGGESTIONS)
      .flush(suggestions.map((idArasaac) => ({ idArasaac, motCle: `picto ${idArasaac}` })));
    await stabiliser();
  }

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:http://localhost/miniature');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideIcones()],
    });
    serveur = TestBed.inject(HttpTestingController);
    TestBed.inject(CompteCourant).mettreAJour({
      id: MOI,
      nomAffiche: 'Claire',
      email: 'claire@ecole.fr',
      administrateur: false,
    });
  });

  afterEach(() => {
    // Miniatures, pictogrammes et Annuaire : hors du sujet de ces tests.
    serveur.match((requete) => requete.url.startsWith('/api/images/'));
    serveur.match((requete) => requete.url.startsWith('/api/arasaac/pictogrammes/'));
    serveur.match('/api/enseignants');
    serveur.verify();
    URL.createObjectURL = original.creer;
    URL.revokeObjectURL = original.revoquer;
  });

  it('Images existantes : au plus trois, dans l’ordre du back, avant les suggestions ARASAAC et « Téléverser »', async () => {
    await ouvrir(
      propositions([
        image(1, { dejaUtilisee: true }),
        image(2, { proprietaireId: ZOE, etat: 'versee' }),
        image(3),
        image(4),
      ]),
    );

    expect(vignettes().map((vignette) => vignette.querySelector('img')?.alt)).toEqual([
      'farine, ingrédient',
      'farine, ingrédient',
      'farine, ingrédient',
    ]);
    expect(
      serveur
        .match((requete) => requete.url.startsWith('/api/images/'))
        .map((requete) => requete.request.url),
    ).toEqual([1, 2, 3].map((numero) => `/api/images/${image(numero).id}/fichier`));
    // Marque « déjà utilisée » sur la seule Image déjà utilisée, dans la vignette et dans son nom.
    expect(
      vignettes().map((vignette) => vignette.querySelector('.vignette__marque') !== null),
    ).toEqual([true, false, false]);
    expect(vignettes()[0].getAttribute('aria-label')).toBe(
      "Illustrer « farine » avec l'image : farine, ingrédient, vous, déjà utilisée, image libre",
    );
    expect(vignettes().every((vignette) => vignette.type === 'button')).toBe(true);
    expect(racine.querySelector('.carte-mot__images')?.getAttribute('aria-label')).toBe(
      'Images existantes pour « farine »',
    );
    const droite = [...racine.querySelector('.carte-mot__droite')!.children];
    expect(droite.map((enfant) => enfant.tagName.toLowerCase())).toEqual([
      'ul',
      'app-suggestions-arasaac',
      'button',
    ]);
    expect(droite[0].classList).toContain('carte-mot__images');
    expect(droite[2].classList).toContain('carte-mot__televerser');
  });

  it('sans Image existante : comportement actuel, suggestions ARASAAC puis « Téléverser »', async () => {
    await ouvrir(propositions([]), [2459]);

    expect(racine.querySelector('.carte-mot__images')).toBeNull();
    expect(racine.querySelectorAll('button.suggestions__vignette')).toHaveLength(1);
    expect(racine.querySelector('.suggestions__marque')).toBeNull();
    expect(racine.querySelector('.carte-mot__televerser')).not.toBeNull();
  });

  it('pictogramme déjà possédé : seule la suggestion de mon Image du Sens retenu porte « déjà utilisée »', async () => {
    await ouvrir(
      propositions(
        [
          image(1, { idArasaac: 2459 }),
          // Image d'une collègue : ne compte jamais.
          image(2, { idArasaac: 37172, proprietaireId: ZOE, etat: 'versee' }),
          // Mon Image d'un autre Sens du Mot : ne compte pas.
          image(3, { idArasaac: 8, sens: AUTRE_SENS }),
          // Au-delà des trois vignettes montrées, mon Image du Sens retenu compte encore.
          image(4, { idArasaac: 12 }),
        ],
        [SENS, AUTRE_SENS],
      ),
      [2459, 37172, 8, 12],
    );

    const marques = [...racine.querySelectorAll('.suggestions__element')].map(
      (element) => element.querySelector('.suggestions__marque') !== null,
    );
    expect(marques).toEqual([true, false, false, true]);
    // Le Mot a plusieurs Sens : chaque vignette montre le Sens de son Image.
    expect(vignettes()[2].querySelector('.vignette__sens')?.textContent?.trim()).toBe('poudre');
  });

  it('clic sur une Image existante : `PUT …/image` avec son identifiant, vignettes en attente, puis Mot illustré émis', async () => {
    await ouvrir(propositions([image(1), image(2)]));
    const illustres: MotPreparationDto[] = [];
    fixture.componentInstance.illustre.subscribe((mot) => illustres.push(mot));

    vignettes()[0].click();
    await stabiliser();
    const requete = serveur.expectOne(URL_IMAGE);
    expect(requete.request.method).toBe('PUT');
    expect(requete.request.body).toEqual({ imageId: image(1).id });
    expect(vignettes().every((vignette) => vignette.getAttribute('aria-disabled') === 'true')).toBe(
      true,
    );
    // Pendant l'envoi, un autre clic n'envoie rien.
    vignettes()[1].click();
    await stabiliser();
    serveur.expectNone(URL_IMAGE);

    requete.flush(ILLUSTRE);
    await stabiliser();
    expect(illustres).toEqual([ILLUSTRE]);
  });

  it('Image devenue indisponible : nouvelle lecture des Images, puis « Cette image n’est plus disponible. »', async () => {
    await ouvrir(propositions([image(1), image(2)]));
    const illustres: MotPreparationDto[] = [];
    fixture.componentInstance.illustre.subscribe((mot) => illustres.push(mot));

    vignettes()[0].click();
    await stabiliser();
    serveur
      .expectOne(URL_IMAGE)
      .flush({ status: 404, code: 'image.indisponible' }, { status: 404, statusText: 'Not Found' });
    await stabiliser();
    serveur
      .expectOne((requete) => requete.url === URL_PROPOSITIONS)
      .flush(propositions([image(2)]));
    await stabiliser();

    expect(illustres).toEqual([]);
    expect(racine.querySelector('.carte-mot__message[role="alert"]')?.textContent?.trim()).toBe(
      "Cette image n'est plus disponible.",
    );
    expect(vignettes()).toHaveLength(1);
    expect(vignettes()[0].hasAttribute('aria-disabled')).toBe(false);
  });

  it('Mot illustré entre-temps (`409`) : sortie `aRecharger` avec le message traduit', async () => {
    await ouvrir(propositions([image(1)]));
    const messages: string[] = [];
    fixture.componentInstance.aRecharger.subscribe((message) => messages.push(message));

    vignettes()[0].click();
    await stabiliser();
    serveur
      .expectOne(URL_IMAGE)
      .flush(
        { status: 409, code: 'preparation.mot_deja_illustre' },
        { status: 409, statusText: 'Conflict' },
      );
    await stabiliser();

    expect(messages).toEqual(['Ce mot a déjà une image dans la préparation.']);
    expect(racine.querySelector('.carte-mot__message')).toBeNull();
  });

  it('Mot illustré : plus d’Images existantes ni de lecture ; redevenu « à illustrer », les Images sont relues', async () => {
    await ouvrir(propositions([image(1)]));

    fixture.componentRef.setInput('mot', ILLUSTRE);
    await stabiliser();
    expect(racine.querySelector('.carte-mot__images')).toBeNull();
    serveur.expectNone((requete) => requete.url === URL_PROPOSITIONS);

    fixture.componentRef.setInput('mot', MOT);
    await stabiliser();
    serveur
      .expectOne((requete) => requete.url === URL_PROPOSITIONS)
      .flush(propositions([image(1)]));
    serveur.match(URL_SUGGESTIONS);
    await stabiliser();
    expect(vignettes()).toHaveLength(1);
  });

  it('nouvel objet Mot de même identifiant, toujours « à illustrer » (Thème changé) : aucune nouvelle lecture', async () => {
    await ouvrir(propositions([image(1)]));

    fixture.componentRef.setInput('mot', {
      ...MOT,
      themeId: '0190f0a0-0000-7000-8000-00000000c001',
    });
    await stabiliser();

    serveur.expectNone((requete) => requete.url === URL_PROPOSITIONS);
    expect(vignettes()).toHaveLength(1);
  });

  it('`PUT …/image` en échec (500) : message traduit dans la Carte, vignettes de nouveau actives', async () => {
    await ouvrir(propositions([image(1), image(2)]));
    const illustres: MotPreparationDto[] = [];
    fixture.componentInstance.illustre.subscribe((mot) => illustres.push(mot));

    vignettes()[0].click();
    await stabiliser();
    serveur.expectOne(URL_IMAGE).flush(null, { status: 500, statusText: 'Internal Server Error' });
    await stabiliser();

    expect(illustres).toEqual([]);
    expect(racine.querySelector('.carte-mot__message[role="alert"]')?.textContent?.trim()).toBe(
      messageErreur(new HttpErrorResponse({ status: 500 })),
    );
    expect(vignettes().some((vignette) => vignette.hasAttribute('aria-disabled'))).toBe(false);
    serveur.expectNone((requete) => requete.url === URL_PROPOSITIONS);
  });

  it('`GET …/propositions` en échec (500) : aucune Image existante, suggestions ARASAAC et « Téléverser » restent', async () => {
    fixture = TestBed.createComponent(CarteMot);
    fixture.componentRef.setInput('preparationId', PREPARATION);
    fixture.componentRef.setInput('mot', MOT);
    racine = fixture.nativeElement as HTMLElement;
    await stabiliser();
    serveur
      .expectOne((requete) => requete.url === URL_PROPOSITIONS)
      .flush(null, { status: 500, statusText: 'Internal Server Error' });
    serveur.expectOne(URL_SUGGESTIONS).flush([{ idArasaac: 2459, motCle: 'farine' }]);
    await stabiliser();

    expect(racine.querySelector('.carte-mot__images')).toBeNull();
    expect(racine.querySelector('.carte-mot__message')).toBeNull();
    expect(racine.querySelectorAll('button.suggestions__vignette')).toHaveLength(1);
    expect(racine.querySelector('.carte-mot__televerser')).not.toBeNull();
  });
});
