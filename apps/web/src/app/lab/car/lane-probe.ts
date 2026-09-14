import { type Point3, type SurfaceProbe, type SurfaceQuery } from '@hexrace/car';
import { clamp } from 'lodash-es';

/**
 * The showcase's ground read as lanes: the flat plane is cut across into one strip per rank of the
 * environment, so driving sideways walks the whole palette. A point outside the strips keeps the
 * nearest one, which is what a car leaving the painted area should feel. A later module will
 * answer the same question from the tile the point falls in.
 */
export class LaneProbe implements SurfaceProbe {
  lanes: readonly SurfaceQuery[] = [];
  laneWidth = 8;

  /** The x of a lane's middle: where the car is put back, and where an obstacle sits. */
  centreOf(index: number): number {
    return (index - (this.lanes.length - 1) / 2) * this.laneWidth;
  }

  at(point: Point3): SurfaceQuery | null {
    if (this.lanes.length === 0) return null;
    const from = point.x + (this.lanes.length * this.laneWidth) / 2;
    const lane = clamp(Math.floor(from / this.laneWidth), 0, this.lanes.length - 1);
    return this.lanes[lane]!;
  }
}
