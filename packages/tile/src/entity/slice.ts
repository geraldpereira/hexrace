import { type Vec2 } from '@hexrace/commons';

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
