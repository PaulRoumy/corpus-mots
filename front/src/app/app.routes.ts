import { inject } from '@angular/core';
import { CanMatchFn, Router, Routes } from '@angular/router';
import { Banque } from './banque/banque';
import { CompteCourant } from './commun/compte-courant';
import { PageBientot } from './compte/page-bientot';
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
        component: PageBientot,
        title: 'Mes données · corpus-mots',
        data: { titre: 'Mes données' },
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
