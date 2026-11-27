import { HttpInterceptorFn } from '@angular/common/http';
import { estUnAppelApi } from '../authentification/jeton-interceptor';
import { ecrituresApi } from './geste-suivant';

/** Méthodes HTTP qui modifient des données. */
const METHODES_ECRITURE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Geste suivant de l'enseignant (UX-DR-13, story 3.7) : toute requête vers l'API qui modifie des données est
 * signalée par `ecrituresApi`, auquel le Bandeau « Annuler » s'abonne pour fermer, sans annuler, celui d'un geste en lot. L'opération inverse lancée par « Annuler » part après la
 * fermeture du bandeau, qui ne la compte donc pas. Un bandeau de geste unitaire garde ses 8 s.
 */
export const bandeauLotInterceptor: HttpInterceptorFn = (requete, suivant) => {
  if (METHODES_ECRITURE.has(requete.method) && estUnAppelApi(requete)) {
    ecrituresApi.next();
  }
  return suivant(requete);
};
