import { type Routes } from '@angular/router';

import { LAB_ROUTES } from '@ui/lab/lab.routes';

/** One routes file per area; until the game exists, the root leads to the lab. */
export const ROUTES: Routes = [
  ...LAB_ROUTES,
  { path: '', redirectTo: 'lab', pathMatch: 'full' },
  { path: '**', redirectTo: 'lab' },
];
