import { type Type } from '@angular/core';
import { type Routes } from '@angular/router';

import { HomeScreen } from '@ui/game/home-screen';

/** The screens of the game [F 7.1]; a drawn race carries its seed, the race loads lazily. */
export const GAME_ROUTES: Routes = [
  { path: '', component: HomeScreen, pathMatch: 'full' },
  {
    path: 'play/:mode',
    loadComponent: () =>
      import('@ui/game/country-pick').then((m: { CountryPick: Type<unknown> }) => m.CountryPick),
  },
  {
    path: 'play/:mode/:country',
    loadComponent: () =>
      import('@ui/game/track-pick').then((m: { TrackPick: Type<unknown> }) => m.TrackPick),
  },
  {
    path: 'race/:mode/:country/random/:seed',
    loadComponent: () =>
      import('@ui/game/race-page').then((m: { RacePage: Type<unknown> }) => m.RacePage),
  },
  {
    path: 'race/:mode/:country/:track',
    loadComponent: () =>
      import('@ui/game/race-page').then((m: { RacePage: Type<unknown> }) => m.RacePage),
  },
];
