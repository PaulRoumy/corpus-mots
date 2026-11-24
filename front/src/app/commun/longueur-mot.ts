/**
 * Longueur maximale d'un Mot (`maxLength` du contrat OpenAPI, dont `mot` de `GET /api/images`), partagée par le Champ
 * de recherche de la coquille, la lecture des filtres de la Banque et la saisie des Mots (`preparations/longueurs-mot`). Fichier sans dépendance : la coquille l'importe
 * sans charger la Banque.
 */
export const LONGUEUR_MAX_MOT = 100;
