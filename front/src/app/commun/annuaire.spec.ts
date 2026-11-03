import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Annuaire } from './annuaire';

const PAUL = {
  id: '0190f0a0-0000-7000-8000-000000000001',
  nomAffiche: 'Paul Roumy',
  statut: 'actif',
} as const;
const AGATHE = {
  id: '0190f0a0-0000-7000-8000-000000000002',
  nomAffiche: 'Agathe Petit',
  statut: 'desactive',
} as const;

type Requete = ReturnType<HttpTestingController['expectOne']>;

describe('Annuaire', () => {
  let annuaire: Annuaire;
  let serveur: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    annuaire = TestBed.inject(Annuaire);
    serveur = TestBed.inject(HttpTestingController);
  });

  afterEach(() => serveur.verify());

  /** Laisse partir la requête du client généré et la rend, sans la servir. */
  async function requete(): Promise<Requete> {
    await new Promise((fin) => setTimeout(fin));
    return serveur.expectOne('/api/enseignants');
  }

  async function servir(chargement: Promise<void>, reponse: (requete: Requete) => void) {
    reponse(await requete());
    await chargement;
  }

  it('est en chargement avant la réponse', () => {
    expect(annuaire.etat()).toEqual({ statut: 'chargement' });
    expect(annuaire.enseignant(PAUL.id)).toBeNull();
  });

  it('résout un identifiant après le chargement', async () => {
    await servir(annuaire.charger(), (r) => r.flush([PAUL, AGATHE]));
    expect(annuaire.etat()).toEqual({ statut: 'charge', enseignants: [PAUL, AGATHE] });
    expect(annuaire.enseignant(AGATHE.id)).toEqual(AGATHE);
  });

  it('renvoie null pour un identifiant absent', async () => {
    await servir(annuaire.charger(), (r) => r.flush([PAUL]));
    expect(annuaire.enseignant('0190f0a0-0000-7000-8000-000000000099')).toBeNull();
  });

  it('ne lit l’annuaire qu’une fois, appels concurrents compris', async () => {
    const premier = annuaire.charger();
    const second = annuaire.charger();
    await servir(premier, (r) => r.flush([PAUL]));
    await second;
    await annuaire.charger();
    await new Promise((fin) => setTimeout(fin));
    serveur.expectNone('/api/enseignants');
    expect(annuaire.enseignant(PAUL.id)).toEqual(PAUL);
  });

  it('un échec n’est pas mis en cache : le chargement suivant relit', async () => {
    await servir(annuaire.charger(), (r) =>
      r.flush(null, { status: 500, statusText: 'Server Error' }),
    );
    expect(annuaire.etat()).toEqual({ statut: 'erreur' });

    await servir(annuaire.charger(), (r) => r.flush([PAUL]));
    expect(annuaire.etat()).toEqual({ statut: 'charge', enseignants: [PAUL] });
  });

  it('recharger() relit un annuaire déjà chargé', async () => {
    await servir(annuaire.charger(), (r) => r.flush([PAUL]));
    await servir(annuaire.recharger(), (r) => r.flush([PAUL, AGATHE]));
    expect(annuaire.enseignant(AGATHE.id)).toEqual(AGATHE);

    await annuaire.charger();
    await new Promise((fin) => setTimeout(fin));
    serveur.expectNone('/api/enseignants');
  });

  it('une réponse dépassée par recharger() est ignorée', async () => {
    const ancien = annuaire.charger();
    const ancienne = await requete();
    const nouveau = annuaire.recharger();
    const nouvelle = await requete();

    nouvelle.flush([PAUL, AGATHE]);
    await nouveau;
    ancienne.flush([PAUL]);
    await ancien;
    expect(annuaire.etat()).toEqual({ statut: 'charge', enseignants: [PAUL, AGATHE] });
  });

  it('un échec de recharger() garde les noms déjà chargés, et le charger() suivant relit', async () => {
    await servir(annuaire.charger(), (r) => r.flush([PAUL]));
    await servir(annuaire.recharger(), (r) =>
      r.flush(null, { status: 500, statusText: 'Server Error' }),
    );
    expect(annuaire.etat()).toEqual({ statut: 'charge', enseignants: [PAUL] });
    expect(annuaire.enseignant(PAUL.id)).toEqual(PAUL);

    await servir(annuaire.charger(), (r) => r.flush([PAUL, AGATHE]));
    expect(annuaire.enseignant(AGATHE.id)).toEqual(AGATHE);
  });

  it('un échec d’une lecture dépassée par recharger() est ignoré', async () => {
    const ancien = annuaire.charger();
    const ancienne = await requete();
    const nouveau = annuaire.recharger();
    const nouvelle = await requete();

    nouvelle.flush([PAUL, AGATHE]);
    await nouveau;
    ancienne.flush(null, { status: 500, statusText: 'Server Error' });
    await ancien;
    expect(annuaire.etat()).toEqual({ statut: 'charge', enseignants: [PAUL, AGATHE] });

    await annuaire.charger();
    await new Promise((fin) => setTimeout(fin));
    serveur.expectNone('/api/enseignants');
  });
});
