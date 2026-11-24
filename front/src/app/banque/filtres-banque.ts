import { ParamMap } from '@angular/router';
import { ListerImagesBanque$Params } from '../api/fn/images-resource/lister-images-banque';
import {
  CATEGORIES_GRAMMATICALES,
  CategorieGrammaticale,
  TYPES_IMAGE,
  TypeImage,
} from '../commun/libelles-images';
import { LONGUEUR_MAX_MOT } from '../commun/longueur-mot';

/** Section d'un filtre, même valeur dans l'URL et dans l'API. */
export type SectionFiltre = NonNullable<ListerImagesBanque$Params['section']>;

/** Sections du filtre, dans l'ordre affiché, avec leur libellé. */
export const SECTIONS_FILTRE: readonly {
  readonly valeur: SectionFiltre;
  readonly libelle: string;
}[] = [
  { valeur: 'ps', libelle: 'PS' },
  { valeur: 'ms', libelle: 'MS' },
  { valeur: 'gs', libelle: 'GS' },
];

/**
 * Filtres de la Banque (story 3.2), chacun à une seule valeur et nommé comme le paramètre de `GET /api/images` ; un
 * filtre absent ne filtre pas. L'URL en est la seule source.
 */
export interface FiltresBanque {
  readonly mot?: string;
  readonly sensId?: string;
  readonly section?: SectionFiltre;
  readonly albumId?: string;
  readonly moduleId?: string;
  readonly themeId?: string;
  readonly categorie?: CategorieGrammaticale;
  readonly typeImage?: TypeImage;
  readonly proprietaireId?: string;
}

/** Nom d'un filtre : son paramètre d'URL et d'API. */
export type CleFiltre = keyof FiltresBanque;

/** Tous les filtres, dans l'ordre des paramètres d'URL. */
export const CLES_FILTRES: readonly CleFiltre[] = [
  'mot',
  'sensId',
  'section',
  'albumId',
  'moduleId',
  'themeId',
  'categorie',
  'typeImage',
  'proprietaireId',
];

/** Changement de filtres : une valeur pose ou remplace le filtre, `null` le retire. */
export type ChangementFiltres = { readonly [cle in CleFiltre]?: string | null };

/** Identifiant sous la forme canonique qu'exige le back (8-4-4-4-12 chiffres hexadécimaux). */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function identifiant(valeur: string | null): string | undefined {
  // En minuscules : le back les rend ainsi, et les comparaisons (options, libellés) se font par `===`.
  return valeur !== null && UUID.test(valeur) ? valeur.toLowerCase() : undefined;
}

function parmi<T extends string>(valeurs: readonly T[], valeur: string | null): T | undefined {
  return valeurs.find((candidate) => candidate === valeur);
}

/**
 * Filtres lus dans l'URL. Une valeur invalide (identifiant mal formé, Section, catégorie ou type inconnus, Mot vide ou
 * trop long, paramètre répété) est ignorée : elle n'est pas envoyée au back, qui répondrait `400`. Un Module sans
 * Album est ignoré aussi : la puce Module n'a de sens qu'avec l'Album.
 */
export function filtresDeLUrl(parametres: ParamMap): FiltresBanque {
  const unique = (cle: CleFiltre): string | null =>
    parametres.getAll(cle).length === 1 ? parametres.get(cle) : null;
  const mot = unique('mot')?.trim();
  const albumId = identifiant(unique('albumId'));
  const filtres: { -readonly [cle in CleFiltre]: FiltresBanque[cle] } = {
    mot: mot && mot.length <= LONGUEUR_MAX_MOT ? mot : undefined,
    sensId: identifiant(unique('sensId')),
    section: parmi(
      SECTIONS_FILTRE.map((section) => section.valeur),
      unique('section'),
    ),
    albumId,
    moduleId: albumId === undefined ? undefined : identifiant(unique('moduleId')),
    themeId: identifiant(unique('themeId')),
    categorie: parmi(CATEGORIES_GRAMMATICALES, unique('categorie')),
    typeImage: parmi(TYPES_IMAGE, unique('typeImage')),
    proprietaireId: identifiant(unique('proprietaireId')),
  };
  for (const cle of CLES_FILTRES) {
    if (filtres[cle] === undefined) {
      delete filtres[cle];
    }
  }
  return filtres;
}

/** Vrai si au moins un filtre est posé. */
export function filtresPoses(filtres: FiltresBanque): boolean {
  return CLES_FILTRES.some((cle) => filtres[cle] !== undefined);
}

/** Vrai si les deux jeux de filtres sont les mêmes. */
export function memesFiltres(a: FiltresBanque, b: FiltresBanque): boolean {
  return CLES_FILTRES.every((cle) => a[cle] === b[cle]);
}
