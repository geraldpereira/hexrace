import { type RoadType } from '@tile/entity/profile';
import { type SPoint } from '@tile/entity/slice';

export type HazardSize = 'small' | 'medium' | 'large';

/** A hazard's footprint in units: length along the road, width across. */
export const HAZARD_FOOTPRINT: Readonly<Record<HazardSize, { length: number; width: number }>> = {
  small: { length: 1, width: 1 },
  medium: { length: 2, width: 1 },
  large: { length: 2, width: 2 },
};

/** A rigid object at a fraction of the axis and an offset from the road centre, along the road. */
export interface Hazard {
  readonly kind: 'hazard';
  readonly size: HazardSize;
  readonly at: number;
  readonly offset: number;
}

/** On the unit bordering the road on the chosen side, whether a shoulder is there or not. */
export interface Barrier {
  readonly kind: 'barrier';
  readonly side: 'left' | 'right';
  readonly from: number;
  readonly to: number;
}

/** Across the whole road. */
export interface RoadBand {
  readonly kind: 'ramp' | 'bump';
  readonly from: number;
  readonly to: number;
}

/** A patch of another road type on the road, without collision. */
export interface Patch {
  readonly kind: 'patch';
  readonly from: number;
  readonly to: number;
  readonly offset: number;
  readonly width: number;
  readonly road: RoadType;
}

/** The obstacles of a tile (functional spec 2.4), placed relative to the road, never to the face. */
export type Obstacle = Hazard | Barrier | RoadBand | Patch;

/** What a barrier reserves in the data, and how thick its body is, in units. */
export const BARRIER_FOOTPRINT_WIDTH = 1;
export const BARRIER_BODY_WIDTH = 0.3;

/**
 * An obstacle laid on the tile: its reserved outline and its body, the same except for barriers.
 * Along the road it sits at a fraction of the axis, across it at an offset in units from the road
 * centre, negative left, following the road as it moves. A hazard is level, all corners at the
 * height of its centre; a band follows the road between two fractions, left edge out, right back.
 */
export interface Footprint {
  readonly obstacle: Obstacle;
  readonly outline: readonly SPoint[];
  readonly body: readonly SPoint[];
}
