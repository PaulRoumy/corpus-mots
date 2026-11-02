import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { Authentification } from './commun/authentification/authentification';
import { jetonInterceptor } from './commun/authentification/jeton-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Rien ne s'affiche avant la connexion : l'application est réservée à l'équipe (FR-2).
    provideAppInitializer(() => inject(Authentification).demarrer()),
    provideHttpClient(withInterceptors([jetonInterceptor])),
    provideRouter(routes)
  ]
};
