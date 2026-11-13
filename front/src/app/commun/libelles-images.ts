import { CarteIdentiteImageDto } from '../api/models/carte-identite-image-dto';

/** Type d'une Image, même valeur en base, dans l'API et dans le front (énumération du client généré). */
export type TypeImage = CarteIdentiteImageDto['typeImage'];

/** Licence d'une Image (AD-4), les huit valeurs de l'énumération du client généré. */
export type Licence = NonNullable<CarteIdentiteImageDto['licence']>;

/** Types d'image, dans l'ordre du Glossaire. */
export const TYPES_IMAGE: readonly TypeImage[] = [
  'image_libre',
  'photo_personnelle',
  'image_album',
  'inconnu',
];

/** Libellé affiché d'un type d'image : seule source des libellés de type du front. */
export const LIBELLES_TYPE_IMAGE: Readonly<Record<TypeImage, string>> = {
  image_libre: 'image libre',
  photo_personnelle: 'photo personnelle',
  image_album: "image d'album",
  inconnu: 'inconnu',
};

/** Libellé affiché d'une licence (EXPERIENCE.md) : seule source des libellés de licence du front. */
export const LIBELLES_LICENCE: Readonly<Record<Licence, string>> = {
  arasaac_cc_by_nc_sa: 'ARASAAC (CC BY-NC-SA)',
  sclera_cc_by_nc: 'Sclera (CC BY-NC)',
  mulberry_cc_by_sa: 'Mulberry (CC BY-SA)',
  cc0_domaine_public: 'domaine public / CC0',
  pixabay: 'Pixabay',
  autre_inconnue: 'autre / inconnue',
  droits_auteur_enseignant: "droits d'auteur de l'enseignant",
  usage_pedagogique_album: "usage pédagogique de l'album",
};

/** Licences qui ne se partagent pas : Pixabay et « autre / inconnue » portent « non partageable ». */
const LICENCES_NON_PARTAGEABLES: ReadonlySet<Licence> = new Set(['pixabay', 'autre_inconnue']);

/** Licence du Sélecteur de licence (image libre, type inconnu). */
export type LicenceChoisie = Exclude<
  Licence,
  'droits_auteur_enseignant' | 'usage_pedagogique_album'
>;

/** Les six licences du Sélecteur de licence, dans l'ordre d'EXPERIENCE.md, avec leur libellé. */
export const LICENCES_CHOISIES: readonly {
  readonly valeur: LicenceChoisie;
  readonly libelle: string;
  readonly partageable: boolean;
}[] = (
  [
    'arasaac_cc_by_nc_sa',
    'sclera_cc_by_nc',
    'mulberry_cc_by_sa',
    'cc0_domaine_public',
    'pixabay',
    'autre_inconnue',
  ] as const
).map((valeur) => ({
  valeur,
  libelle: LIBELLES_LICENCE[valeur],
  partageable: !LICENCES_NON_PARTAGEABLES.has(valeur),
}));

/** Licence posée d'office pour une photo personnelle et une image d'album (AD-4), avec son libellé. */
export const LICENCES_IMPOSEES: Readonly<Partial<Record<TypeImage, string>>> = {
  photo_personnelle: LIBELLES_LICENCE.droits_auteur_enseignant,
  image_album: LIBELLES_LICENCE.usage_pedagogique_album,
};
