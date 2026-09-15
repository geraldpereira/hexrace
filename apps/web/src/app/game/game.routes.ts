import { type Type } from '@angular/core';
import { type Routes } from '@angular/router';

import { HomeScreen } from '@ui/game/home-screen';

/** The screens of the MVP [F 7.1]; what reads a track loads lazily, three and Jolt with it. */
export const GAME_ROUTES: Routes = [
  { path: '', component: HomeScreen, pathMatch: 'full' },
  {
    path: 'tracks',
    loadComponent: () =>
      import('@ui/game/track-pick').then((m: { TrackPick: Type<unknown> }) => m.TrackPick),
  },
  {
    path: 'race/:track',
    loadComponent: () =>
      import('@ui/game/race-page').then((m: { RacePage: Type<unknown> }) => m.RacePage),
  },
];
