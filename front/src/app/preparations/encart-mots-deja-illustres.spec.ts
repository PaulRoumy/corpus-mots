import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { DetectionImageDto } from '../api/models/detection-image-dto';
import { MotPreparationDto } from '../api/models/mot-preparation-dto';
import { RepriseMotPreparationDto } from '../api/models/reprise-mot-preparation-dto';
import { BandeauAnnuler } from '../commun/bandeau-annuler/bandeau-annuler';
import { MESSAGE_RESEAU } from '../commun/erreurs/message-erreur';
import { provideIcones } from '../commun/icones';
import {
  EncartMotsDejaIllustres,
  messageReprisePartielle,
  titreEncart,
} from './encart-mots-deja-illustres';

const PAUL = '0190f0a0-0000-7000-8000-000000000891';
const URL_REPRISES = '/api/preparations/p1/reprises';
const URL_REUTILISATION = '/api/preparations/p1/mots/reutilisation';

function image(id: string, libelle: string): DetectionImageDto {
  return {
    id,
    proprietaireId: PAUL,
    etat: 'privee',
    aRemplacer: null,
    reutilisable: true,
    typeImage: 'image_album',
    aCompleter: false,
    sections: ['ms'],
    albumOrigine: { id: 'a1', titre: 'Roule galette' },
    sens: { id: `s-${id}`, libelle, categorie: 'nom', aCompleter: false },
    dejaUtilisee: false,
  };
}

/** Candidat « forme », d'Image `i-forme` et de Sens `libelle (nom)`. */
function reprise(forme: string, libelle = forme): RepriseMotPreparationDto {
  // Identifiants sans accents : ils vont dans des URL.
  const cle = forme.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return {
    motId: `m-${cle}`,
    forme,
    sens: { id: `s-i-${cle}`, libelle, categorie: 'nom' },
    image: image(`i-${cle}`, libelle),
  };
}

/** Mot ajouté à la Préparation par la reprise de `candidat`, à la place `ordre`. */
function ajoute(candidat: RepriseMotPreparationDto, ordre: number): MotPreparationDto {
  return {
    id: `mp-${candidat.forme}`,
    motId: candidat.motId,
    forme: candidat.forme,
    ordre,
    sens: candidat.sens,
    illustre: true,
    image: {
      id: candidat.image.id,
      proprietaireId: PAUL,
      etat: 'privee',
      aRemplacer: null,
      reutilisable: true,
      typeImage: 'image_album',
      aCompleter: false,
    },
  };
}

const ETALE = reprise('étalé', 'chute');
const GALETTE = reprise('galette', 'gâteau');
const RENARD = reprise('renard', 'animal');
const NEUF = [
  'chemin',
  'étalé',
  'four',
  'galette',
  'lapin',
  'loup',
  'ours',
  'renard',
  'sentier',
].map((forme) => reprise(forme));

describe('Libellés de l’Encart', () => {
  it('titres accordés et message de reprise partielle', () => {
    expect(titreEncart(9)).toBe('9 mots déjà illustrés pour cet album');
    expect(titreEncart(1)).toBe('1 mot déjà illustré pour cet album');
    expect(messageReprisePartielle(1)).toBe("1 mot n'a pas pu être repris.");
    expect(messageReprisePartielle(2)).toBe("2 mots n'ont pas pu être repris.");
  });
});

describe('EncartMotsDejaIllustres', () => {
  let fixture: ComponentFixture<EncartMotsDejaIllustres>;
  let racine: HTMLElement;
  let serveur: HttpTestingController;
  let ajoutes: MotPreparationDto[][];
  let focusChamp: number;
  let annonces: string[];
  let afficher: ReturnType<typeof vi.fn<(message: string, annuler: () => unknown) => void>>;
  const original = { creer: URL.createObjectURL, revoquer: URL.revokeObjectURL };

  const tour = () => new Promise((fin) => setTimeout(fin));
  async function stabiliser() {
    await tour();
    await fixture.whenStable();
    await tour();
  }
  const texte = (selecteur: string) =>
    racine.querySelector(selecteur)?.textContent?.replace(/\s+/g, ' ').trim();
  const formes = () =>
    [...racine.querySelectorAll('.encart__forme')].map((forme) => forme.textContent?.trim());
  const bouton = (nom: string) =>
    racine.querySelector<HTMLButtonElement>(`button[aria-label="${nom}"]`)!;
  const boutonTexte = (libelle: string) =>
    [...racine.querySelectorAll<HTMLButtonElement>('button')].find(
      (element) => element.textContent?.trim() === libelle,
    )!;
  const bandeau = () => texte('app-bandeau-erreur [role="alert"]');

  async function ouvrir(candidats: RepriseMotPreparationDto[]) {
    serveur.expectOne(URL_REPRISES).flush(candidats);
    await stabiliser();
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
    afficher = vi.fn<(message: string, annuler: () => unknown) => void>();
    vi.spyOn(TestBed.inject(BandeauAnnuler), 'afficher').mockImplementation(afficher);
    fixture = TestBed.createComponent(EncartMotsDejaIllustres);
    ajoutes = [];
    focusChamp = 0;
    annonces = [];
    fixture.componentInstance.annonce.subscribe((message) => annonces.push(message));
    fixture.componentInstance.ajoutes.subscribe((mots) => ajoutes.push(mots));
    fixture.componentInstance.focusChamp.subscribe(() => focusChamp++);
    fixture.componentRef.setInput('preparationId', 'p1');
    racine = fixture.nativeElement as HTMLElement;
    document.body.appendChild(racine);
    await stabiliser();
  });

  afterEach(() => {
    serveur.match((requete) => requete.url.endsWith('/fichier'));
    serveur.verify();
    racine.remove();
    URL.createObjectURL = original.creer;
    URL.revokeObjectURL = original.revoquer;
  });

  it('ouverture avec 9 candidats : région nommée par son titre, vignettes, forme, Sens et boutons nommés', async () => {
    await ouvrir(NEUF);

    const region = racine.querySelector('section.encart')!;
    expect(
      racine.querySelector(`[id="${region.getAttribute('aria-labelledby')}"]`)?.textContent?.trim(),
    ).toBe('9 mots déjà illustrés pour cet album');
    expect(racine.querySelectorAll('.encart__mot')).toHaveLength(9);
    expect(racine.querySelectorAll('app-vignette-reprise.encart__photo img')).toHaveLength(9);
    expect(racine.querySelector('img')?.getAttribute('alt')).toBe('chemin, chemin');
    expect(texte('.encart__mot:nth-child(2) .encart__sens')).toBe('étalé (nom)');
    expect(bouton('Reprendre « étalé »').textContent?.trim()).toBe('Reprendre');
    expect(bouton('Écarter « étalé »').textContent?.trim()).toBe('Écarter');
    expect(boutonTexte('Tout reprendre')).toBeTruthy();
  });

  it('aucun candidat : pas d’Encart', async () => {
    await ouvrir([]);

    expect(racine.querySelector('section.encart')).toBeNull();
  });

  it('les Mots déjà dans la Grille ne sont plus montrés', async () => {
    await ouvrir([ETALE, GALETTE, RENARD]);

    fixture.componentRef.setInput('motsPresents', new Set([GALETTE.motId]));
    await stabiliser();

    expect(formes()).toEqual(['étalé', 'renard']);
    expect(texte('.encart__titre')).toBe('2 mots déjà illustrés pour cet album');
  });

  it('Reprendre : le Mot est ajouté avec son Image, le titre suit, le focus passe au Mot suivant', async () => {
    await ouvrir(NEUF);

    bouton('Reprendre « étalé »').focus();
    bouton('Reprendre « étalé »').click();
    const requete = serveur.expectOne(URL_REUTILISATION);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({ motId: 'm-etale', imageId: 'i-etale' });
    requete.flush(ajoute(reprise('étalé'), 4));
    await stabiliser();

    expect(ajoutes).toEqual([[ajoute(reprise('étalé'), 4)]]);
    expect(formes()).not.toContain('étalé');
    expect(texte('.encart__titre')).toBe('8 mots déjà illustrés pour cet album');
    expect(document.activeElement).toBe(bouton('Reprendre « four »'));
    expect(annonces.at(-1)).toBe(
      '« étalé » repris avec son image. 8 mots déjà illustrés pour cet album.',
    );
  });

  it('Écarter puis Annuler : le Mot quitte l’Encart, puis revient à sa place', async () => {
    await ouvrir([ETALE, GALETTE, RENARD]);

    bouton('Écarter « galette »').click();
    const ecart = serveur.expectOne(`/api/preparations/p1/ecartes/${GALETTE.motId}`);
    expect(ecart.request.method).toBe('PUT');
    ecart.flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();

    expect(formes()).toEqual(['étalé', 'renard']);
    expect(document.activeElement).toBe(bouton('Reprendre « renard »'));
    expect(afficher).toHaveBeenCalledWith(
      '« galette » écarté des mots déjà illustrés.',
      expect.any(Function),
      expect.anything(),
    );

    afficher.mock.calls[0][1]();
    const annulation = serveur.expectOne(`/api/preparations/p1/ecartes/${GALETTE.motId}`);
    expect(annulation.request.method).toBe('DELETE');
    annulation.flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();
    // L'Encart est relu : l'ordre est celui du back.
    serveur.expectOne(URL_REPRISES).flush([GALETTE, ETALE, RENARD]);
    await stabiliser();

    expect(formes()).toEqual(['galette', 'étalé', 'renard']);
    expect(document.activeElement).toBe(bouton('Reprendre « galette »'));
    expect(annonces.at(-1)).toBe('« galette » rendu. 3 mots déjà illustrés pour cet album.');
    expect(ajoutes).toEqual([]);
  });

  it('Annuler un écart d’un Mot qui n’est plus candidat : il ne revient pas, rien n’est annoncé', async () => {
    await ouvrir([ETALE, GALETTE, RENARD]);

    bouton('Écarter « galette »').click();
    serveur
      .expectOne(`/api/preparations/p1/ecartes/${GALETTE.motId}`)
      .flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();
    const annoncesAvant = annonces.length;

    afficher.mock.calls[0][1]();
    serveur
      .expectOne(`/api/preparations/p1/ecartes/${GALETTE.motId}`)
      .flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();
    serveur.expectOne(URL_REPRISES).flush([ETALE, RENARD]);
    await stabiliser();

    expect(formes()).toEqual(['étalé', 'renard']);
    expect(annonces.length).toBe(annoncesAvant);
  });

  it('Annuler pendant un autre geste : aucune requête, « Réessayer » relance l’annulation', async () => {
    await ouvrir([ETALE, GALETTE, RENARD]);

    bouton('Écarter « galette »').click();
    serveur
      .expectOne(`/api/preparations/p1/ecartes/${GALETTE.motId}`)
      .flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();

    bouton('Reprendre « étalé »').click();
    afficher.mock.calls[0][1]();
    await stabiliser();
    serveur.expectNone(`/api/preparations/p1/ecartes/${GALETTE.motId}`);
    expect(bandeau()).toBe("« galette » n'a pas été rendu : une autre action est en cours.");
    serveur.expectOne(URL_REUTILISATION).flush(ajoute(ETALE, 1));
    await stabiliser();

    boutonTexte('Réessayer').click();
    serveur
      .expectOne(`/api/preparations/p1/ecartes/${GALETTE.motId}`)
      .flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();
    serveur.expectOne(URL_REPRISES).flush([GALETTE, RENARD]);
    await stabiliser();

    expect(formes()).toEqual(['galette', 'renard']);
  });

  it('dernier Mot repris ou écarté : l’Encart disparaît et le focus va au champ', async () => {
    await ouvrir([ETALE, GALETTE]);

    bouton('Reprendre « galette »').click();
    serveur.expectOne(URL_REUTILISATION).flush(ajoute(GALETTE, 1));
    await stabiliser();
    expect(document.activeElement).toBe(bouton('Reprendre « étalé »'));

    bouton('Écarter « étalé »').click();
    serveur
      .expectOne(`/api/preparations/p1/ecartes/${ETALE.motId}`)
      .flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();

    expect(racine.querySelector('section.encart')).toBeNull();
    expect(focusChamp).toBe(1);
  });

  it('Tout reprendre : les Mots affichés partent ensemble ; tous ajoutés, l’Encart disparaît', async () => {
    await ouvrir([ETALE, GALETTE, RENARD]);

    boutonTexte('Tout reprendre').click();
    const requete = serveur.expectOne(URL_REPRISES);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({ motIds: ['m-etale', 'm-galette', 'm-renard'] });
    requete.flush([ajoute(ETALE, 1), ajoute(GALETTE, 2), ajoute(RENARD, 3)]);
    await stabiliser();

    expect(ajoutes).toEqual([[ajoute(ETALE, 1), ajoute(GALETTE, 2), ajoute(RENARD, 3)]]);
    expect(racine.querySelector('section.encart')).toBeNull();
    expect(focusChamp).toBe(1);
  });

  it('Tout reprendre partiel : « 1 mot n’a pas pu être repris. », Encart rechargé', async () => {
    await ouvrir([ETALE, GALETTE, RENARD]);

    boutonTexte('Tout reprendre').click();
    serveur.expectOne(URL_REPRISES).flush([ajoute(ETALE, 1), ajoute(RENARD, 2)]);
    await stabiliser();
    const relecture = serveur.expectOne(URL_REPRISES);
    expect(relecture.request.method).toBe('GET');
    relecture.flush([GALETTE]);
    await stabiliser();

    expect(ajoutes).toEqual([[ajoute(ETALE, 1), ajoute(RENARD, 2)]]);
    expect(bandeau()).toBe("1 mot n'a pas pu être repris.");
    expect(formes()).toEqual(['galette']);
    expect(annonces.at(-1)).toBe('2 mots repris. 1 mot déjà illustré pour cet album.');
  });

  it('Tout reprendre avec 201 candidats : deux lots, dans l’ordre, de 200 puis 1', async () => {
    const candidats = Array.from({ length: 201 }, (_, index) =>
      reprise(`mot${String(index).padStart(3, '0')}`),
    );
    await ouvrir(candidats);

    boutonTexte('Tout reprendre').click();
    const premier = serveur.expectOne((r) => r.method === 'POST' && r.url === URL_REPRISES);
    expect(premier.request.body).toEqual({
      motIds: candidats.slice(0, 200).map((candidat) => candidat.motId),
    });
    premier.flush(candidats.slice(0, 199).map((candidat, index) => ajoute(candidat, index + 1)));
    await stabiliser();
    const second = serveur.expectOne((r) => r.method === 'POST' && r.url === URL_REPRISES);
    expect(second.request.body).toEqual({ motIds: [candidats[200].motId] });
    second.flush([ajoute(candidats[200], 200)]);
    await stabiliser();
    serveur.expectOne((r) => r.method === 'GET' && r.url === URL_REPRISES).flush([]);
    await stabiliser();

    expect(ajoutes).toHaveLength(1);
    expect(ajoutes[0]).toHaveLength(200);
    expect(bandeau()).toBe("1 mot n'a pas pu être repris.");
    expect(annonces.at(-1)).toBe('200 mots repris.');
  });

  it('échec réseau de « Tout reprendre » : Bandeau « Réessayer », Encart inchangé, rien d’émis ; « Réessayer » renvoie', async () => {
    await ouvrir([ETALE, GALETTE]);

    boutonTexte('Tout reprendre').click();
    serveur.expectOne(URL_REPRISES).error(new ProgressEvent('error'));
    await stabiliser();

    expect(bandeau()).toBe(`Les mots n'ont pas été repris. ${MESSAGE_RESEAU}`);
    expect(formes()).toEqual(['étalé', 'galette']);
    expect(ajoutes).toEqual([]);

    boutonTexte('Réessayer').click();
    const reprise2 = serveur.expectOne(URL_REPRISES);
    expect(reprise2.request.body).toEqual({ motIds: ['m-etale', 'm-galette'] });
    reprise2.flush([ajoute(ETALE, 1), ajoute(GALETTE, 2)]);
    await stabiliser();

    expect(ajoutes).toHaveLength(1);
    expect(racine.querySelector('section.encart')).toBeNull();
  });

  it('refus métier de « Tout reprendre » (400) : message sans « Réessayer »', async () => {
    await ouvrir([ETALE, GALETTE]);

    boutonTexte('Tout reprendre').click();
    serveur
      .expectOne(URL_REPRISES)
      .flush({ code: 'requete.invalide' }, { status: 400, statusText: 'Bad Request' });
    await stabiliser();

    expect(bandeau()).toBe(
      "Les mots n'ont pas été repris. La demande est incomplète. Vérifiez la saisie, puis réessayez.",
    );
    expect(boutonTexte('Réessayer')).toBeUndefined();
    expect(ajoutes).toEqual([]);
  });

  it('échec de la lecture initiale : Bandeau « Réessayer », qui relit les candidats', async () => {
    serveur.expectOne(URL_REPRISES).error(new ProgressEvent('error'));
    await stabiliser();

    expect(bandeau()).toBe(MESSAGE_RESEAU);
    expect(racine.querySelector('section.encart')).toBeNull();

    boutonTexte('Réessayer').click();
    await ouvrir([ETALE]);

    expect(bandeau()).toBeUndefined();
    expect(formes()).toEqual(['étalé']);
  });

  it('la Marque « déjà utilisée » n’apparaît que sur une Image déjà utilisée', async () => {
    await ouvrir([ETALE, { ...GALETTE, image: { ...GALETTE.image, dejaUtilisee: true } }]);

    const marques = [...racine.querySelectorAll('.encart__mot')].map(
      (mot) => mot.querySelector('.encart__marque')?.textContent?.trim() ?? null,
    );
    expect(marques).toEqual([null, 'déjà utilisée']);
  });

  it('échec réseau d’une reprise : Bandeau « Réessayer », Encart inchangé ; « Réessayer » renvoie la reprise', async () => {
    await ouvrir([ETALE, GALETTE]);

    bouton('Reprendre « étalé »').click();
    serveur.expectOne(URL_REUTILISATION).error(new ProgressEvent('error'));
    await stabiliser();

    expect(bandeau()).toBe(`« étalé » n'a pas été repris. ${MESSAGE_RESEAU}`);
    expect(formes()).toEqual(['étalé', 'galette']);
    expect(ajoutes).toEqual([]);

    boutonTexte('Réessayer').click();
    serveur.expectOne(URL_REUTILISATION).flush(ajoute(ETALE, 1));
    await stabiliser();

    expect(bandeau()).toBeUndefined();
    expect(formes()).toEqual(['galette']);
  });

  it('échec réseau d’un écart : Bandeau « Réessayer », Encart inchangé', async () => {
    await ouvrir([ETALE, GALETTE]);

    bouton('Écarter « étalé »').click();
    serveur
      .expectOne(`/api/preparations/p1/ecartes/${ETALE.motId}`)
      .error(new ProgressEvent('error'));
    await stabiliser();

    expect(bandeau()).toBe(`« étalé » n'a pas été écarté. ${MESSAGE_RESEAU}`);
    expect(boutonTexte('Réessayer')).toBeTruthy();
    expect(formes()).toEqual(['étalé', 'galette']);
    expect(afficher).not.toHaveBeenCalled();
  });

  it('refus métier d’une reprise : son message, puis l’Encart est rechargé', async () => {
    await ouvrir([ETALE, GALETTE]);

    bouton('Reprendre « étalé »').click();
    serveur
      .expectOne(URL_REUTILISATION)
      .flush({ code: 'image.indisponible' }, { status: 404, statusText: 'Not Found' });
    await stabiliser();
    serveur.expectOne(URL_REPRISES).flush([GALETTE]);
    await stabiliser();

    expect(bandeau()).toBe("« étalé » n'a pas pu être repris : son image n'est plus disponible.");
    expect(boutonTexte('Réessayer')).toBeUndefined();
    expect(formes()).toEqual(['galette']);

    bouton('Reprendre « galette »').click();
    serveur
      .expectOne(URL_REUTILISATION)
      .flush({ code: 'preparation.mot_deja_present' }, { status: 409, statusText: 'Conflict' });
    await stabiliser();
    serveur.expectOne(URL_REPRISES).flush([]);
    await stabiliser();

    expect(bandeau()).toBe('« galette » est déjà dans la préparation.');
    expect(racine.querySelector('section.encart')).toBeNull();
  });

  it('refus d’un autre code qu’une Image indisponible : message traduit du code', async () => {
    await ouvrir([ETALE]);

    bouton('Reprendre « étalé »').click();
    serveur
      .expectOne(URL_REUTILISATION)
      .flush({ code: 'preparation.mot_deja_illustre' }, { status: 409, statusText: 'Conflict' });
    await stabiliser();
    serveur.expectOne(URL_REPRISES).flush([]);
    await stabiliser();

    expect(bandeau()).toBe(
      "« étalé » n'a pas pu être repris. Ce mot a déjà une image dans la préparation.",
    );
  });

  it('404 ressource.introuvable (Préparation ou Mot disparu) : message générique du code', async () => {
    await ouvrir([ETALE]);

    bouton('Reprendre « étalé »').click();
    serveur
      .expectOne(URL_REUTILISATION)
      .flush({ code: 'ressource.introuvable' }, { status: 404, statusText: 'Not Found' });
    await stabiliser();
    serveur.expectOne(URL_REPRISES).flush([]);
    await stabiliser();

    expect(bandeau()).toBe(
      "« étalé » n'a pas pu être repris. Cet élément n'existe plus. Rechargez la page.",
    );
  });

  it('refus sous verrou (409 ressource.introuvable) : « image indisponible », puis l’Encart est rechargé', async () => {
    await ouvrir([ETALE, GALETTE]);

    bouton('Reprendre « étalé »').click();
    serveur
      .expectOne(URL_REUTILISATION)
      .flush({ code: 'ressource.introuvable' }, { status: 409, statusText: 'Conflict' });
    await stabiliser();
    serveur.expectOne(URL_REPRISES).flush([GALETTE]);
    await stabiliser();

    expect(bandeau()).toBe("« étalé » n'a pas pu être repris : son image n'est plus disponible.");
    expect(boutonTexte('Réessayer')).toBeUndefined();
    expect(formes()).toEqual(['galette']);
  });

  describe('relecture pendant un geste', () => {
    it('relecture puis écart : le candidat écarté ne revient pas ; la relecture relancée garde le Mot rendu par la page', async () => {
      await ouvrir([ETALE, GALETTE, RENARD]);

      // Retrait de « four » de la Grille : la page relit l'Encart, où « four » doit revenir.
      void fixture.componentInstance.recharger();
      const relecture = serveur.expectOne(URL_REPRISES);
      bouton('Écarter « galette »').click();
      serveur
        .expectOne(`/api/preparations/p1/ecartes/${GALETTE.motId}`)
        .flush(null, { status: 204, statusText: 'No Content' });
      await stabiliser();
      expect(formes()).toEqual(['étalé', 'renard']);

      // Réponse partie avant l'écart : ignorée, la lecture est relancée.
      relecture.flush([ETALE, reprise('four'), GALETTE, RENARD]);
      await stabiliser();
      expect(formes()).toEqual(['étalé', 'renard']);

      serveur.expectOne(URL_REPRISES).flush([ETALE, reprise('four'), RENARD]);
      await stabiliser();

      expect(formes()).toEqual(['étalé', 'four', 'renard']);
    });

    it('deux relectures croisées : seule la plus récente écrit, même arrivée la première', async () => {
      await ouvrir([ETALE]);

      void fixture.componentInstance.recharger();
      void fixture.componentInstance.recharger();
      const [premiere, seconde] = serveur.match(URL_REPRISES);
      seconde.flush([ETALE, GALETTE]);
      await stabiliser();
      premiere.flush([RENARD]);
      await stabiliser();

      expect(formes()).toEqual(['étalé', 'galette']);
    });

    it('relecture pendant l’annulation d’un écart : la réponse périmée est relancée, le Mot rendu reste', async () => {
      await ouvrir([ETALE, GALETTE]);
      bouton('Écarter « galette »').click();
      serveur
        .expectOne(`/api/preparations/p1/ecartes/${GALETTE.motId}`)
        .flush(null, { status: 204, statusText: 'No Content' });
      await stabiliser();

      void fixture.componentInstance.recharger();
      const relecture = serveur.expectOne(URL_REPRISES);
      afficher.mock.calls[0][1]();
      serveur
        .expectOne(`/api/preparations/p1/ecartes/${GALETTE.motId}`)
        .flush(null, { status: 204, statusText: 'No Content' });
      await stabiliser();
      // Relecture de l'annulation : la plus récente.
      serveur.expectOne(URL_REPRISES).flush([ETALE, GALETTE]);
      await stabiliser();
      relecture.flush([ETALE]);
      await stabiliser();

      expect(formes()).toEqual(['étalé', 'galette']);
    });

    it('relecture puis reprise : le candidat repris ne revient pas à l’arrivée de la relecture', async () => {
      await ouvrir([ETALE, GALETTE, RENARD]);

      void fixture.componentInstance.recharger();
      const relecture = serveur.expectOne(URL_REPRISES);
      bouton('Reprendre « étalé »').click();
      serveur.expectOne(URL_REUTILISATION).flush(ajoute(ETALE, 3));
      await stabiliser();
      expect(formes()).toEqual(['galette', 'renard']);

      relecture.flush([ETALE, GALETTE, RENARD]);
      await stabiliser();
      expect(formes()).toEqual(['galette', 'renard']);
      // Lecture relancée, après la reprise.
      serveur.expectOne(URL_REPRISES).flush([GALETTE, RENARD]);
      await stabiliser();

      expect(formes()).toEqual(['galette', 'renard']);
      expect(ajoutes).toEqual([[ajoute(ETALE, 3)]]);
    });

    it('relecture puis « Tout reprendre » : les candidats repris ne reviennent pas', async () => {
      await ouvrir([ETALE, GALETTE]);

      void fixture.componentInstance.recharger();
      const relecture = serveur.expectOne(URL_REPRISES);
      boutonTexte('Tout reprendre').click();
      serveur
        .expectOne({ url: URL_REPRISES, method: 'POST' })
        .flush([ajoute(ETALE, 3), ajoute(GALETTE, 4)]);
      await stabiliser();
      expect(racine.querySelector('section.encart')).toBeNull();

      relecture.flush([ETALE, GALETTE]);
      await stabiliser();
      expect(racine.querySelector('section.encart')).toBeNull();
      serveur.expectOne(URL_REPRISES).flush([]);
      await stabiliser();

      expect(racine.querySelector('section.encart')).toBeNull();
    });

    it('relecture seule : la liste relue remplace l’Encart', async () => {
      await ouvrir([ETALE, GALETTE]);

      void fixture.componentInstance.recharger();
      serveur.expectOne(URL_REPRISES).flush([RENARD, ETALE]);
      await stabiliser();

      expect(formes()).toEqual(['renard', 'étalé']);
    });
  });
});
