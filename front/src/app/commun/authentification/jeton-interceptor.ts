import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { Authentification } from './authentification';

/**
 * Joint le jeton Keycloak aux appels à /api. Sur un 401, renouvelle le jeton en silence et rejoue la requête une
 * seule fois, sans rien perdre de la saisie ; si la session elle-même a expiré, Connexion puis retour à la page.
 */
export const jetonInterceptor: HttpInterceptorFn = (requete, suivant) => {
  if (!estUnAppelApi(requete)) {
    return suivant(requete);
  }
  const authentification = inject(Authentification);
  const avecJeton = (jeton: string) => requete.clone({ setHeaders: { Authorization: `Bearer ${jeton}` } });

  return from(authentification.jeton()).pipe(
    switchMap((jeton) => suivant(avecJeton(jeton))),
    catchError((erreur: unknown) => {
      if (!(erreur instanceof HttpErrorResponse) || erreur.status !== 401) {
        return throwError(() => erreur);
      }
      return from(authentification.jetonRenouvele()).pipe(switchMap((jeton) => suivant(avecJeton(jeton))));
    }),
  );
};

function estUnAppelApi(requete: HttpRequest<unknown>): boolean {
  const chemin = new URL(requete.url, window.location.origin);
  return chemin.origin === window.location.origin && (chemin.pathname === '/api' || chemin.pathname.startsWith('/api/'));
}
