import { InjectionToken } from '@angular/core';

/** Une vitrine : un module jouable seul, à une route du lab. */
export interface Showcase {
  readonly module: string;
  readonly path: string;
  readonly summary: string;
  /** Faux tant que le module n'est pas commencé : la ligne est grisée. */
  readonly ready: boolean;
}

/** Les vitrines dans l'ordre du plan de construction, section 2. */
export const SHOWCASES = new InjectionToken<readonly Showcase[]>('SHOWCASES', {
  providedIn: 'root',
  factory: () => [
    {
      module: 'inputs',
      path: 'lab/inputs',
      summary: 'Manette, clavier, tactile : les actions en direct.',
      ready: false,
    },
    {
      module: 'hud/debug',
      path: 'lab/debug',
      summary: 'Le panneau de réglage qui remplace lil-gui.',
      ready: false,
    },
    {
      module: 'engine',
      path: 'lab/engine',
      summary: 'Un sol, une boîte qui tombe, le compteur d’images.',
      ready: false,
    },
    {
      module: 'camera',
      path: 'lab/camera',
      summary: 'La caméra suit un mobile piloté au stick.',
      ready: false,
    },
    {
      module: 'tile',
      path: 'lab/tile',
      summary: 'Une tuile dont on change chaque paramètre.',
      ready: false,
    },
    {
      module: 'track',
      path: 'lab/track',
      summary: 'Charger ou générer une piste, caméra libre.',
      ready: false,
    },
    {
      module: 'car',
      path: 'lab/car',
      summary: 'La voiture sur un sol plat multi-surfaces.',
      ready: false,
    },
    {
      module: 'game-commons',
      path: 'lab/race',
      summary: 'La voiture sur une piste, chrono au tour.',
      ready: false,
    },
  ],
});
