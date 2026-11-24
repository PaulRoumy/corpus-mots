import { CarteIdentiteImageDto } from '../../api/models/carte-identite-image-dto';

/**
 * Versement d'une Image dans la Banque (story 3.3) : raisons affichées quand « Verser » est indisponible, et message
 * de partage après un versement. Partagé par la Carte d'identité et la Barre d'actions en lot ; importé seulement par
 * des composants chargés à la demande, pour rester hors du paquet initial.
 */

/** `versabilite` d'une Image (AD-4) : `versable`, ou le code du motif de refus. */
export type Versabilite = NonNullable<CarteIdentiteImageDto['versabilite']>;

/** Code d'un motif qui empêche de verser une Image. */
export type CodeRefusVersement = Exclude<Versabilite, 'versable'>;

/** Licence d'une Image, `null` si elle n'est pas renseignée. */
type LicenceImage = CarteIdentiteImageDto['licence'];

/** Libellé du bouton « Verser ». */
export const LIBELLE_VERSER = "Verser dans la banque de l'école";

/** Libellé du bouton pendant l'envoi du versement. */
export const LIBELLE_VERSEMENT_EN_COURS = 'Versement…';

/** Message affiché après un versement réussi. */
export const MESSAGE_VERSEMENT =
  "L'image reste la vôtre. Les collègues peuvent l'utiliser, personne ne peut la modifier.";

const RAISONS: Readonly<Record<CodeRefusVersement, string>> = {
  'image.versement.image_album': "une image d'album reste dans Mes mots",
  'image.versement.type_inconnu': "type inconnu, précisez le type de l'image",
  'image.versement.source_manquante': 'source à préciser',
  'image.versement.licence_non_versable': 'licence non partageable',
  'image.versement.retrait_admin':
    "image retirée par l'administrateur ; modifiez sa carte d'identité pour la verser à nouveau",
};

/** Raison d'une licence non partageable, quand l'Image n'a aucune licence. */
const RAISON_LICENCE_A_PRECISER = 'licence à préciser';

/** Raison d'un code que cette version de l'application ne connaît pas. */
export const RAISON_INCONNUE = 'motif inconnu';

/** Vrai si `code` est un motif de refus du versement (y compris reçu dans une erreur `400`). */
export function estRefusVersement(code: string | null | undefined): code is CodeRefusVersement {
  return code !== null && code !== undefined && Object.hasOwn(RAISONS, code);
}

/**
 * Raison d'un refus, sans majuscule ni point final : « source à préciser ». Pour `licence_non_versable`, « licence à
 * préciser » sans licence, « licence non partageable » avec une licence ; « motif inconnu » pour un code inconnu.
 */
export function raisonVersement(code: string, licence: LicenceImage): string {
  if (code === 'image.versement.licence_non_versable' && (licence ?? null) === null) {
    return RAISON_LICENCE_A_PRECISER;
  }
  return estRefusVersement(code) ? RAISONS[code] : RAISON_INCONNUE;
}

/** Message de partage après le versement de plusieurs Images. */
export const MESSAGE_VERSEMENT_PLURIEL =
  "Les images restent les vôtres. Les collègues peuvent les utiliser, personne ne peut les modifier.";

/** Raisons propres au versement en lot : l'Image d'un collègue, ou une Image qui n'est plus visible. */
const RAISONS_LOT: Readonly<Record<string, string>> = {
  'image.reservee_au_proprietaire': "image d'un collègue",
  'image.indisponible': 'image indisponible',
};

/**
 * Raison d'une Image refusée par un versement en lot (`refusees[].code`) : celles de `raisonVersement`, plus « image
 * d'un collègue » et « image indisponible ».
 */
export function raisonRefusLot(code: string, licence: LicenceImage): string {
  return Object.hasOwn(RAISONS_LOT, code) ? RAISONS_LOT[code] : raisonVersement(code, licence);
}

/** Phrase affichée sous « Verser » indisponible : « Verser indisponible : source à préciser. » */
export function phraseVersementIndisponible(code: string, licence: LicenceImage): string {
  return `Verser indisponible : ${raisonVersement(code, licence)}.`;
}
