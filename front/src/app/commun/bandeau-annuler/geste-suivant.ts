import { Subject } from 'rxjs';

/**
 * Geste suivant de l'enseignant (UX-DR-13, story 3.7) : émet à chaque requête vers l'API qui modifie des données,
 * signalée par `bandeauLotInterceptor`. Simple sujet, sans Material ni service : l'intercepteur est enregistré au
 * démarrage et ne doit pas tirer le Bandeau « Annuler » (snackbar) dans le paquet initial, au bord de son budget ;
 * c'est `BandeauAnnuler` qui s'y abonne.
 */
export const ecrituresApi = new Subject<void>();
