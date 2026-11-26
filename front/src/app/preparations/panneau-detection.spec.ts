import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { DetectionImageDto } from '../api/models/detection-image-dto';
import { DetectionMotDto } from '../api/models/detection-mot-dto';
import { DetectionPreparationDto } from '../api/models/detection-preparation-dto';
import { CompteCourant } from '../commun/compte-courant';
import { provideIcones } from '../commun/icones';
import {
  AjoutAvecSens,
  DELAI_DETECTION_MS,
  DELAI_SUGGESTIONS_MS,
  libelleEtatMot,
  libelleSens,
  MESSAGE_DETECTION_INDISPONIBLE,
  PanneauDetection,
} from './panneau-detection';

const PAUL = '0190f0a0-0000-7000-8000-000000000871';
const ZOE = '0190f0a0-0000-7000-8000-000000000872';
const ACOMPLETER = { id: 's0', libelle: 'à compléter', categorie: null, aCompleter: true };

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
    sens: ACOMPLETER,
    dejaUtilisee: false,
    ...modifications,
  };
}

function mot(forme: string, modifications: Partial<DetectionMotDto> = {}): DetectionMotDto {
  return {
    motId: `mot-${forme}`,
    forme,
    dejaDansLaPreparation: false,
    formeSaisie: true,
    sens: [ACOMPLETER],
    albums: [],
    images: [],
    ...modifications,
  };
}

const FARINE: DetectionPreparationDto = {
  forme: 'farine',
  mots: [
    mot('farine', {
      albums: [{ id: 'a1', titre: 'La petite poule rousse' }],
      images: [
        image('i1', {
          sections: ['ms', 'gs'],
          typeImage: 'image_album',
          albumOrigine: { id: 'a1', titre: 'La petite poule rousse' },
          dejaUtilisee: true,
        }),
        image('i2', { proprietaireId: ZOE, etat: 'versee', sections: ['gs'] }),
      ],
    }),
  ],
};

describe('PanneauDetection', () => {
  let fixture: ComponentFixture<PanneauDetection>;
  let racine: HTMLElement;
  let serveur: HttpTestingController;
  const original = { creer: URL.createObjectURL, revoquer: URL.revokeObjectURL };

  const url = (saisie: string) =>
    `/api/preparations/p1/detection?saisie=${encodeURIComponent(saisie)}`;
  const tour = (delai = 0) => new Promise((fin) => setTimeout(fin, delai));
  async function stabiliser() {
    await tour();
    await fixture.whenStable();
    await tour();
    await fixture.whenStable();
  }
  /** Tape `saisie` puis attend la pause de frappe : la requête part. */
  async function taper(saisie: string) {
    fixture.componentRef.setInput('saisie', saisie);
    await fixture.whenStable();
    await tour(DELAI_DETECTION_MS + 20);
    await stabiliser();
  }
  /** Attend la pause plus longue après laquelle les suggestions ARASAAC sont demandées. */
  async function attendreSuggestions() {
    await tour(DELAI_SUGGESTIONS_MS - DELAI_DETECTION_MS + 20);
    await stabiliser();
  }
  const annonce = () => texte('[aria-live="polite"]') ?? '';
  const texte = (selecteur: string) =>
    racine.querySelector(selecteur)?.textContent?.replace(/\s+/g, ' ').trim();
  const textes = (selecteur: string) =>
    [...racine.querySelectorAll(selecteur)].map((element) =>
      element.textContent?.replace(/\s+/g, ' ').trim(),
    );
  /** Laisse répondre les miniatures demandées. */
  function servirMiniatures() {
    for (const requete of serveur.match((demande) => demande.url.includes('/fichier'))) {
      requete.flush(new Blob(['x'], { type: 'image/png' }));
    }
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
    fixture = TestBed.createComponent(PanneauDetection);
    fixture.componentRef.setInput('preparationId', 'p1');
    racine = fixture.nativeElement as HTMLElement;
    await stabiliser();
  });

  afterEach(() => {
    serveur.verify();
    URL.createObjectURL = original.creer;
    URL.revokeObjectURL = original.revoquer;
  });

  it('seul un résumé est une région aria-live polie ; vide sous deux caractères, sans requête', async () => {
    expect(racine.hasAttribute('aria-live')).toBe(false);
    expect(racine.querySelectorAll('[aria-live]')).toHaveLength(1);
    expect(racine.querySelector('[aria-live="polite"]')!.classList).toContain(
      'cm-visuellement-masque',
    );
    await taper('f');
    await taper(' f ');
    expect(racine.textContent?.trim()).toBe('');
  });

  it('montre un Mot existant : en-tête, Albums, Images dans l’ordre du back, première mise en avant', async () => {
    await taper('fa');
    serveur.expectOne(url('fa')).flush(FARINE);
    await stabiliser();
    serveur.expectOne('/api/enseignants').flush([
      { id: PAUL, nomAffiche: 'Paul', statut: 'actif' },
      { id: ZOE, nomAffiche: 'Zoé', statut: 'actif' },
    ]);
    servirMiniatures();
    await stabiliser();

    expect(texte('.detection__mot')).toBe('farine');
    expect(texte('.detection__entete')).toBe('farine — existe déjà · 2 images, dans 1 album');
    // Annoncé : l'en-tête seul ; les vignettes sont hors de la région annoncée.
    expect(annonce()).toBe('farine — existe déjà · 2 images, dans 1 album');
    expect(racine.querySelector('[aria-live] .vignette, [aria-live] .detection__ligne')).toBeNull();
    expect(textes('.detection__ligne')).toEqual([
      'Images de votre section en premier.',
      'Albums : La petite poule rousse',
    ]);
    const vignettes = [...racine.querySelectorAll('.vignette')];
    expect(vignettes).toHaveLength(2);
    expect(vignettes[0].classList).toContain('vignette--premiere');
    expect(vignettes[1].classList).not.toContain('vignette--premiere');
    expect(textes('.vignette__origine')).toEqual(['La petite poule rousse · vous', 'Zoé']);
    // Le livre seulement avec un album d'origine.
    expect(vignettes[0].querySelector('.vignette__origine mat-icon')).not.toBeNull();
    expect(vignettes[1].querySelector('.vignette__origine mat-icon')).toBeNull();
    expect(textes('.vignette__marque')).toEqual(['déjà utilisée']);
    expect(vignettes[0].querySelectorAll('app-repere-section')).toHaveLength(2);
    expect(vignettes[0].querySelector('app-badge-type-image')?.textContent).toContain(
      "image d'album",
    );
    expect(
      [...racine.querySelectorAll<HTMLImageElement>('.vignette__image')].map((img) => img.alt),
    ).toEqual(['farine, à compléter', 'farine, à compléter']);
    expect(racine.querySelector('.vignette__sens')).toBeNull();
    // Seul « Nouveau sens » est focalisable (un seul Sens : pas de puces).
    expect(
      [...racine.querySelectorAll('a, button, input, [tabindex]')].map((element) =>
        element.textContent?.trim(),
      ),
    ).toEqual(['Nouveau sens']);
    expect(racine.querySelector('.detection__puces')).toBeNull();
  });

  it('ignore une réponse dépassée par une frappe plus récente', async () => {
    await taper('fa');
    const fa = serveur.expectOne(url('fa'));
    await taper('far');
    const far = serveur.expectOne(url('far'));

    far.flush({ forme: 'far', mots: [] });
    await stabiliser();
    fa.flush(FARINE);
    await stabiliser();

    expect(texte('.detection__entete')).toBe('far — nouveau mot');
    await attendreSuggestions();
    serveur.expectOne('/api/arasaac/suggestions?mot=far').flush([]);
    await stabiliser();
  });

  it('une frappe pendant la pause n’envoie que la dernière saisie', async () => {
    fixture.componentRef.setInput('saisie', 'fa');
    await fixture.whenStable();
    await taper('far');

    serveur.expectNone(url('fa'));
    serveur.expectOne(url('far')).flush({ forme: 'far', mots: [] });
    await stabiliser();
    await attendreSuggestions();
    serveur.expectOne('/api/arasaac/suggestions?mot=far').flush([]);
  });

  it('un fragment dépassé avant la pause longue n’interroge pas ARASAAC', async () => {
    await taper('fa');
    serveur.expectOne(url('fa')).flush({ forme: 'fa', mots: [] });
    await stabiliser();
    expect(texte('.detection__entete')).toBe('fa — nouveau mot');
    expect(racine.querySelector('app-suggestions-arasaac')).toBeNull();

    await taper('far');
    serveur.expectOne(url('far')).flush({ forme: 'far', mots: [] });
    await stabiliser();
    serveur.expectNone('/api/arasaac/suggestions?mot=fa');
    expect(racine.querySelector('app-suggestions-arasaac')).toBeNull();

    await attendreSuggestions();
    serveur.expectNone('/api/arasaac/suggestions?mot=fa');
    serveur.expectOne('/api/arasaac/suggestions?mot=far').flush([]);
    await stabiliser();
  });

  it('un Mot nouveau montre les suggestions ARASAAC et le Repère de qualité', async () => {
    await taper('le loup');
    serveur.expectOne(url('le loup')).flush({ forme: 'loup', mots: [] });
    await stabiliser();
    await attendreSuggestions();

    expect(texte('.detection__entete')).toBe('loup — nouveau mot');
    expect(annonce()).toBe('loup — nouveau mot');
    expect(texte('.suggestions__repere')).toBe(
      'Suggestions ARASAAC · simple, claire, peu de détails',
    );
    serveur.expectOne('/api/arasaac/suggestions?mot=loup').flush([]);
    await stabiliser();
  });

  it('un Mot sans Image : « aucune image » et suggestions ARASAAC ; déjà dans la préparation', async () => {
    await taper('four');
    serveur.expectOne(url('four')).flush({
      forme: 'four',
      mots: [
        mot('four', {
          dejaDansLaPreparation: true,
          formeSaisie: true,
          albums: [{ id: 'a1', titre: 'La petite poule rousse' }],
        }),
      ],
    });
    await stabiliser();

    expect(texte('.detection__entete')).toBe(
      'four — déjà dans la préparation · aucune image, dans 1 album',
    );
    expect(racine.querySelector('.vignette')).toBeNull();
    expect(textes('.detection__ligne')).toEqual(['Albums : La petite poule rousse']);
    await attendreSuggestions();
    serveur.expectOne('/api/arasaac/suggestions?mot=four').flush([]);
    await stabiliser();
  });

  it('plusieurs Mots : un bloc par Mot ; Sens listés et rappelés sur la vignette', async () => {
    const animal = { id: 's1', libelle: 'animal', categorie: 'nom', aCompleter: false };
    const mechant = { id: 's2', libelle: 'méchant', categorie: null, aCompleter: false };
    await taper('cote');
    serveur.expectOne(url('cote')).flush({
      forme: 'cote',
      mots: [
        mot('côte', {
          formeSaisie: false,
          sens: [animal, mechant],
          images: [image('i1', { sens: mechant })],
        }),
        mot('côté', { formeSaisie: false, images: [image('i2')] }),
      ],
    });
    await stabiliser();
    servirMiniatures();
    await stabiliser();

    expect(textes('.detection__mot')).toEqual(['côte', 'côté']);
    expect(annonce()).toBe('côte — existe déjà · 1 image ; côté — existe déjà · 1 image');
    // « côte » a deux Sens : des puces à la place de la ligne « Sens : … ».
    expect(textes('.detection__ligne')).toEqual([
      'Images de votre section en premier.',
      'Sens de « côte » :',
    ]);
    expect(textes('.detection__puce')).toEqual(['Tous', 'animal (nom)', 'méchant']);
    expect(textes('.vignette__sens')).toEqual(['méchant']);
    // Story 2.11 : « cote » n'est exactement ni « côte » ni « côté » : l'Entrée seule n'en retiendra aucune Image, aucune
    // n'est mise en avant.
    expect(racine.querySelectorAll('.vignette--premiere')).toHaveLength(0);
    expect(textes('.vignette__origine')).toEqual(['vous', 'vous']);
  });

  it('disparaît quand la saisie est vidée (après l’ajout du Mot)', async () => {
    await taper('farine');
    serveur.expectOne(url('farine')).flush({ forme: 'farine', mots: [] });
    await stabiliser();
    await attendreSuggestions();
    serveur.expectOne('/api/arasaac/suggestions?mot=farine').flush([]);
    await stabiliser();
    expect(racine.querySelector('.detection')).not.toBeNull();

    await taper('');
    expect(racine.textContent?.trim()).toBe('');
  });

  it('échec : message court sous le champ ; saisie refusée par le back : rien', async () => {
    await taper('farine');
    serveur.expectOne(url('farine')).error(new ProgressEvent('error'), { status: 0 });
    await stabiliser();
    expect(texte('.detection__erreur')).toBe(MESSAGE_DETECTION_INDISPONIBLE);
    expect(annonce()).toBe(MESSAGE_DETECTION_INDISPONIBLE);
    expect(racine.querySelector('[role="alert"]')).toBeNull();

    await taper("l'a");
    serveur
      .expectOne(url("l'a"))
      .flush({ code: 'requete.invalide' }, { status: 400, statusText: 'Bad Request' });
    await stabiliser();
    expect(racine.textContent?.trim()).toBe('');
  });

  describe('retenir une Image (story 2.7, partie 2)', () => {
    const panneau = () => fixture.componentInstance;
    const options = () => [...racine.querySelectorAll<HTMLElement>('[role="option"]')];
    const choisies = () =>
      options().map((option) => option.getAttribute('aria-selected') === 'true');

    async function afficher(resultat: DetectionPreparationDto = FARINE) {
      await taper('farine');
      serveur.expectOne(url('farine')).flush(resultat);
      await stabiliser();
      serveur.match('/api/enseignants').forEach((requete) =>
        requete.flush([
          { id: PAUL, nomAffiche: 'Paul', statut: 'actif' },
          { id: ZOE, nomAffiche: 'Zoé', statut: 'actif' },
        ]),
      );
      servirMiniatures();
      await stabiliser();
    }

    async function naviguer(...gestes: ('suivant' | 'precedent' | 'annuler')[]) {
      for (const geste of gestes) {
        panneau().naviguer(geste);
      }
      await fixture.whenStable();
    }

    it('liste d’options, aucune choisie d’emblée ; la première reste mise en avant', async () => {
      await afficher();

      const liste = racine.querySelector('[role="listbox"]')!;
      expect(liste.id).toBe(panneau().idListe);
      expect(liste.getAttribute('aria-label')).toBe('Images proposées');
      // Dans la liste, seuls groupes et options sont exposés : le texte du Mot nomme le groupe.
      const groupe = liste.querySelector('[role="group"]')!;
      expect(groupe.getAttribute('aria-label')).toBe(
        'farine — existe déjà · 2 images, dans 1 album. Albums : La petite poule rousse.',
      );
      expect(
        [...liste.querySelectorAll('.detection__entete, .detection__ligne')].every(
          (element) => element.closest('[aria-hidden="true"]') !== null,
        ),
      ).toBe(true);
      expect(liste.querySelector('app-suggestions-arasaac')).toBeNull();
      expect(
        [...racine.querySelectorAll('.detection__ligne')]
          .find((ligne) => ligne.textContent?.trim() === 'Images de votre section en premier.')
          ?.closest('[role="listbox"]'),
      ).toBeNull();
      expect(panneau().deplie()).toBe(true);
      expect(panneau().choix()).toBeNull();
      expect(panneau().idActif()).toBeNull();
      expect(choisies()).toEqual([false, false]);
      expect(options()[0].classList).toContain('vignette--premiere');
      expect(options().map((option) => option.getAttribute('aria-label'))).toEqual([
        "farine, à compléter, vous, déjà utilisée, MS GS, image d'album, album La petite poule rousse",
        'farine, à compléter, Zoé, GS, image libre',
      ]);
      // Rien de focalisable dans la liste : le focus reste dans le champ.
      expect(liste.querySelector('a, button, input, [tabindex]')).toBeNull();
    });

    it('↓ choisit la première puis la suivante, sans boucler ; ↑ revient, puis retire le choix', async () => {
      await afficher();

      await naviguer('suivant');
      expect(panneau().choix()).toEqual({ motId: 'mot-farine', forme: 'farine', imageId: 'i1' });
      expect(panneau().idActif()).toBe(options()[0].id);
      expect(choisies()).toEqual([true, false]);
      expect(options()[0].classList).toContain('vignette--choisie');
      expect(options()[0].querySelector('.vignette__coche mat-icon')).not.toBeNull();

      await naviguer('suivant', 'suivant');
      expect(panneau().choix()?.imageId).toBe('i2');
      expect(choisies()).toEqual([false, true]);
      // La mise en avant de la première disparaît quand une autre est choisie.
      expect(options()[0].classList).not.toContain('vignette--premiere');
      expect(racine.querySelectorAll('.vignette__coche')).toHaveLength(1);

      await naviguer('precedent');
      expect(panneau().choix()?.imageId).toBe('i1');
      await naviguer('precedent');
      expect(panneau().choix()).toBeNull();
      expect(panneau().idActif()).toBeNull();
      expect(options()[0].classList).toContain('vignette--premiere');
      await naviguer('precedent');
      expect(panneau().choix()).toBeNull();
    });

    it('Échap retire le choix', async () => {
      await afficher();
      await naviguer('suivant', 'annuler');
      expect(panneau().choix()).toBeNull();
      expect(choisies()).toEqual([false, false]);
    });

    it('le choix tombe à chaque frappe et à chaque nouveau résultat', async () => {
      await afficher();
      await naviguer('suivant');

      fixture.componentRef.setInput('saisie', 'farines');
      await fixture.whenStable();
      expect(panneau().choix()).toBeNull();

      await tour(DELAI_DETECTION_MS + 20);
      await stabiliser();
      serveur.expectOne(url('farines')).flush(FARINE);
      await stabiliser();
      serveur.match('/api/enseignants').forEach((requete) => requete.flush([]));
      servirMiniatures();
      expect(panneau().choix()).toBeNull();
    });

    it('détection attendue pour une autre saisie : l’ancien résultat reste affiché mais rien n’est proposé', async () => {
      await afficher();

      fixture.componentRef.setInput('saisie', 'farines');
      await fixture.whenStable();
      await naviguer('suivant');

      expect(options()).toHaveLength(0);
      expect(racine.querySelectorAll('.vignette')).toHaveLength(2);
      expect(racine.querySelector('[role="listbox"]')).toBeNull();
      expect(panneau().deplie()).toBe(false);
      expect(panneau().choix()).toBeNull();
      expect(panneau().idActif()).toBeNull();

      await tour(DELAI_DETECTION_MS + 20);
      await stabiliser();
      serveur.expectOne(url('farines')).flush({ ...FARINE, forme: 'farines' });
      await stabiliser();
      serveur.match('/api/enseignants').forEach((requete) => requete.flush([]));
      servirMiniatures();
      await stabiliser();
      expect(panneau().deplie()).toBe(true);
      await naviguer('suivant');
      expect(panneau().choix()?.imageId).toBe('i1');
    });

    it('clic : émet l’Image retenue avec son Mot, sans prendre le focus', async () => {
      await afficher();
      const retenues: unknown[] = [];
      panneau().retenir.subscribe((choix) => retenues.push(choix));

      const appui = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      options()[1].dispatchEvent(appui);
      options()[1].click();
      await fixture.whenStable();

      expect(appui.defaultPrevented).toBe(true);
      expect(retenues).toEqual([{ motId: 'mot-farine', forme: 'farine', imageId: 'i2' }]);
    });

    it('plusieurs Mots : un groupe nommé par Mot, ↓ parcourt les Images de tous les Mots', async () => {
      await afficher({
        forme: 'cote',
        mots: [mot('côte', { images: [image('i1')] }), mot('côté', { images: [image('i2')] })],
      });

      const groupes = [...racine.querySelectorAll('[role="listbox"] [role="group"]')];
      expect(groupes.map((groupe) => groupe.getAttribute('aria-label'))).toEqual([
        'côte — existe déjà · 1 image.',
        'côté — existe déjà · 1 image.',
      ]);
      await naviguer('suivant', 'suivant');
      expect(panneau().choix()).toEqual({ motId: 'mot-côté', forme: 'côté', imageId: 'i2' });
    });

    it('sans Image : pas de liste, rien à choisir', async () => {
      await afficher({ forme: 'farine', mots: [] });
      expect(racine.querySelector('[role="listbox"]')).toBeNull();
      expect(panneau().deplie()).toBe(false);
      await naviguer('suivant');
      expect(panneau().choix()).toBeNull();
      await attendreSuggestions();
      serveur.expectOne('/api/arasaac/suggestions?mot=farine').flush([]);
      await stabiliser();
    });
  });

  describe('Sens dans la détection (story 2.8, partie 3)', () => {
    const panneau = () => fixture.componentInstance;
    const CHUTE = { id: 's-chute', libelle: 'chute', categorie: 'nom', aCompleter: false };
    const CUISINE = {
      id: 's-cuisine',
      libelle: 'cuisine',
      categorie: 'adjectif',
      aCompleter: false,
    };
    const ETALE: DetectionPreparationDto = {
      forme: 'étalé',
      mots: [
        mot('étalé', {
          sens: [CHUTE, CUISINE, ACOMPLETER],
          images: [
            image('i1', { sens: CUISINE }),
            image('i2', { sens: CHUTE }),
            image('i3', { sens: CHUTE }),
          ],
        }),
      ],
    };
    const puces = () => [...racine.querySelectorAll<HTMLButtonElement>('.detection__puce')];
    const pressees = () => puces().map((puce) => puce.getAttribute('aria-pressed'));
    const vignettes = () =>
      [...racine.querySelectorAll<HTMLElement>('[role="option"]')].map((option) =>
        option.id.replace(`${panneau().idListe}-image-`, ''),
      );
    const bouton = (libelle: string, dans: ParentNode = racine) =>
      [...dans.querySelectorAll<HTMLButtonElement>('button')].find(
        (candidat) => candidat.textContent?.replace(/\s+/g, ' ').trim() === libelle,
      );

    async function afficher(resultat: DetectionPreparationDto, saisie = 'etale') {
      await taper(saisie);
      serveur.expectOne(url(saisie)).flush(resultat);
      await stabiliser();
      serveur.match('/api/enseignants').forEach((requete) => requete.flush([]));
      servirMiniatures();
      await stabiliser();
    }

    async function choisir(libelle: string) {
      bouton(libelle)!.click();
      await stabiliser();
    }

    it('puces : groupe nommé, « Tous » choisi d’emblée, « à compléter » en dernier', async () => {
      await afficher(ETALE);

      const groupe = racine.querySelector('.detection__puces')!;
      expect(groupe.getAttribute('role')).toBe('group');
      expect(groupe.getAttribute('aria-label')).toBe('Sens de « étalé »');
      expect(groupe.closest('[role="listbox"]')).toBeNull();
      expect(textes('.detection__puce')).toEqual([
        'Tous',
        'chute (nom)',
        'cuisine (adjectif)',
        'à compléter',
      ]);
      expect(pressees()).toEqual(['true', 'false', 'false', 'false']);
      // L'état ne tient pas à la couleur seule : la puce choisie porte une coche.
      expect(puces()[0].querySelector('mat-icon')).not.toBeNull();
      expect(puces()[1].querySelector('mat-icon')).toBeNull();
      expect(vignettes()).toEqual(['i1', 'i2', 'i3']);
      expect(panneau().choixSens()).toBeNull();
      await attendreSuggestions();
    });

    it('clic sur une puce : seules les Images de ce Sens, ↓ ne parcourt qu’elles, focus au champ', async () => {
      await afficher(ETALE);
      let focus = 0;
      panneau().focusChamp.subscribe(() => focus++);
      panneau().naviguer('suivant');

      await choisir('chute (nom)');

      expect(focus).toBe(1);
      expect(pressees()).toEqual(['false', 'true', 'false', 'false']);
      expect(puces()[1].querySelector('mat-icon')).not.toBeNull();
      expect(vignettes()).toEqual(['i2', 'i3']);
      // Le choix d'Image en cours tombe.
      expect(panneau().choix()).toBeNull();
      expect(panneau().choixSens()).toEqual({
        motId: 'mot-étalé',
        forme: 'étalé',
        sensId: 's-chute',
      });
      panneau().naviguer('suivant');
      expect(panneau().choix()?.imageId).toBe('i2');
      panneau().naviguer('suivant');
      panneau().naviguer('suivant');
      expect(panneau().choix()?.imageId).toBe('i3');
      await fixture.whenStable();
      expect(racine.querySelector('.vignette--premiere')).toBeNull();

      await choisir('Tous');
      servirMiniatures();
      await stabiliser();
      expect(panneau().choixSens()).toBeNull();
      expect(vignettes()).toEqual(['i1', 'i2', 'i3']);
      expect(racine.querySelector('.vignette--premiere')?.id).toContain('i1');
      await attendreSuggestions();
    });

    it('story 2.11 : la mise en avant suit le Sens choisi, comme l’Image que l’Entrée fera retenir', async () => {
      await afficher(ETALE);
      expect(racine.querySelector('.vignette--premiere')?.id).toContain('i1');

      await choisir('chute (nom)');
      servirMiniatures();
      await stabiliser();

      expect(panneau().choix()).toBeNull();
      expect(racine.querySelectorAll('.vignette--premiere')).toHaveLength(1);
      expect(racine.querySelector('.vignette--premiere')?.id).toContain('i2');
      await attendreSuggestions();
    });

    it('story 2.11 : rien n’est mis en avant pour un Mot déjà dans la préparation (Entrée serait refusée)', async () => {
      await afficher(
        {
          forme: 'farine',
          mots: [mot('farine', { dejaDansLaPreparation: true, images: [image('i1')] })],
        },
        'farine',
      );

      expect(vignettes()).toEqual(['i1']);
      expect(racine.querySelector('.vignette--premiere')).toBeNull();
      await attendreSuggestions();
    });

    it('story 2.11 : rien n’est mis en avant tant que la détection d’une nouvelle saisie est attendue', async () => {
      await afficher(
        { forme: 'farine', mots: [mot('farine', { images: [image('i1')] })] },
        'farine',
      );
      expect(racine.querySelector('.vignette--premiere')?.id).toContain('i1');

      await taper('farines');
      serveur.expectOne(url('farines'));

      expect(racine.querySelector('.vignette--premiere')).toBeNull();
      await attendreSuggestions();
    });

    it('story 2.11 : seule la première Image du Mot exactement saisi est mise en avant', async () => {
      await afficher(
        {
          forme: 'cote',
          mots: [
            mot('côte', { formeSaisie: false, images: [image('i1')] }),
            mot('cote', { images: [image('i2'), image('i3')] }),
          ],
        },
        'cote',
      );

      expect(racine.querySelectorAll('.vignette--premiere')).toHaveLength(1);
      expect(racine.querySelector('.vignette--premiere')?.id).toContain('i2');
      // ↓ parcourt toujours les Images de tous les Mots, dans l'ordre du back.
      panneau().naviguer('suivant');
      expect(panneau().choix()?.imageId).toBe('i1');
      await attendreSuggestions();
    });

    it('le Sens choisi et le nombre de ses Images sont annoncés', async () => {
      await afficher(ETALE);
      expect(annonce()).toBe('étalé — existe déjà · 3 images');

      await choisir('chute (nom)');
      expect(annonce()).toBe('étalé, chute (nom) : 2 images.');
      await choisir('cuisine (adjectif)');
      expect(annonce()).toBe('étalé, cuisine (adjectif) : 1 image.');
      await choisir('à compléter');
      expect(annonce()).toBe('Aucune image pour ce sens.');
      await choisir('Tous');
      servirMiniatures();
      await stabiliser();
      expect(annonce()).toBe('étalé — existe déjà · 3 images');
      // La région annoncée reste la seule, sans les vignettes.
      expect(racine.querySelectorAll('[aria-live]')).toHaveLength(1);
    });

    it('un Sens sans Image : aucune Image, Entrée gardera ce Sens', async () => {
      await afficher(ETALE);
      await choisir('à compléter');
      expect(vignettes()).toEqual([]);
      expect(texte('.detection__sens .detection__ligne:last-child')).toBe(
        'Aucune image pour ce sens.',
      );
      expect(panneau().choixSens()?.sensId).toBe('s0');
      await attendreSuggestions();
    });

    it('une frappe ramène « Tous »', async () => {
      await afficher(ETALE);
      await choisir('chute (nom)');

      fixture.componentRef.setInput('saisie', 'etalee');
      await fixture.whenStable();
      expect(panneau().choixSens()).toBeNull();
      await tour(DELAI_DETECTION_MS + 20);
      await stabiliser();
      serveur.expectOne(url('etalee')).flush(ETALE);
      await stabiliser();
      servirMiniatures();
      await stabiliser();
      expect(pressees()).toEqual(['true', 'false', 'false', 'false']);
      expect(panneau().choixSens()).toBeNull();
    });

    it('deux Mots : le Sens choisi est celui d’un seul Mot', async () => {
      const corps = { id: 's-corps', libelle: 'corps', categorie: 'nom', aCompleter: false };
      const direction = { id: 's-dir', libelle: 'direction', categorie: 'nom', aCompleter: false };
      const gauche = { id: 's-gauche', libelle: 'gauche', categorie: 'nom', aCompleter: false };
      await afficher(
        {
          forme: 'cote',
          mots: [
            mot('côte', { sens: [corps, ACOMPLETER], images: [image('i1', { sens: corps })] }),
            mot('côté', {
              sens: [direction, gauche],
              images: [image('i2', { sens: direction }), image('i3', { sens: gauche })],
            }),
          ],
        },
        'cote',
      );

      const groupes = [...racine.querySelectorAll('.detection__puces')];
      expect(groupes.map((groupe) => groupe.getAttribute('aria-label'))).toEqual([
        'Sens de « côte »',
        'Sens de « côté »',
      ]);
      bouton('gauche (nom)', groupes[1])!.click();
      await stabiliser();

      expect(panneau().choixSens()).toEqual({
        motId: 'mot-côté',
        forme: 'côté',
        sensId: 's-gauche',
      });
      // Les Images de l'autre Mot restent toutes proposées.
      expect(vignettes()).toEqual(['i1', 'i3']);
      expect(groupes[0].querySelector('[aria-pressed="true"]')?.textContent?.trim()).toBe('Tous');
      await attendreSuggestions();
    });

    it('un seul Sens : la ligne « Sens : … » reste, sans puces', async () => {
      await afficher({
        forme: 'etale',
        mots: [mot('étalé', { sens: [CHUTE], images: [image('i2', { sens: CHUTE })] })],
      });
      expect(racine.querySelector('.detection__puces')).toBeNull();
      expect(textes('.detection__ligne')).toContain('Sens : chute (nom)');
      await attendreSuggestions();
    });

    describe('« Nouveau sens »', () => {
      let envoyer: ReturnType<typeof vi.fn<(ajout: AjoutAvecSens) => Promise<void>>>;
      const libelle = () => racine.querySelector<HTMLInputElement>('.creation-sens__libelle')!;
      const valeurCategorie = () => texte('.creation-sens__categorie .mat-mdc-select-value');

      beforeEach(() => {
        envoyer = vi.fn<(ajout: AjoutAvecSens) => Promise<void>>(() => Promise.resolve());
        fixture.componentRef.setInput('envoyerNouveauSens', envoyer);
        document.body.appendChild(racine);
      });

      afterEach(() => {
        racine.remove();
        document
          .querySelectorAll('.cdk-overlay-container')
          .forEach((surcouche) => surcouche.remove());
      });

      async function ouvrir(dans: ParentNode = racine) {
        bouton('Nouveau sens', dans)!.click();
        await stabiliser();
      }

      async function saisirEtCreer(valeur: string) {
        libelle().value = valeur;
        libelle().dispatchEvent(new Event('input'));
        await stabiliser();
        // Entrée dans le formulaire : soumission implicite, que jsdom ne simule pas.
        racine
          .querySelector('form')!
          .dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
        await stabiliser();
      }

      it('Mot existant : catégorie du Sens choisi, Entrée envoie le Mot avec le Sens tapé', async () => {
        await afficher(ETALE);
        await choisir('cuisine (adjectif)');
        await ouvrir();

        expect(document.activeElement).toBe(libelle());
        expect(valeurCategorie()).toBe('adjectif');
        await saisirEtCreer('chute');

        expect(envoyer).toHaveBeenCalledWith({
          motId: 'mot-étalé',
          forme: 'étalé',
          nouveauSens: { libelle: 'chute', categorie: 'adjectif' },
        });
        await attendreSuggestions();
      });

      it('sans Sens choisi : catégorie du premier Sens visible', async () => {
        await afficher(ETALE);
        await ouvrir();
        expect(valeurCategorie()).toBe('nom');
        await attendreSuggestions();
      });

      it('Mot nouveau : catégorie vide, envoyé sans Mot détecté', async () => {
        await afficher({ forme: 'galette', mots: [] }, 'la galette');
        await ouvrir();
        expect(valeurCategorie() ?? '').toBe('');
        racine
          .querySelector<HTMLElement>('.creation-sens__categorie .mat-mdc-select-trigger')!
          .click();
        await stabiliser();
        [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option')]
          .find((option) => option.textContent?.trim() === 'nom')!
          .click();
        await stabiliser();
        await saisirEtCreer('gâteau');

        expect(envoyer).toHaveBeenCalledWith({
          motId: null,
          forme: 'galette',
          nouveauSens: { libelle: 'gâteau', categorie: 'nom' },
        });
        await attendreSuggestions();
        serveur.expectOne('/api/arasaac/suggestions?mot=galette').flush([]);
        await stabiliser();
      });

      it('une frappe et un nouveau résultat replient et vident le formulaire ouvert', async () => {
        await afficher(ETALE);
        await ouvrir();
        libelle().value = 'chute';
        libelle().dispatchEvent(new Event('input'));
        await stabiliser();

        // Même Mot dans le nouveau résultat : son formulaire n'est pas gardé pour l'autre saisie.
        await taper('etalee');
        expect(racine.querySelector('form')).toBeNull();
        serveur.expectOne(url('etalee')).flush(ETALE);
        await stabiliser();
        servirMiniatures();
        await stabiliser();
        expect(racine.querySelector('form')).toBeNull();
        await ouvrir();
        expect(libelle().value).toBe('');
        expect(envoyer).not.toHaveBeenCalled();
      });

      it('Mot nouveau : le formulaire ouvert est vidé pour une autre forme', async () => {
        await afficher({ forme: 'galette', mots: [] }, 'galette');
        await ouvrir();
        libelle().value = 'gâteau';
        libelle().dispatchEvent(new Event('input'));
        await stabiliser();

        await taper('galettes');
        serveur.expectOne(url('galettes')).flush({ forme: 'galettes', mots: [] });
        await stabiliser();
        expect(racine.querySelector('form')).toBeNull();
        await ouvrir();
        expect(libelle().value).toBe('');
        await attendreSuggestions();
        serveur.match((requete) => requete.url.startsWith('/api/arasaac/'));
      });

      it('Échap replie sans rien envoyer et rend le focus au champ', async () => {
        await afficher(ETALE);
        let focus = 0;
        panneau().focusChamp.subscribe(() => focus++);
        await ouvrir();

        libelle().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await stabiliser();

        expect(racine.querySelector('form')).toBeNull();
        expect(envoyer).not.toHaveBeenCalled();
        expect(focus).toBe(1);
        expect(document.activeElement).not.toBe(bouton('Nouveau sens'));
        await attendreSuggestions();
      });

      it('refus : message sous le formulaire, rien de replié', async () => {
        envoyer.mockRejectedValueOnce(
          new HttpErrorResponse({
            status: 409,
            error: { code: 'preparation.mot_deja_present' },
          }),
        );
        await afficher(ETALE);
        await ouvrir();
        await saisirEtCreer('chute');

        expect(racine.querySelector('form')).not.toBeNull();
        expect(texte('.creation-sens__erreur')).toBe('Ce mot est déjà dans la préparation.');
        expect(libelle().value).toBe('chute');
        await attendreSuggestions();
      });
    });
  });

  it('libellés de l’en-tête et des Sens', () => {
    expect(libelleEtatMot(mot('loup'))).toBe('existe déjà · aucune image');
    expect(
      libelleEtatMot(
        mot('loup', {
          images: [image('i1')],
          albums: [
            { id: 'a', titre: 'A' },
            { id: 'b', titre: 'B' },
          ],
        }),
      ),
    ).toBe('existe déjà · 1 image, dans 2 albums');
    expect(libelleSens(mot('loup'))).toBeNull();
  });
});
