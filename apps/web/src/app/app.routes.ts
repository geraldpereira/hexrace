import { type Routes } from '@angular/router';

import { GAME_ROUTES } from '@ui/game/game.routes';
import { LAB_ROUTES } from '@ui/lab/lab.routes';

/** One routes file per area: the lab keeps its own addresses, the game holds the root. */
export const ROUTES: Routes = [...LAB_ROUTES, ...GAME_ROUTES, { path: '**', redirectTo: '' }];
