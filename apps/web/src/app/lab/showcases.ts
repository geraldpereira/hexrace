import { InjectionToken } from '@angular/core';

/** A showcase: one module playable on its own, at a route of the lab. */
export interface Showcase {
  readonly module: string;
  readonly path: string;
  readonly summary: string;
  /** False until the module exists: the row is greyed out. */
  readonly ready: boolean;
}

const PLANNED: readonly Showcase[] = [
  {
    module: 'inputs',
    path: 'lab/inputs',
    summary: 'Gamepad, keyboard, touch: the actions live.',
    ready: true,
  },
  {
    module: 'hud',
    path: 'lab/hud',
    summary: 'Every HUD component fed with fake values from the debug panel.',
    ready: true,
  },
  {
    module: 'hud/debug',
    path: 'lab/debug',
    summary: 'The lil-gui tuning panel, with the POC add-ons.',
    ready: true,
  },
  {
    module: 'engine',
    path: 'lab/engine',
    summary: 'A ground, falling crates, the frame counter and the wasm start-up time.',
    ready: true,
  },
  {
    module: 'camera',
    path: 'lab/camera',
    summary: 'The camera follows a dummy driven with the stick, leaning towards a fake next tile.',
    ready: true,
  },
  {
    module: 'tile',
    path: 'lab/tile',
    summary:
      'One tile, every parameter live, its mesh and collider rebuilt, the surface under the pointer.',
    ready: true,
  },
  {
    module: 'track',
    path: 'lab/track',
    summary:
      'Load or generate a track, the tile window around a player cursor, the 2D map and the issues.',
    ready: true,
  },
  {
    module: 'car',
    path: 'lab/car',
    summary:
      'The car of POC 1 on flat ground, one lane per surface, ramp and speed bump, HUD and sound.',
    ready: true,
  },
  {
    module: 'game-commons',
    path: 'lab/race',
    summary: 'The car of POC 1 on a track of POC 2: countdown, chrono, laps, fall, results.',
    ready: true,
  },
];

/** The showcases in the order of the plan de construction, section 2. */
export const SHOWCASES = new InjectionToken<readonly Showcase[]>('SHOWCASES', {
  providedIn: 'root',
  factory: () => PLANNED,
});
