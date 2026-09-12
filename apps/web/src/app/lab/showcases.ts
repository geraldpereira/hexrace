import { InjectionToken } from '@angular/core';

/** A showcase: one module playable on its own, at a route of the lab. */
export interface Showcase {
  readonly module: string;
  readonly path: string;
  readonly summary: string;
  /** False until the module exists: the row is greyed out. */
  readonly ready: boolean;
}

/** The showcases in the order of the plan de construction, section 2. */
export const SHOWCASES = new InjectionToken<readonly Showcase[]>('SHOWCASES', {
  providedIn: 'root',
  factory: () => [
    {
      module: 'inputs',
      path: 'lab/inputs',
      summary: 'Gamepad, keyboard, touch: the actions live.',
      ready: true,
    },
    {
      module: 'hud/debug',
      path: 'lab/debug',
      summary: 'The lil-gui tuning panel, with the POC add-ons.',
      ready: false,
    },
    {
      module: 'engine',
      path: 'lab/engine',
      summary: 'A ground, a falling box, the frame counter.',
      ready: false,
    },
    {
      module: 'camera',
      path: 'lab/camera',
      summary: 'The camera follows a dummy driven with the stick.',
      ready: false,
    },
    {
      module: 'tile',
      path: 'lab/tile',
      summary: 'One tile, every parameter live.',
      ready: false,
    },
    {
      module: 'track',
      path: 'lab/track',
      summary: 'Load or generate a track, free camera.',
      ready: false,
    },
    {
      module: 'car',
      path: 'lab/car',
      summary: 'The car on flat ground, several surfaces.',
      ready: false,
    },
    {
      module: 'game-commons',
      path: 'lab/race',
      summary: 'The car on a track, lap timer.',
      ready: false,
    },
  ],
});
