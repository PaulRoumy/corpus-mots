import { HttpErrorResponse } from '@angular/common/http';

/**
 * Traduction des erreurs du back en messages français (UX-DR-37). Le back répond en RFC 9457
 * (`application/problem+json`) avec un champ `code` stable (`commun.api.ErreursMappers`, `comptes.service`) ;
 * le front ne montre jamais le `title` ni le `detail` du back, seulement le message associé au `code`.
 */

const SERVICE_INDISPONIBLE = 'Le service ne répond pas comme prévu. Réessayez dans un instant.';

/** Statut `0` : la requête n'a pas atteint le serveur (réseau coupé, serveur arrêté). */
export const MESSAGE_RESEAU =
  'Connexion au serveur impossible. Vérifiez votre réseau, puis réessayez.';

/** Échec du chargement de `GET /api/mon-compte` autre qu'un compte inactif (page sans coquille). */
export const MESSAGE_COMPTE_NON_CHARGE = "Votre compte n'a pas pu être chargé. Rechargez la page.";

/** Message de chaque `code` d'erreur que le back peut renvoyer. */
export const MESSAGES_PAR_CODE: Readonly<Record<string, string>> = {
  'authentification.requise': 'Session expirée. Reconnectez-vous : votre saisie est conservée.',
  'compte.inconnu_ou_inactif':
    "Votre compte n'est pas actif. Adressez-vous à l'administrateur de l'école.",
  'acces.refuse': "Cette action est réservée à l'administrateur.",
  'compte.email_deja_utilise': 'Cet e-mail est déjà associé à un compte.',
  'compte.invitation_inutile': 'Ce compte est déjà actif : aucune invitation à renvoyer.',
  'compte.dernier_administrateur': 'Il doit rester au moins un administrateur actif.',
  'compte.auto_desactivation': 'Vous ne pouvez pas désactiver votre propre compte.',
  'compte.statut_incompatible': 'Ce compte a changé entre-temps. La liste est rechargée.',
  'ressource.introuvable': "Cet élément n'existe plus. Rechargez la page.",
  'requete.invalide': 'La demande est incomplète. Vérifiez la saisie, puis réessayez.',
  'requete.trop_volumineuse':
    'Envoi trop volumineux : 20 Mo au plus par fichier, 100 Mo par envoi.',
  'format.non_supporte': 'Format de fichier non pris en charge.',
  'erreur.interne': SERVICE_INDISPONIBLE,
  'format.non_acceptable': SERVICE_INDISPONIBLE,
  'methode.non_autorisee': SERVICE_INDISPONIBLE,
};

/** Code absent ou inconnu : le statut HTTP choisit le code dont on reprend le message. */
const CODE_PAR_STATUT: Readonly<Record<number, string>> = {
  400: 'requete.invalide',
  401: 'authentification.requise',
  403: 'acces.refuse',
  404: 'ressource.introuvable',
  413: 'requete.trop_volumineuse',
  415: 'format.non_supporte',
  422: 'requete.invalide',
};

/** `code` du corps RFC 9457 d'une réponse HTTP en erreur, ou `null` s'il n'y en a pas. */
export function codeErreur(erreur: unknown): string | null {
  if (!(erreur instanceof HttpErrorResponse)) {
    return null;
  }
  const corps = corpsJson(erreur.error);
  return typeof corps === 'object' &&
    corps !== null &&
    'code' in corps &&
    typeof corps.code === 'string'
    ? corps.code
    : null;
}

/**
 * Les opérations sans corps de réponse (`204`) sont générées en `responseType: 'text'` : leur erreur RFC 9457 arrive
 * alors en texte JSON, à relire.
 */
function corpsJson(corps: unknown): unknown {
  if (typeof corps !== 'string') {
    return corps;
  }
  try {
    return JSON.parse(corps) as unknown;
  } catch {
    return null;
  }
}

/**
 * Message à montrer pour une erreur : celui de son `code` s'il est connu ; sinon celui que désigne le statut HTTP ;
 * statut `0`, message de connexion impossible ; tout autre cas, « Le service ne répond pas comme prévu… ».
 */
export function messageErreur(erreur: unknown): string {
  const code = codeErreur(erreur);
  if (code !== null && Object.hasOwn(MESSAGES_PAR_CODE, code)) {
    return MESSAGES_PAR_CODE[code];
  }
  if (!(erreur instanceof HttpErrorResponse)) {
    return SERVICE_INDISPONIBLE;
  }
  if (erreur.status === 0) {
    return MESSAGE_RESEAU;
  }
  const codeDuStatut = CODE_PAR_STATUT[erreur.status];
  return codeDuStatut ? MESSAGES_PAR_CODE[codeDuStatut] : SERVICE_INDISPONIBLE;
}
