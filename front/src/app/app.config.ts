import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { Authentification } from './commun/authentification/authentification';
import { jetonInterceptor } from './commun/authentification/jeton-interceptor';
import { bandeauLotInterceptor } from './commun/bandeau-annuler/bandeau-lot-interceptor';
import { provideIcones } from './commun/icones';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Rien ne s'affiche avant la connexion : l'application est réservée à l'équipe (FR-2).
    provideAppInitializer(() => inject(Authentification).demarrer()),
    // Le geste suivant ferme le Bandeau « Annuler » d'un lot dès l'envoi, avant l'attente du jeton.
    provideHttpClient(withInterceptors([bandeauLotInterceptor, jetonInterceptor])),
    provideRouter(routes, withComponentInputBinding()),
    provideIcones(),
  ],
};
