import { Routes } from '@angular/router';
import { Accueil } from './accueil/accueil';

export const routes: Routes = [
  { path: '', component: Accueil, title: 'corpus-mots' },
  { path: '**', redirectTo: '' },
];
