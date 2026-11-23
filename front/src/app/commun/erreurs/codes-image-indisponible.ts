/**
 * Codes d'erreur du back qui signalent une Image devenue indisponible entre la lecture et le geste : elle n'est plus
 * proposable à l'enseignant (`404 image.indisponible`) ou n'illustre plus le Sens retenu ni le Mot
 * (`400 image.sens_different`). Le back renvoie ces deux codes sur les routes qui refusent une telle Image : choix et
 * remplacement d'Image, réutilisation, reprise d'un seul Mot depuis l'Encart, contrôle sous verrou compris. « Tout
 * reprendre » et le rétablissement d'un Mot ne refusent pas : le Mot est ajouté sans Image. Seule la reconnaissance du
 * cas est partagée : chaque composant garde son message et sa réaction.
 */
export const CODES_IMAGE_INDISPONIBLE: ReadonlySet<string> = new Set([
  'image.indisponible',
  'image.sens_different',
]);
