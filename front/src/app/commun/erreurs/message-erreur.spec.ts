import { HttpErrorResponse } from '@angular/common/http';
import { codeErreur, erreurPassagere, MESSAGE_RESEAU, messageErreur } from './message-erreur';

const SERVICE_INDISPONIBLE = 'Le service ne répond pas comme prévu. Réessayez dans un instant.';

/** Réponse en erreur telle que la produit `HttpClient` pour un corps RFC 9457. */
function reponse(status: number, code?: string): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    error: code === undefined ? null : { type: 'about:blank', title: 'x', status, code },
  });
}

describe('messageErreur', () => {
  // Chaque code renvoyé par le back (commun.api.ErreursMappers, comptes.service.ComptesService, ComptesAdministration).
  const codesDuBack: [number, string, string][] = [
    [
      401,
      'authentification.requise',
      'Session expirée. Reconnectez-vous : votre saisie est conservée.',
    ],
    [
      403,
      'compte.inconnu_ou_inactif',
      "Votre compte n'est pas actif. Adressez-vous à l'administrateur de l'école.",
    ],
    [403, 'acces.refuse', "Cette action est réservée à l'administrateur."],
    [409, 'compte.email_deja_utilise', 'Cet e-mail est déjà associé à un compte.'],
    [409, 'compte.invitation_inutile', 'Ce compte est déjà actif : aucune invitation à renvoyer.'],
    [409, 'compte.dernier_administrateur', 'Il doit rester au moins un administrateur actif.'],
    [409, 'compte.auto_desactivation', 'Vous ne pouvez pas désactiver votre propre compte.'],
    [400, 'compte.nom_affiche_invalide', 'Saisissez un nom de 1 à 100 caractères.'],
    [409, 'compte.statut_incompatible', 'Ce compte a changé entre-temps. La liste est rechargée.'],
    // preparations.service.PreparationsService
    [400, 'preparation.section_invalide', 'Choisissez la section : PS, MS ou GS.'],
    [400, 'preparation.album_introuvable', "Cet album n'existe plus. Choisissez-en un autre."],
    [
      400,
      'preparation.module_invalide',
      "Ce module n'appartient plus à l'album. Choisissez-en un autre.",
    ],
    [400, 'preparation.theme_introuvable', "Ce thème n'existe plus. Choisissez-en un autre."],
    [
      400,
      'preparation.temps_passe_invalide',
      "Saisissez un nombre d'heures entre 0 et 100, par demi-heure.",
    ],
    [400, 'preparation.mot_invalide', 'Saisissez un mot de 1 à 100 caractères.'],
    [409, 'preparation.mot_deja_present', 'Ce mot est déjà dans la préparation.'],
    [400, 'preparation.sens_invalide', "Ce sens n'appartient pas à ce mot."],
    [409, 'preparation.mot_deja_illustre', 'Ce mot a déjà une image dans la préparation.'],
    // vocabulaire.service.Images, Usages
    [400, 'image.album_requis', "Album d'origine requis."],
    [400, 'image.album_introuvable', "Cet album n'existe plus. Choisissez-en un autre."],
    [400, 'image.mot_invalide', 'Saisissez un mot de 1 à 100 caractères.'],
    [400, 'image.sens_different', 'Cette image illustre un autre sens que celui du mot.'],
    [
      403,
      'image.reservee_au_proprietaire',
      "Seul le propriétaire de l'image peut modifier sa carte d'identité.",
    ],
    [
      400,
      'image.theme_introuvable',
      "Un de ces thèmes n'existe plus. Retirez-le, puis réessayez.",
    ],
    [400, 'image.module_introuvable', "Ce module n'existe plus. Choisissez-en un autre."],
    // vocabulaire.service.SuggestionsArasaac
    [503, 'arasaac.indisponible', "ARASAAC ne répond pas pour l'instant."],
    // referentiels.service.ReferentielsService
    [400, 'album.titre_invalide', 'Saisissez un titre de 1 à 200 caractères.'],
    [400, 'album.auteur_invalide', 'Saisissez un auteur de 1 à 200 caractères.'],
    [400, 'album.editeur_invalide', 'Saisissez un éditeur de 200 caractères au plus.'],
    [
      409,
      'album.deja_existant',
      'Cet album existe déjà. Choisissez-le dans la liste des albums au titre proche.',
    ],
    [
      403,
      'album.reserve_au_createur',
      "Seuls le créateur de l'album et l'administrateur peuvent le corriger.",
    ],
    [400, 'module.nom_invalide', 'Le nom du module doit compter de 1 à 200 caractères.'],
    [
      403,
      'module.reserve_au_createur',
      "Seuls le créateur du module et l'administrateur peuvent le modifier.",
    ],
    [409, 'module.deja_existant', 'Un module de ce nom existe déjà pour cet album.'],
    [400, 'theme.nom_invalide', 'Le nom du thème doit compter de 1 à 200 caractères.'],
    [409, 'theme.deja_existant', 'Un thème de ce nom existe déjà.'],
    [
      403,
      'theme.reserve_au_createur',
      "Seuls le créateur du thème et l'administrateur peuvent le modifier.",
    ],
    [
      409,
      'theme.utilise',
      'Ce thème est utilisé par des images : réaffectez-les avant de le supprimer.',
    ],
    [404, 'ressource.introuvable', "Cet élément n'existe plus. Rechargez la page."],
    [400, 'requete.invalide', 'La demande est incomplète. Vérifiez la saisie, puis réessayez.'],
    [
      413,
      'requete.trop_volumineuse',
      'Envoi trop volumineux : 20 Mo au plus par fichier, 100 Mo par envoi.',
    ],
    [415, 'format.non_supporte', 'Format de fichier non pris en charge.'],
    [500, 'erreur.interne', SERVICE_INDISPONIBLE],
    [406, 'format.non_acceptable', SERVICE_INDISPONIBLE],
    [405, 'methode.non_autorisee', SERVICE_INDISPONIBLE],
  ];

  it.each(codesDuBack)('%i %s : message du code', (status, code, message) => {
    expect(messageErreur(reponse(status, code))).toBe(message);
  });

  it('code inconnu : message selon le statut, sinon service indisponible', () => {
    expect(messageErreur(reponse(409, 'autre.code'))).toBe(SERVICE_INDISPONIBLE);
    expect(messageErreur(reponse(404, 'http.404x'))).toBe(
      "Cet élément n'existe plus. Rechargez la page.",
    );
  });

  it.each([
    [404, "Cet élément n'existe plus. Rechargez la page."],
    [401, 'Session expirée. Reconnectez-vous : votre saisie est conservée.'],
    [403, "Cette action est réservée à l'administrateur."],
    [400, 'La demande est incomplète. Vérifiez la saisie, puis réessayez.'],
    [422, 'La demande est incomplète. Vérifiez la saisie, puis réessayez.'],
    [413, 'Envoi trop volumineux : 20 Mo au plus par fichier, 100 Mo par envoi.'],
    [415, 'Format de fichier non pris en charge.'],
    [500, SERVICE_INDISPONIBLE],
    [502, SERVICE_INDISPONIBLE],
    [409, SERVICE_INDISPONIBLE],
  ])('%i sans code : message selon le statut', (status, message) => {
    expect(messageErreur(reponse(status))).toBe(message);
  });

  it('statut 0 (réseau) : connexion impossible', () => {
    expect(
      messageErreur(new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') })),
    ).toBe(MESSAGE_RESEAU);
    expect(MESSAGE_RESEAU).toBe(
      'Connexion au serveur impossible. Vérifiez votre réseau, puis réessayez.',
    );
  });

  it('erreur qui ne vient pas de HttpClient : service indisponible', () => {
    expect(messageErreur(new Error('boum'))).toBe(SERVICE_INDISPONIBLE);
    expect(messageErreur(undefined)).toBe(SERVICE_INDISPONIBLE);
  });

  it("n'utilise pas une clé héritée d'Object comme code", () => {
    expect(messageErreur(reponse(409, 'toString'))).toBe(SERVICE_INDISPONIBLE);
  });
});

describe('codeErreur', () => {
  it('lit le code du corps RFC 9457', () => {
    expect(codeErreur(reponse(403, 'compte.inconnu_ou_inactif'))).toBe('compte.inconnu_ou_inactif');
  });

  it('lit aussi le code d’un corps reçu en texte (opération sans corps de réponse)', () => {
    const texte = JSON.stringify({ status: 409, code: 'compte.invitation_inutile' });
    expect(codeErreur(new HttpErrorResponse({ status: 409, error: texte }))).toBe(
      'compte.invitation_inutile',
    );
  });

  it('null sans corps, sans code textuel ou hors HttpErrorResponse', () => {
    expect(codeErreur(reponse(500))).toBeNull();
    expect(codeErreur(new HttpErrorResponse({ status: 400, error: { code: 42 } }))).toBeNull();
    expect(codeErreur(new HttpErrorResponse({ status: 400, error: 'texte' }))).toBeNull();
    expect(codeErreur(new Error('x'))).toBeNull();
  });
});

describe('erreurPassagere', () => {
  it('vrai pour une erreur réseau (statut 0) ou une erreur 5xx', () => {
    expect(erreurPassagere(new HttpErrorResponse({ status: 0 }))).toBe(true);
    expect(erreurPassagere(reponse(500, 'erreur.interne'))).toBe(true);
    expect(erreurPassagere(new HttpErrorResponse({ status: 503 }))).toBe(true);
  });

  it('faux pour un refus du back (4xx) ou une erreur hors HttpClient', () => {
    expect(erreurPassagere(reponse(409, 'preparation.mot_deja_present'))).toBe(false);
    expect(erreurPassagere(reponse(404, 'ressource.introuvable'))).toBe(false);
    expect(erreurPassagere(reponse(400, 'preparation.sens_invalide'))).toBe(false);
    expect(erreurPassagere(new Error('x'))).toBe(false);
  });
});
