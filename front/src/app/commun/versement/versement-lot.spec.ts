import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Selection } from '../selection/selection';
import { VersementLot } from './versement-lot';

const URL_VERSEMENTS = '/api/images/versements';

describe('VersementLot', () => {
  let serveur: HttpTestingController;
  let selection: Selection;
  let appliquees: string[][];
  let versement: VersementLot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    serveur = TestBed.inject(HttpTestingController);
    selection = new Selection(() => ['a', 'b', 'c']);
    appliquees = [];
    versement = TestBed.runInInjectionContext(
      () =>
        new VersementLot({
          selection,
          imagesSelectionnees: () => new Set(selection.identifiants()),
          appliquer: (ids) => appliquees.push([...ids]),
        }),
    );
  });

  afterEach(() => serveur.verify());

  const noms = new Map([
    ['a', '« loup » (animal)'],
    ['b', '« renard »'],
  ]);

  it('éléments refusés avant l’envoi : en tête des refusées, avant ceux du back', async () => {
    const fin = versement.verser(['a', 'b'], noms, [
      { cle: 'mot:1', texte: "« lapin » : pas d'image" },
    ]);
    serveur.expectOne(URL_VERSEMENTS).flush({
      versees: ['a'],
      dejaVersees: [],
      refusees: [{ imageId: 'b', code: 'image.reservee_au_proprietaire', licence: null }],
    });

    expect(await fin).toBe(true);
    expect(versement.recapitulatif()?.bilan).toBe('1 image versée.');
    expect(versement.recapitulatif()?.refusees.map((refus) => refus.texte)).toEqual([
      "« lapin » : pas d'image",
      "« renard » : image d'un collègue",
    ]);
    expect(appliquees).toEqual([['a']]);
    expect(versement.journal).toEqual(['a']);
  });

  it('identifiants en double : chacun envoyé une fois, dans l’ordre', async () => {
    const fin = versement.verser(['b', 'a', 'b', 'a'], noms);
    const requete = serveur.expectOne(URL_VERSEMENTS);
    expect(requete.request.body).toEqual({ imageIds: ['b', 'a'] });
    requete.flush({ versees: ['b', 'a'], dejaVersees: [], refusees: [] });
    await fin;
    expect(versement.recapitulatif()?.bilan).toBe('2 images versées.');
  });

  it('seulement des Mots sans Image : aucun envoi, « Aucune image versée. »', async () => {
    const fin = versement.verser([], new Map(), [
      { cle: 'mot:1', texte: "« lapin » : pas d'image" },
    ]);

    expect(await fin).toBe(true);
    serveur.expectNone(URL_VERSEMENTS);
    expect(versement.recapitulatif()?.bilan).toBe('Aucune image versée.');
    expect(versement.recapitulatif()?.partage).toBeNull();
    expect(versement.recapitulatif()?.refusees).toHaveLength(1);
    expect(versement.enCours()).toBe(false);
    expect(selection.figee()).toBe(false);
  });

  it('contexte changé pendant l’envoi : plus « en cours », sélection libre, la réponse n’écrit rien', async () => {
    const fin = versement.verser(['a'], noms);
    expect(versement.enCours()).toBe(true);
    expect(selection.figee()).toBe(true);

    versement.changerDeContexte();
    expect(versement.enCours()).toBe(false);
    expect(selection.figee()).toBe(false);

    // Un lot du nouveau contexte part avant la réponse de l'ancien.
    const suivant = versement.verser(['b'], noms);
    const [ancien, nouveau] = serveur.match(URL_VERSEMENTS);
    ancien.flush({ versees: ['a'], dejaVersees: [], refusees: [] });
    expect(await fin).toBe(false);
    // La fin de l'ancien envoi ne libère pas le nouveau.
    expect(versement.enCours()).toBe(true);
    expect(selection.figee()).toBe(true);
    expect(versement.recapitulatif()).toBeNull();
    expect(appliquees).toEqual([]);
    // Le journal garde l'Image versée : une lecture partie avant peut la reprendre.
    expect(versement.journal).toEqual(['a']);

    nouveau.flush({ versees: ['b'], dejaVersees: [], refusees: [] });
    expect(await suivant).toBe(true);
    expect(versement.enCours()).toBe(false);
    expect(appliquees).toEqual([['b']]);
  });
});
