import { LiveAnnouncer } from '@angular/cdk/a11y';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { CompteDto } from '../../api/models/compte-dto';
import { BandeauAnnuler } from '../../commun/bandeau-annuler/bandeau-annuler';
import { CompteCourant } from '../../commun/compte-courant';
import { provideIcones } from '../../commun/icones';
import { Comptes, MESSAGE_EMAIL_INVALIDE } from './comptes';

const INVITEE: CompteDto = {
  id: '0190f0a0-0000-7000-8000-000000000106',
  email: 'a@ecole.fr',
  statut: 'invite',
  administrateur: false,
};
const ADMINISTRATEUR: CompteDto = {
  id: '0190f0a0-0000-7000-8000-000000000101',
  nomAffiche: 'Paul Roumy',
  email: 'paul@ecole.fr',
  statut: 'actif',
  administrateur: true,
};
const DESACTIVEE: CompteDto = {
  id: '0190f0a0-0000-7000-8000-000000000104',
  nomAffiche: 'Agathe Petit',
  email: 'agathe@ecole.fr',
  statut: 'desactive',
  administrateur: false,
};
const EQUIPE = [INVITEE, DESACTIVEE, ADMINISTRATEUR];

describe('Comptes', () => {
  let fixture: ComponentFixture<Comptes>;
  let racine: HTMLElement;
  let serveur: HttpTestingController;
  const announce = vi.fn(() => Promise.resolve());
  const afficher = vi.fn<(message: string, annuler: () => unknown) => void>();

  const tour = () => new Promise((fin) => setTimeout(fin));

  async function stabiliser() {
    await tour();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    announce.mockClear();
    afficher.mockClear();
    TestBed.configureTestingModule({
      imports: [Comptes],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideIcones(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
        { provide: LiveAnnouncer, useValue: { announce } },
        { provide: BandeauAnnuler, useValue: { afficher } },
        // L'administrateur connecté est Paul : « Désactiver » est absent de sa ligne.
        {
          provide: CompteCourant,
          useValue: {
            compte: signal({
              id: ADMINISTRATEUR.id,
              nomAffiche: 'Paul Roumy',
              administrateur: true,
            }),
          },
        },
      ],
    });
    serveur = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Comptes);
    racine = fixture.nativeElement as HTMLElement;
    await stabiliser();
  });

  afterEach(() => serveur.verify());

  async function servirListe(comptes: CompteDto[] = EQUIPE) {
    serveur.expectOne({ method: 'GET', url: '/api/comptes' }).flush(comptes);
    await stabiliser();
  }

  const champ = () => racine.querySelector<HTMLInputElement>('input[type="email"]')!;
  const erreurDuChamp = () => racine.querySelector('mat-error')?.textContent?.trim();
  const bandeau = () =>
    racine.querySelector('app-bandeau-erreur [role="alert"]')?.textContent?.trim();
  const bouton = (libelle: string) =>
    [...racine.querySelectorAll<HTMLButtonElement>('button')].filter(
      (element) => element.textContent?.trim() === libelle,
    );
  const renvoi = (email: string) =>
    racine.querySelector<HTMLButtonElement>(
      `button[aria-label="Renvoyer l'invitation à ${email}"]`,
    ) ?? undefined;
  const lignes = () =>
    [...racine.querySelectorAll('tr.mat-mdc-row')].map((ligne) =>
      [...ligne.querySelectorAll('td')].map((cellule) =>
        cellule.textContent?.replace(/\s+/g, ' ').trim(),
      ),
    );

  async function saisirEtInviter(valeur: string) {
    champ().value = valeur;
    champ().dispatchEvent(new Event('input'));
    bouton('Inviter')[0].click();
    await stabiliser();
  }

  it('squelettes pendant le chargement, puis la liste : nom, e-mail, statut, rôle', async () => {
    expect(racine.querySelector('h1')?.textContent?.trim()).toBe('Comptes');
    expect(racine.querySelector('app-squelette')).not.toBeNull();

    await servirListe();

    expect(racine.querySelector('app-squelette')).toBeNull();
    expect([...racine.querySelectorAll('th')].map((th) => th.textContent?.trim())).toEqual([
      'Nom',
      'E-mail',
      'Statut',
      'Rôle',
      'Actions',
    ]);
    expect(lignes()).toEqual([
      ['en attente', 'a@ecole.fr', 'invité', 'enseignant', "Renvoyer l'invitation Actions"],
      ['Agathe Petit', 'agathe@ecole.fr', 'désactivé', 'enseignant', 'Actions'],
      ['Paul Roumy', 'paul@ecole.fr', 'actif', 'administrateur', 'Actions'],
    ]);
    expect(racine.querySelector('table')?.getAttribute('aria-label')).toBe("Comptes de l'équipe");
    expect(renvoi('a@ecole.fr')?.textContent?.trim()).toBe("Renvoyer l'invitation");
  });

  it('Inviter : e-mail normalisé, champ vidé, envoi annoncé, liste rechargée', async () => {
    await servirListe();

    await saisirEtInviter(' Claire@ecole.fr ');
    const requete = serveur.expectOne({ method: 'POST', url: '/api/comptes' });
    expect(requete.request.body).toEqual({ email: 'claire@ecole.fr' });
    requete.flush(
      { id: '0190f0a0-0000-7000-8000-000000000200', email: 'claire@ecole.fr', statut: 'invite' },
      { status: 201, statusText: 'Created' },
    );
    await stabiliser();

    expect(announce).toHaveBeenCalledWith('Invitation envoyée à claire@ecole.fr.');
    expect(champ().value).toBe('');
    expect(erreurDuChamp()).toBeUndefined();
    await servirListe([
      {
        id: '0190f0a0-0000-7000-8000-000000000200',
        email: 'claire@ecole.fr',
        statut: 'invite',
        administrateur: false,
      },
      ...EQUIPE,
    ]);
    expect(lignes()[0]).toEqual([
      'en attente',
      'claire@ecole.fr',
      'invité',
      'enseignant',
      "Renvoyer l'invitation Actions",
    ]);
  });

  it('E-mail invalide ou vide : refusé avant l’envoi, message sous le champ', async () => {
    await servirListe();

    await saisirEtInviter('claire');
    expect(erreurDuChamp()).toBe(MESSAGE_EMAIL_INVALIDE);
    await saisirEtInviter('');
    expect(erreurDuChamp()).toBe(MESSAGE_EMAIL_INVALIDE);
    // Un espace intérieur n'est pas retiré : l'adresse est refusée telle quelle.
    await saisirEtInviter('claire dupont@ecole.fr');
    expect(erreurDuChamp()).toBe(MESSAGE_EMAIL_INVALIDE);
    // Caractères que Keycloak refuse, adresse de plus de 254 caractères.
    for (const adresse of ['a<b>@ecole.fr', 'a,b@ecole.fr', 'a"b@ecole.fr', 'a(b)@ecole.fr']) {
      await saisirEtInviter(adresse);
      expect(erreurDuChamp()).toBe(MESSAGE_EMAIL_INVALIDE);
    }
    await saisirEtInviter(`${'a'.repeat(250)}@b.fr`);
    expect(erreurDuChamp()).toBe(MESSAGE_EMAIL_INVALIDE);
    serveur.expectNone('/api/comptes');
  });

  it('E-mail déjà utilisé : message sous le champ, saisie gardée', async () => {
    await servirListe();

    await saisirEtInviter('paul@ecole.fr');
    serveur
      .expectOne({ method: 'POST', url: '/api/comptes' })
      .flush(
        { status: 409, code: 'compte.email_deja_utilise' },
        { status: 409, statusText: 'Conflict' },
      );
    await stabiliser();

    expect(erreurDuChamp()).toBe('Cet e-mail est déjà associé à un compte.');
    expect(champ().value).toBe('paul@ecole.fr');
    expect(bandeau()).toBeUndefined();
    expect(announce).not.toHaveBeenCalled();
  });

  it('Échec de l’invitation : Bandeau d’erreur, saisie gardée, « Réessayer » renvoie', async () => {
    await servirListe();

    await saisirEtInviter('claire@ecole.fr');
    serveur
      .expectOne({ method: 'POST', url: '/api/comptes' })
      .flush({ status: 500, code: 'erreur.interne' }, { status: 500, statusText: 'Server Error' });
    await stabiliser();

    expect(bandeau()).toBe('Le service ne répond pas comme prévu. Réessayez dans un instant.');
    expect(champ().value).toBe('claire@ecole.fr');

    bouton('Réessayer')[0].click();
    await stabiliser();
    serveur.expectOne({ method: 'POST', url: '/api/comptes' }).flush({
      id: '0190f0a0-0000-7000-8000-000000000200',
      email: 'claire@ecole.fr',
      statut: 'invite',
    });
    await stabiliser();

    expect(bandeau()).toBeUndefined();
    expect(champ().value).toBe('');
    await servirListe();
  });

  it('Échec du chargement de la liste : Bandeau d’erreur, « Réessayer » recharge', async () => {
    serveur.expectOne('/api/comptes').error(new ProgressEvent('error'));
    await stabiliser();

    expect(bandeau()).toBe(
      'Connexion au serveur impossible. Vérifiez votre réseau, puis réessayez.',
    );

    bouton('Réessayer')[0].click();
    await stabiliser();
    await servirListe();

    expect(bandeau()).toBeUndefined();
    expect(lignes()).toHaveLength(3);
  });

  it('Renvoyer l’invitation : envoi annoncé', async () => {
    await servirListe();

    renvoi('a@ecole.fr')!.click();
    await stabiliser();
    serveur
      .expectOne({ method: 'POST', url: `/api/comptes/${INVITEE.id}/invitation` })
      .flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();

    expect(announce).toHaveBeenCalledWith('Invitation renvoyée à a@ecole.fr.');
    expect(bandeau()).toBeUndefined();
  });

  it('Renvoyer à un compte devenu actif : Bandeau d’erreur et liste rechargée', async () => {
    await servirListe();

    renvoi('a@ecole.fr')!.click();
    await stabiliser();
    serveur
      .expectOne({ method: 'POST', url: `/api/comptes/${INVITEE.id}/invitation` })
      .flush(
        { status: 409, code: 'compte.invitation_inutile' },
        { status: 409, statusText: 'Conflict' },
      );
    await stabiliser();

    expect(bandeau()).toBe('Ce compte est déjà actif : aucune invitation à renvoyer.');
    await servirListe([{ ...INVITEE, statut: 'actif', nomAffiche: 'Claire Martin' }]);
    expect(renvoi('a@ecole.fr')).toBeUndefined();
  });

  it('Renvoyer à un compte supprimé : Bandeau d’erreur, « Réessayer » recharge la liste sans renvoyer', async () => {
    await servirListe();

    renvoi('a@ecole.fr')!.click();
    await stabiliser();
    serveur
      .expectOne({ method: 'POST', url: `/api/comptes/${INVITEE.id}/invitation` })
      .flush(
        { status: 404, code: 'ressource.introuvable' },
        { status: 404, statusText: 'Not Found' },
      );
    await stabiliser();

    expect(bandeau()).toBe("Cet élément n'existe plus. Rechargez la page.");
    await servirListe([DESACTIVEE, ADMINISTRATEUR]);

    bouton('Réessayer')[0].click();
    await stabiliser();
    serveur.expectNone(`/api/comptes/${INVITEE.id}/invitation`);
    await servirListe([DESACTIVEE, ADMINISTRATEUR]);
    expect(bandeau()).toBeUndefined();
  });

  it('Deux renvois en parallèle : chaque bouton reste désactivé jusqu’à sa propre réponse', async () => {
    const autre: CompteDto = {
      ...INVITEE,
      id: '0190f0a0-0000-7000-8000-000000000105',
      email: 'b@ecole.fr',
    };
    await servirListe([INVITEE, autre, ...EQUIPE.slice(1)]);

    renvoi('a@ecole.fr')!.click();
    renvoi('b@ecole.fr')!.click();
    await stabiliser();
    const requeteB = serveur.expectOne(`/api/comptes/${autre.id}/invitation`);
    serveur
      .expectOne(`/api/comptes/${INVITEE.id}/invitation`)
      .flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();

    expect(renvoi('a@ecole.fr')!.disabled).toBe(false);
    expect(renvoi('b@ecole.fr')!.disabled).toBe(true);

    requeteB.flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();
    expect(renvoi('b@ecole.fr')!.disabled).toBe(false);
  });

  it('« Réessayer » après un échec d’invitation renvoie l’adresse échouée, pas le champ modifié', async () => {
    await servirListe();

    await saisirEtInviter('claire@ecole.fr');
    serveur
      .expectOne({ method: 'POST', url: '/api/comptes' })
      .flush({ status: 500, code: 'erreur.interne' }, { status: 500, statusText: 'Server Error' });
    await stabiliser();

    champ().value = 'autre@ecole.fr';
    champ().dispatchEvent(new Event('input'));
    bouton('Réessayer')[0].click();
    await stabiliser();
    const requete = serveur.expectOne({ method: 'POST', url: '/api/comptes' });
    expect(requete.request.body).toEqual({ email: 'claire@ecole.fr' });
    requete.flush({
      id: '0190f0a0-0000-7000-8000-000000000200',
      email: 'claire@ecole.fr',
      statut: 'invite',
    });
    await stabiliser();

    expect(announce).toHaveBeenCalledWith('Invitation envoyée à claire@ecole.fr.');
    // La nouvelle saisie n'est pas effacée.
    expect(champ().value).toBe('autre@ecole.fr');
    await servirListe();
  });

  // --- Menu « Actions » (story 1.6) ---

  const COLLEGUE: CompteDto = {
    id: '0190f0a0-0000-7000-8000-000000000102',
    nomAffiche: 'Zoé Bernard',
    email: 'zoe@ecole.fr',
    statut: 'actif',
    administrateur: false,
  };

  const boutonActions = (nom: string) =>
    racine.querySelector<HTMLButtonElement>(`button[aria-label="Actions pour ${nom}"]`) ??
    undefined;
  const elementsDuMenu = () =>
    [...document.querySelectorAll<HTMLButtonElement>('.mat-mdc-menu-item')].map((element) =>
      element.textContent?.trim(),
    );

  async function ouvrirActions(nom: string) {
    boutonActions(nom)!.click();
    await stabiliser();
  }

  async function fermerMenu() {
    document
      .querySelector('.mat-mdc-menu-panel')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await stabiliser();
  }

  async function choisir(libelle: string) {
    [...document.querySelectorAll<HTMLButtonElement>('.mat-mdc-menu-item')]
      .find((element) => element.textContent?.trim() === libelle)!
      .click();
    await stabiliser();
  }

  /** Dernière opération inverse passée au Bandeau « Annuler ». */
  const operationInverse = () => afficher.mock.calls.at(-1)![1];

  it('Menu « Actions » : actions selon le statut et le rôle, sans « Désactiver » sur sa propre ligne', async () => {
    await servirListe([INVITEE, COLLEGUE, DESACTIVEE, ADMINISTRATEUR]);

    for (const [nom, attendus] of [
      ['a@ecole.fr', ['Désactiver', "Donner le rôle d'administrateur"]],
      ['Zoé Bernard', ['Désactiver', "Donner le rôle d'administrateur"]],
      ['Agathe Petit', ['Réactiver', "Donner le rôle d'administrateur"]],
      ['Paul Roumy', ["Retirer le rôle d'administrateur"]],
    ] as const) {
      await ouvrirActions(nom);
      expect(elementsDuMenu()).toEqual(attendus);
      await fermerMenu();
    }
  });

  it('Aucune action sur un compte en cours de suppression', async () => {
    await servirListe([{ ...COLLEGUE, statut: 'suppression_en_cours' }]);

    expect(boutonActions('Zoé Bernard')).toBeUndefined();
  });

  it('Désactiver : Bandeau « Annuler », liste rechargée ; « Annuler » réactive', async () => {
    await servirListe([COLLEGUE, ADMINISTRATEUR]);

    await ouvrirActions('Zoé Bernard');
    await choisir('Désactiver');
    serveur
      .expectOne({ method: 'POST', url: `/api/comptes/${COLLEGUE.id}/desactivation` })
      .flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();

    expect(afficher).toHaveBeenCalledTimes(1);
    expect(afficher.mock.calls[0][0]).toBe('Compte de Zoé Bernard désactivé.');
    expect(bandeau()).toBeUndefined();
    await servirListe([{ ...COLLEGUE, statut: 'desactive' }, ADMINISTRATEUR]);
    expect(lignes()[0][2]).toBe('désactivé');

    operationInverse()();
    await stabiliser();
    serveur
      .expectOne({ method: 'POST', url: `/api/comptes/${COLLEGUE.id}/reactivation` })
      .flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();

    // L'annulation n'ouvre pas de nouveau Bandeau « Annuler » : elle est annoncée.
    expect(afficher).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('Compte de Zoé Bernard réactivé.');
    await servirListe([COLLEGUE, ADMINISTRATEUR]);
  });

  it('Désactiver un invité : message avec son e-mail', async () => {
    await servirListe([INVITEE, ADMINISTRATEUR]);

    await ouvrirActions('a@ecole.fr');
    await choisir('Désactiver');
    serveur
      .expectOne(`/api/comptes/${INVITEE.id}/desactivation`)
      .flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();

    expect(afficher.mock.calls[0][0]).toBe('Compte de a@ecole.fr désactivé.');
    await servirListe();
  });

  it('Réactiver : Bandeau « Annuler », dont l’opération inverse désactive', async () => {
    await servirListe([DESACTIVEE, ADMINISTRATEUR]);

    await ouvrirActions('Agathe Petit');
    await choisir('Réactiver');
    serveur
      .expectOne({ method: 'POST', url: `/api/comptes/${DESACTIVEE.id}/reactivation` })
      .flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();

    expect(afficher.mock.calls[0][0]).toBe('Compte de Agathe Petit réactivé.');
    await servirListe();

    operationInverse()();
    await stabiliser();
    serveur
      .expectOne({ method: 'POST', url: `/api/comptes/${DESACTIVEE.id}/desactivation` })
      .flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();
    expect(announce).toHaveBeenCalledWith('Compte de Agathe Petit désactivé.');
    await servirListe();
  });

  it('Donner le rôle : Bandeau « Annuler », dont l’opération inverse retire le rôle', async () => {
    await servirListe([COLLEGUE, ADMINISTRATEUR]);

    await ouvrirActions('Zoé Bernard');
    await choisir("Donner le rôle d'administrateur");
    const requete = serveur.expectOne({
      method: 'PUT',
      url: `/api/comptes/${COLLEGUE.id}/administrateur`,
    });
    expect(requete.request.body).toEqual({ administrateur: true });
    requete.flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();

    expect(afficher.mock.calls[0][0]).toBe('Zoé Bernard est administrateur.');
    await servirListe([{ ...COLLEGUE, administrateur: true }, ADMINISTRATEUR]);
    expect(lignes()[0][3]).toBe('administrateur');

    operationInverse()();
    await stabiliser();
    const inverse = serveur.expectOne(`/api/comptes/${COLLEGUE.id}/administrateur`);
    expect(inverse.request.body).toEqual({ administrateur: false });
    inverse.flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();
    expect(announce).toHaveBeenCalledWith("Zoé Bernard n'est plus administrateur.");
    await servirListe([COLLEGUE, ADMINISTRATEUR]);
  });

  it('Retirer le rôle : Bandeau « Annuler »', async () => {
    await servirListe([{ ...COLLEGUE, administrateur: true }, ADMINISTRATEUR]);

    await ouvrirActions('Zoé Bernard');
    await choisir("Retirer le rôle d'administrateur");
    const requete = serveur.expectOne(`/api/comptes/${COLLEGUE.id}/administrateur`);
    expect(requete.request.body).toEqual({ administrateur: false });
    requete.flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();

    expect(afficher.mock.calls[0][0]).toBe("Zoé Bernard n'est plus administrateur.");
    await servirListe([COLLEGUE, ADMINISTRATEUR]);
  });

  it('Dernier administrateur : Bandeau d’erreur, liste rechargée, « Réessayer » recharge sans rejouer', async () => {
    await servirListe([COLLEGUE, ADMINISTRATEUR]);

    await ouvrirActions('Paul Roumy');
    await choisir("Retirer le rôle d'administrateur");
    serveur
      .expectOne(`/api/comptes/${ADMINISTRATEUR.id}/administrateur`)
      .flush(
        { status: 409, code: 'compte.dernier_administrateur' },
        { status: 409, statusText: 'Conflict' },
      );
    await stabiliser();

    expect(bandeau()).toBe('Il doit rester au moins un administrateur actif.');
    expect(afficher).not.toHaveBeenCalled();
    await servirListe([COLLEGUE, ADMINISTRATEUR]);

    bouton('Réessayer')[0].click();
    await stabiliser();
    serveur.expectNone(`/api/comptes/${ADMINISTRATEUR.id}/administrateur`);
    await servirListe([COLLEGUE, ADMINISTRATEUR]);
    expect(bandeau()).toBeUndefined();
  });

  it.each([
    [409, 'compte.statut_incompatible', 'Ce compte a changé entre-temps. La liste est rechargée.'],
    [404, 'ressource.introuvable', "Cet élément n'existe plus. Rechargez la page."],
    // Rôle retiré à soi-même : le jeton suivant n'a plus accès.
    [403, 'acces.refuse', "Cette action est réservée à l'administrateur."],
  ])(
    'Refus %i %s : message, liste rechargée, « Réessayer » recharge sans rejouer',
    async (status, code, message) => {
      await servirListe([DESACTIVEE, ADMINISTRATEUR]);

      await ouvrirActions('Agathe Petit');
      await choisir('Réactiver');
      serveur
        .expectOne(`/api/comptes/${DESACTIVEE.id}/reactivation`)
        .flush({ status, code }, { status, statusText: 'Refus' });
      await stabiliser();

      expect(bandeau()).toBe(message);
      await servirListe([{ ...DESACTIVEE, statut: 'actif' }, ADMINISTRATEUR]);
      expect(lignes()[0][2]).toBe('actif');

      bouton('Réessayer')[0].click();
      await stabiliser();
      serveur.expectNone(`/api/comptes/${DESACTIVEE.id}/reactivation`);
      await servirListe([{ ...DESACTIVEE, statut: 'actif' }, ADMINISTRATEUR]);
      expect(bandeau()).toBeUndefined();
    },
  );

  it('Chargements qui se chevauchent : seule la réponse du dernier est affichée', async () => {
    await servirListe([COLLEGUE, ADMINISTRATEUR]);

    await ouvrirActions('Zoé Bernard');
    await choisir('Désactiver');
    serveur
      .expectOne(`/api/comptes/${COLLEGUE.id}/desactivation`)
      .flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();
    // Annulation avant la réponse du rechargement : deux chargements en cours.
    operationInverse()();
    await stabiliser();
    serveur
      .expectOne(`/api/comptes/${COLLEGUE.id}/reactivation`)
      .flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();

    const [ancien, recent] = serveur.match({ method: 'GET', url: '/api/comptes' });
    recent.flush([COLLEGUE, ADMINISTRATEUR]);
    await stabiliser();
    ancien.flush([{ ...COLLEGUE, statut: 'desactive' }, ADMINISTRATEUR]);
    await stabiliser();

    expect(lignes()[0][2]).toBe('actif');
  });

  it('Échec de l’action : Bandeau d’erreur, « Réessayer » rejoue l’action', async () => {
    await servirListe([COLLEGUE, ADMINISTRATEUR]);

    await ouvrirActions('Zoé Bernard');
    await choisir('Désactiver');
    serveur
      .expectOne(`/api/comptes/${COLLEGUE.id}/desactivation`)
      .flush({ status: 500, code: 'erreur.interne' }, { status: 500, statusText: 'Server Error' });
    await stabiliser();

    expect(bandeau()).toBe('Le service ne répond pas comme prévu. Réessayez dans un instant.');
    await servirListe([COLLEGUE, ADMINISTRATEUR]);

    bouton('Réessayer')[0].click();
    await stabiliser();
    serveur
      .expectOne(`/api/comptes/${COLLEGUE.id}/desactivation`)
      .flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();

    expect(bandeau()).toBeUndefined();
    expect(afficher.mock.calls[0][0]).toBe('Compte de Zoé Bernard désactivé.');
    await servirListe([{ ...COLLEGUE, statut: 'desactive' }, ADMINISTRATEUR]);
  });

  it('Pendant une action, le bouton « Actions » de la ligne reste désactivé et garde le focus', async () => {
    await servirListe([COLLEGUE, ADMINISTRATEUR]);

    await ouvrirActions('Zoé Bernard');
    await choisir('Désactiver');
    const declencheur = boutonActions('Zoé Bernard')!;
    expect(declencheur.getAttribute('aria-disabled')).toBe('true');
    // Désactivé sans `disabled` natif : le menu lui rend le focus au lieu de le perdre sur <body>.
    expect(declencheur.disabled).toBe(false);
    expect(document.activeElement).toBe(declencheur);
    expect(boutonActions('Paul Roumy')!.getAttribute('aria-disabled')).not.toBe('true');

    serveur
      .expectOne(`/api/comptes/${COLLEGUE.id}/desactivation`)
      .flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();
    expect(boutonActions('Zoé Bernard')!.getAttribute('aria-disabled')).not.toBe('true');
    await servirListe([COLLEGUE, ADMINISTRATEUR]);
  });
});
