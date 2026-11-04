import { LiveAnnouncer } from '@angular/cdk/a11y';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MonCompteDto } from '../api/models/mon-compte-dto';
import { Annuaire, EtatAnnuaire } from '../commun/annuaire';
import { CompteCourant } from '../commun/compte-courant';
import { provideIcones } from '../commun/icones';
import { MonCompte } from './mon-compte';

const CLAIRE: MonCompteDto = {
  id: '0190f0a0-0000-7000-8000-000000000002',
  nomAffiche: 'Claire Martin',
  email: 'claire@ecole.fr',
  administrateur: false,
};
const CHEMIN = '/api/mon-compte/nom-affiche';

describe('MonCompte', () => {
  let fixture: ComponentFixture<MonCompte>;
  let racine: HTMLElement;
  let serveur: HttpTestingController;
  let compteCourant: CompteCourant;
  const announce = vi.fn(() => Promise.resolve());
  const recharger = vi.fn(() => Promise.resolve());
  const etatAnnuaire = signal<EtatAnnuaire>({ statut: 'chargement' });

  const tour = () => new Promise((fin) => setTimeout(fin));

  async function stabiliser() {
    await tour();
    await fixture.whenStable();
  }

  async function creer(compte: MonCompteDto = CLAIRE) {
    announce.mockClear();
    recharger.mockClear();
    etatAnnuaire.set({ statut: 'chargement' });
    TestBed.configureTestingModule({
      imports: [MonCompte],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideIcones(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
        { provide: LiveAnnouncer, useValue: { announce } },
        { provide: Annuaire, useValue: { etat: etatAnnuaire, recharger } },
      ],
    });
    serveur = TestBed.inject(HttpTestingController);
    compteCourant = TestBed.inject(CompteCourant);
    // La coquille ne rend la page qu'une fois le compte chargé.
    compteCourant.mettreAJour(compte);
    fixture = TestBed.createComponent(MonCompte);
    racine = fixture.nativeElement as HTMLElement;
    await stabiliser();
  }

  afterEach(() => serveur.verify());

  const champ = () => racine.querySelector<HTMLInputElement>('input')!;
  const enregistrer = () =>
    [...racine.querySelectorAll<HTMLButtonElement>('button')].find(
      (bouton) => bouton.textContent?.trim() === 'Enregistrer',
    )!;
  const actif = () => enregistrer().getAttribute('aria-disabled') !== 'true';

  async function saisir(valeur: string) {
    champ().value = valeur;
    champ().dispatchEvent(new Event('input'));
    champ().dispatchEvent(new Event('blur'));
    await stabiliser();
  }

  async function soumettre() {
    racine.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await stabiliser();
  }

  it('montre le nom affiché modifiable, l’e-mail et le rôle, avec leurs libellés, et rien d’autre', async () => {
    await creer();

    expect(racine.querySelector('h1')?.textContent).toBe('Mon compte');
    expect(champ().value).toBe('Claire Martin');
    expect(champ().labels?.[0]?.textContent?.trim()).toBe('Nom affiché');
    expect(racine.querySelectorAll('input, textarea, select')).toHaveLength(1);
    const lignes = [...racine.querySelectorAll('dl > div')].map((ligne) => [
      ligne.querySelector('dt')?.textContent?.trim(),
      ligne.querySelector('dd')?.textContent?.trim(),
    ]);
    expect(lignes).toEqual([
      ['E-mail', 'claire@ecole.fr'],
      ['Rôle', 'Enseignant'],
    ]);
  });

  it('rôle « Administrateur » ; e-mail absent du jeton : « Non renseigné »', async () => {
    await creer({ ...CLAIRE, email: '', administrateur: true });

    const valeurs = [...racine.querySelectorAll('dd')].map((dd) => dd.textContent?.trim());
    expect(valeurs).toEqual(['Non renseigné', 'Administrateur']);
  });

  it('« Enregistrer » inactif tant que la saisie, nettoyée, ne diffère pas du nom enregistré', async () => {
    await creer();
    expect(actif()).toBe(false);

    await saisir('  Claire Martin ');
    expect(actif()).toBe(false);

    await soumettre();
    serveur.expectNone(CHEMIN);

    await saisir('Claire Dupont');
    expect(actif()).toBe(true);
  });

  it.each([
    ['vide', ''],
    ['en espaces', '   '],
    ['de 101 caractères', ` ${'a'.repeat(101)} `],
  ])('nom %s : champ en erreur, pas d’envoi', async (_cas, valeur) => {
    await creer();
    await saisir(valeur);

    expect(actif()).toBe(false);
    await soumettre();
    serveur.expectNone(CHEMIN);
    expect(racine.querySelector('mat-error')?.textContent?.trim()).toBe(
      'Saisissez un nom de 1 à 100 caractères.',
    );
  });

  it('enregistre le nom nettoyé : compte courant à jour, annuaire chargé relu, annonce', async () => {
    await creer();
    etatAnnuaire.set({ statut: 'charge', enseignants: [] });
    await saisir('  Claire Dupont ');
    await soumettre();

    const requete = serveur.expectOne(CHEMIN);
    expect(requete.request.method).toBe('PUT');
    expect(requete.request.body).toEqual({ nomAffiche: 'Claire Dupont' });
    requete.flush({ ...CLAIRE, nomAffiche: 'Claire Dupont' });
    await stabiliser();

    expect(compteCourant.compte()?.nomAffiche).toBe('Claire Dupont');
    expect(champ().value).toBe('Claire Dupont');
    expect(actif()).toBe(false);
    expect(recharger).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('Nom affiché enregistré.');
  });

  it('annuaire pas encore chargé : il n’est pas lu', async () => {
    await creer();
    await saisir('Claire Dupont');
    await soumettre();
    serveur.expectOne(CHEMIN).flush({ ...CLAIRE, nomAffiche: 'Claire Dupont' });
    await stabiliser();

    expect(recharger).not.toHaveBeenCalled();
  });

  it('échec réseau ou 500 : Bandeau d’erreur, saisie gardée, « Réessayer » renvoie', async () => {
    await creer();
    await saisir('Claire Dupont');
    await soumettre();
    serveur.expectOne(CHEMIN).error(new ProgressEvent('error'));
    await stabiliser();

    expect(racine.querySelector('app-bandeau-erreur [role="alert"]')?.textContent?.trim()).toBe(
      'Connexion au serveur impossible. Vérifiez votre réseau, puis réessayez.',
    );
    expect(champ().value).toBe('Claire Dupont');
    expect(compteCourant.compte()?.nomAffiche).toBe('Claire Martin');

    [...racine.querySelectorAll<HTMLButtonElement>('app-bandeau-erreur button')]
      .find((bouton) => bouton.textContent?.trim() === 'Réessayer')!
      .click();
    await stabiliser();
    const nouvelEssai = serveur.expectOne(CHEMIN);
    expect(nouvelEssai.request.body).toEqual({ nomAffiche: 'Claire Dupont' });
    nouvelEssai.flush(null, { status: 500, statusText: 'Server Error' });
    await stabiliser();
    expect(racine.querySelector('app-bandeau-erreur')).not.toBeNull();
    expect(champ().value).toBe('Claire Dupont');
  });

  it('« Réessayer » sur une saisie revenue au nom enregistré : Bandeau d’erreur retiré, rien d’envoyé', async () => {
    await creer();
    await saisir('Claire Dupont');
    await soumettre();
    serveur.expectOne(CHEMIN).error(new ProgressEvent('error'));
    await stabiliser();
    expect(racine.querySelector('app-bandeau-erreur')).not.toBeNull();

    await saisir('Claire Martin');
    [...racine.querySelectorAll<HTMLButtonElement>('app-bandeau-erreur button')]
      .find((bouton) => bouton.textContent?.trim() === 'Réessayer')!
      .click();
    await stabiliser();

    serveur.expectNone(CHEMIN);
    expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
  });

  it('saisie modifiée pendant l’envoi : elle reste dans le champ', async () => {
    await creer();
    await saisir('Claire Dupont');
    await soumettre();
    const requete = serveur.expectOne(CHEMIN);
    await saisir('Claire Durand');
    requete.flush({ ...CLAIRE, nomAffiche: 'Claire Dupont' });
    await stabiliser();

    expect(compteCourant.compte()?.nomAffiche).toBe('Claire Dupont');
    expect(champ().value).toBe('Claire Durand');
    expect(actif()).toBe(true);
  });

  it('400 compte.nom_affiche_invalide du back : message du code dans le Bandeau d’erreur', async () => {
    await creer();
    await saisir('Claire Dupont');
    await soumettre();
    serveur
      .expectOne(CHEMIN)
      .flush(
        { status: 400, code: 'compte.nom_affiche_invalide' },
        { status: 400, statusText: 'Bad Request' },
      );
    await stabiliser();

    expect(racine.querySelector('app-bandeau-erreur [role="alert"]')?.textContent?.trim()).toBe(
      'Saisissez un nom de 1 à 100 caractères.',
    );
  });
});
