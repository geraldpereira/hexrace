import { Injectable, inject } from '@angular/core';
import { DEFAULT_CAR_SPEC } from '@hexrace/car';
import { Polygons, type Vec2 } from '@hexrace/commons';
import {
  type Boundaries,
  type Obstacle,
  type SPoint,
  type TileBuild,
  type TileSweep,
  TileObstacles,
  TileSweeper,
  Units,
} from '@hexrace/tile';

import { type SpawnPose } from '@game-commons/entity/spawn-pose';

const MAX_S = 0.9;

/**
 * Where a car may be put down on a tile without landing inside an obstacle (functional spec 3.8):
 * the middle of the road at the point asked for when it is clear, else a place across the road, or
 * a little further along it, the first free one of the lists. The car is the rectangle of its
 * chassis turned along the road; a hazard, a barrier, a ramp and a bump are in the way, a patch is
 * driven over. All in units but the pose handed back, which is the world's metres.
 */
@Injectable({ providedIn: 'root' })
export class SpawnSpots {
  /** Half the chassis of the car being put down, in metres. */
  halfWidth = DEFAULT_CAR_SPEC.chassis.halfWidth;
  halfLength = DEFAULT_CAR_SPEC.chassis.halfLength;
  /** Tried along the axis, forwards only, so a spawn never falls back behind the line. */
  axisSteps: readonly number[] = [0, 0.15, 0.3];
  /** Tried across the road centre, in units, as far as the road is wide enough. */
  crossSteps: readonly number[] = [0, -0.5, 0.5, -1, 1, -1.5, 1.5];

  private readonly obstacles = inject(TileObstacles);
  private readonly polygons = inject(Polygons);
  private readonly sweeper = inject(TileSweeper);
  private readonly units = inject(Units);

  /** The first clear place at or past `at` on the tile; the road centre there when none is. */
  pose(build: TileBuild, at: number): SpawnPose {
    for (const step of this.axisSteps) {
      const s = Math.min(MAX_S, at + step);
      const where = this.sweeper.boundariesAt(build.sweep, s);
      const found = this.across(build, where);
      if (found) return this.poseAt(build.sweep, s, found);
    }
    return this.poseAt(build.sweep, at, this.sweeper.boundariesAt(build.sweep, at).center);
  }

  private across(build: TileBuild, where: Boundaries): Vec2 | null {
    const room =
      where.roadRight.distanceTo(where.center) - this.units.metersToUnits(this.halfWidth);
    for (const cross of this.crossSteps) {
      const point = where.center.add(where.right.scale(cross));
      if (Math.abs(cross) <= room && this.clear(build, where, point)) return point;
    }
    return null;
  }

  private clear(build: TileBuild, where: Boundaries, point: Vec2): boolean {
    const car = this.carAt(where, point);
    const taken = (build.obstacles ?? []).filter((one: Obstacle) => one.kind !== 'patch');
    return !taken.some((one: Obstacle) => this.hits(build.sweep, one, car));
  }

  private carAt(where: Boundaries, center: Vec2): Vec2[] {
    const along = where.travel.scale(this.units.metersToUnits(this.halfLength));
    const across = where.right.scale(this.units.metersToUnits(this.halfWidth));
    const nose = center.add(along);
    const tail = center.sub(along);
    return [nose.add(across), nose.sub(across), tail.sub(across), tail.add(across)];
  }

  private hits(sweep: TileSweep, obstacle: Obstacle, car: readonly Vec2[]): boolean {
    const outline = this.obstacles.footprint(sweep, obstacle).outline.map((one: SPoint) => one.at);
    return this.quads(outline).some((quad: Vec2[]) => this.overlaps(car, quad));
  }

  private quads(outline: readonly Vec2[]): Vec2[][] {
    const last = outline.length - 1;
    const quads: Vec2[][] = [];
    for (let k = 0; k + 1 < outline.length / 2; k++) {
      quads.push([outline[k]!, outline[k + 1]!, outline[last - 1 - k]!, outline[last - k]!]);
    }
    return quads;
  }

  private overlaps(a: readonly Vec2[], b: readonly Vec2[]): boolean {
    return this.anyInside(a, b) || this.anyInside(b, a);
  }

  private anyInside(points: readonly Vec2[], polygon: readonly Vec2[]): boolean {
    const clockwise = this.polygons.area(polygon) > 0 ? [...polygon].reverse() : polygon;
    const all = [...points, this.polygons.centroid(points)];
    return all.some((one: Vec2) => this.polygons.insideConvex(one, clockwise));
  }

  private poseAt(sweep: TileSweep, s: number, point: Vec2): SpawnPose {
    const travel = this.sweeper.boundariesAt(sweep, s).travel;
    return {
      point: this.units.toWorld(point, this.sweeper.heightOfS(sweep, s)),
      heading: Math.atan2(travel.x, -travel.y),
    };
  }
}
