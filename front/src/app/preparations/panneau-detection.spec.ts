import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetectionImageDto } from '../api/models/detection-image-dto';
import { DetectionMotDto } from '../api/models/detection-mot-dto';
import { DetectionPreparationDto } from '../api/models/detection-preparation-dto';
import { CompteCourant } from '../commun/compte-courant';
import {
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
      providers: [provideHttpClient(), provideHttpClientTesting()],
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
    expect(racine.querySelector('a, button, input, [tabindex]')).toBeNull();
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
        mot('côte', { sens: [animal, mechant], images: [image('i1', { sens: mechant })] }),
        mot('côté', { images: [image('i2')] }),
      ],
    });
    await stabiliser();
    servirMiniatures();
    await stabiliser();

    expect(textes('.detection__mot')).toEqual(['côte', 'côté']);
    expect(annonce()).toBe('côte — existe déjà · 1 image ; côté — existe déjà · 1 image');
    expect(textes('.detection__ligne')).toEqual([
      'Images de votre section en premier.',
      'Sens : animal (nom), méchant',
    ]);
    expect(textes('.vignette__sens')).toEqual(['méchant']);
    expect(racine.querySelectorAll('.vignette--premiere')).toHaveLength(1);
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
      // Rien de focalisable : le focus reste dans le champ.
      expect(racine.querySelector('a, button, input, [tabindex]')).toBeNull();
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
