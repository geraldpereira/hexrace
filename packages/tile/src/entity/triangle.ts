import { type Vec3 } from '@hexrace/commons';

import { type Obstacle } from '@tile/entity/obstacle';
import { type RoadType, type Zone } from '@tile/entity/profile';
import { type TileSweep } from '@tile/entity/sweep';

/** What a triangle is made of, for the renderer to colour and the physics to know. */
export type Paint =
  | { readonly kind: 'zone'; readonly zone: Zone; readonly type: number }
  | { readonly kind: 'skirt' }
  | {
      readonly kind: 'obstacle';
      readonly obstacle: Obstacle['kind'];
      readonly road?: RoadType;
      readonly face: 'top' | 'side';
    }
  | { readonly kind: 'line'; readonly dark: boolean };

/** A triangle of the 3D world in metres, wound with its normal up or outwards. */
export interface Triangle3 {
  readonly a: Vec3;
  readonly b: Vec3;
  readonly c: Vec3;
  readonly paint: Paint;
}

/** What to build: the sweep, its obstacles, a chequered line at that `s` or none, the skirt's floor in units. */
export interface TileBuild {
  readonly sweep: TileSweep;
  readonly obstacles?: readonly Obstacle[];
  readonly line?: number | null;
  readonly skirtBase: number;
}
