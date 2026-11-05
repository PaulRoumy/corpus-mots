import { inject } from '@angular/core';
import { CanMatchFn, Router, Routes } from '@angular/router';
import { Banque } from './banque/banque';
import { PAGE_PUBLIQUE } from './commun/authentification/authentification';
import { CompteCourant } from './commun/compte-courant';
import { Coquille } from './coquille/coquille';
import { Fiches } from './fiches/fiches';
import { Preparations } from './preparations/preparations';

/** L'Administration n'existe que pour un administrateur (rôle lu par le back dans le jeton) ; sinon, l'accueil. */
export const administrateurSeulement: CanMatchFn = async () => {
  const compteCourant = inject(CompteCourant);
  const accueil = inject(Router).createUrlTree(['/preparations']);
  await compteCourant.charger();
  return compteCourant.administrateur() || accueil;
};

export const routes: Routes = [
  {
    // Publique, hors de la coquille : ni Keycloak ni /api (voir Authentification.demarrer).
    path: PAGE_PUBLIQUE,
    loadComponent: () =>
      import('./compte/donnees-personnelles').then((m) => m.PageDonneesPersonnelles),
    title: 'Données personnelles · corpus-mots',
  },
  {
    path: '',
    component: Coquille,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'preparations' },
      { path: 'preparations', component: Preparations, title: 'Préparations · corpus-mots' },
      { path: 'banque', component: Banque, title: 'Banque · corpus-mots' },
      { path: 'fiches', component: Fiches, title: 'Fiches · corpus-mots' },
      {
        path: 'mon-compte',
        // Chargée à la demande : les formulaires Material restent hors du paquet initial.
        loadComponent: () => import('./compte/mon-compte').then((m) => m.MonCompte),
        title: 'Mon compte · corpus-mots',
      },
      {
        path: 'mes-donnees',
        loadComponent: () => import('./compte/donnees-personnelles').then((m) => m.MesDonnees),
        title: 'Mes données · corpus-mots',
      },
      {
        path: 'administration',
        canMatch: [administrateurSeulement],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'comptes' },
          {
            path: 'comptes',
            // Chargée à la demande : formulaires et table Material restent hors du paquet initial.
            loadComponent: () => import('./administration/comptes/comptes').then((m) => m.Comptes),
            title: 'Comptes · Administration · corpus-mots',
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
