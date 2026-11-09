import { HttpErrorResponse } from '@angular/common/http';
import { codeErreur, MESSAGE_RESEAU, messageErreur } from './message-erreur';

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
