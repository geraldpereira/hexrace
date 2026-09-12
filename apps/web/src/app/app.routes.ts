import { type Routes } from '@angular/router';

import { LAB_ROUTES } from '@ui/lab/lab.routes';

/**
 * Un fichier de routes par zone. Tant que le jeu n'existe pas, la racine mène au lab, la liste des
 * vitrines des modules (plan de construction, 1.1).
 */
export const ROUTES: Routes = [
  ...LAB_ROUTES,
  { path: '', redirectTo: 'lab', pathMatch: 'full' },
  { path: '**', redirectTo: 'lab' },
];
