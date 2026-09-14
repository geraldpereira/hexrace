import { type Vec2 } from '@hexrace/commons';

import { type Zone } from '@tile/entity/profile';

/** A point of the plane that knows its progress along the axis, hence its height. */
export interface SPoint {
  readonly at: Vec2;
  readonly s: number;
}

/** The lateral line at one `s`, left to right: hexagon edge, block, road, road, block, edge. */
export interface Slice {
  readonly s: number;
  readonly outerLeft: SPoint;
  readonly blockLeft: SPoint;
  readonly roadLeft: SPoint;
  readonly roadRight: SPoint;
  readonly blockRight: SPoint;
  readonly outerRight: SPoint;
}

export type ZoneSide = 'left' | 'right' | 'center';

/** Four points between two neighbouring slices, and their paint: the zone and its palette rank. */
export interface ZoneQuad {
  readonly zone: Zone;
  readonly side: ZoneSide;
  readonly type: number;
  readonly points: readonly SPoint[];
}

/** A zone merged along the axis into one polygon, for a 2D map. */
export interface ZonePolygon {
  readonly zone: Zone;
  readonly side: ZoneSide;
  readonly type: number;
  readonly points: readonly SPoint[];
}
