import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  MesDonnees,
  PageDonneesPersonnelles,
  TexteDonneesPersonnelles,
} from './donnees-personnelles';

function rendre<T>(composant: Type<T>): HTMLElement {
  const fixture = TestBed.createComponent(composant);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const texteDe = (element: HTMLElement) => (element.textContent ?? '').replace(/\s+/g, ' ');

describe('TexteDonneesPersonnelles', () => {
  it('dit quelles données, pourquoi, combien de temps et comment demander l’effacement, en titres de niveau 2', () => {
    const racine = rendre(TexteDonneesPersonnelles);

    expect([...racine.querySelectorAll('h2')].map((titre) => titre.textContent?.trim())).toEqual([
      "Ce que l'application conserve",
      'Pourquoi',
      'Combien de temps',
      "Demander l'effacement",
    ]);
    expect(racine.querySelector('h1')).toBeNull();
    // Les sous-titres suivent les titres : aucun niveau sauté.
    expect(racine.querySelector('h4, h5, h6')).toBeNull();
  });

  it('liste les données du compte, les cookies et les journaux', () => {
    const texte = texteDe(rendre(TexteDonneesPersonnelles));

    for (const donnee of [
      'votre nom affiché',
      'votre adresse e-mail',
      "le prénom et le nom saisis à l'activation du compte",
      'votre mot de passe, protégé',
      'votre rôle',
      'le statut du compte',
      'sa date de création',
      'les Images que vous ajoutez, avec leur auteur',
      'vos Préparations',
      "l'historique des Fiches",
      'vos notifications',
      'les mois au cours desquels vous avez utilisé',
      'cookies de session du service de connexion (Keycloak)',
      'une donnée technique gardée dans le navigateur le temps de la connexion',
      'Aucun autre cookie, aucun autre stockage.',
      'Ils ne contiennent pas votre adresse e-mail.',
    ]) {
      expect(texte).toContain(donnee);
    }
  });

  it('promet : ni publicité, ni traceur, ni mesure d’audience, ni donnée d’élève', () => {
    const texte = texteDe(rendre(TexteDonneesPersonnelles));

    expect(texte).toContain("aucune publicité, aucun traceur, aucune mesure d'audience");
    expect(texte).toContain("aucune donnée d'élève");
  });

  it('donne les durées, dont les 14 jours des sauvegardes, et la réserve du délégué à la protection des données', () => {
    const texte = texteDe(rendre(TexteDonneesPersonnelles));

    expect(texte).toContain('tant que votre compte existe');
    expect(texte).toContain(
      "un compte sans connexion depuis un an est signalé à l'administrateur de l'école",
    );
    expect(texte).toContain("jusqu'à 14 jours dans les sauvegardes");
    expect(texte).toContain('en cours de validation avec le délégué à la protection des données');
    expect(texte).toContain("Demandez-le à l'administrateur de l'école.");
  });

  it('ne contient aucun lien vers un autre site', () => {
    const racine = rendre(TexteDonneesPersonnelles);

    expect(racine.querySelector('a[href^="http"], a[href^="//"]')).toBeNull();
  });
});

describe('MesDonnees', () => {
  it('affiche le texte sous le titre « Mes données »', () => {
    const racine = rendre(MesDonnees);

    expect(racine.querySelector('h1')?.textContent).toBe('Mes données');
    expect(racine.querySelector('app-texte-donnees-personnelles h2')).not.toBeNull();
  });
});

describe('PageDonneesPersonnelles', () => {
  it('en-tête minimal, lien « Ouvrir corpus-mots » vers la racine, puis le texte sous le titre de la page', () => {
    const racine = rendre(PageDonneesPersonnelles);

    const liens = racine.querySelectorAll<HTMLAnchorElement>('a');
    expect(liens).toHaveLength(1);
    expect(liens[0].textContent?.trim()).toBe('Ouvrir corpus-mots');
    expect(liens[0].getAttribute('href')).toBe('/');
    expect(
      racine.querySelector('header')?.compareDocumentPosition(racine.querySelector('main')!),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(racine.querySelector('main h1')?.textContent).toBe('Données personnelles');
    expect(racine.querySelector('main app-texte-donnees-personnelles')).not.toBeNull();
  });
});
