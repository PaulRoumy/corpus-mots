import { LiveAnnouncer } from '@angular/cdk/a11y';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { CompteDto } from '../../api/models/compte-dto';
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

  const tour = () => new Promise((fin) => setTimeout(fin));

  async function stabiliser() {
    await tour();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    announce.mockClear();
    TestBed.configureTestingModule({
      imports: [Comptes],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideIcones(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
        { provide: LiveAnnouncer, useValue: { announce } },
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
      [...ligne.querySelectorAll('td')].map((cellule) => cellule.textContent?.trim()),
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
      ['en attente', 'a@ecole.fr', 'invité', 'enseignant', "Renvoyer l'invitation"],
      ['Agathe Petit', 'agathe@ecole.fr', 'désactivé', 'enseignant', ''],
      ['Paul Roumy', 'paul@ecole.fr', 'actif', 'administrateur', ''],
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
      "Renvoyer l'invitation",
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
});
