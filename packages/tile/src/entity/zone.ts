import { type SPoint } from '@tile/entity/slice';

/** What lies at a unit of a face, left to right. */
export type Zone = 'landscape' | 'shoulder' | 'road';

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
