import { Injectable, inject } from '@angular/core';
import { type Vec2, insideConvex } from '@hexrace/commons';

import { SIDE } from '@tile/entity/layout';
import { type Obstacle } from '@tile/entity/obstacle';
import { type Surface } from '@tile/entity/surface';
import { type TileSweep } from '@tile/entity/sweep';
import { Layout } from '@tile/geometry/layout';
import { TilePaths } from '@tile/geometry/tile-paths';
import { TileSweeper } from '@tile/geometry/tile-sweeper';

/**
 * The surface under a point of the plane, in units (technical spec 4.2): the nearest axis point
 * gives `s`, the signed distance to the road centre along the driver's right says whether the
 * point is on the road, a shoulder or the landscape, and a patch that covers it replaces the road
 * type. Null outside the hexagon: another tile owns the point.
 */
@Injectable({ providedIn: 'root' })
export class TileSurfaces {
  private readonly layout = inject(Layout);
  private readonly paths = inject(TilePaths);
  private readonly sweeper = inject(TileSweeper);

  at(sweep: TileSweep, p: Vec2, obstacles: readonly Obstacle[] = []): Surface | null {
    if (!insideConvex(p, this.layout.corners(sweep.center), SIDE * 1e-6)) return null;
    const s = this.paths.axisParameter(sweep.center, sweep.heading, sweep.exit, p);
    const b = this.sweeper.boundariesAt(sweep, s);
    const offset = p.sub(b.center).dot(b.right);
    const halfRoad = b.roadRight.distanceTo(b.center);
    const profile = this.sweeper.profileAt(sweep, s);
    if (Math.abs(offset) <= halfRoad) {
      const patch = obstacles.find((o) => coversPatch(o, s, offset));
      const type = patch?.kind === 'patch' ? patch.road : profile.road;
      return { zone: 'road', type, s, offset };
    }
    const edge = offset < 0 ? b.blockLeft : b.blockRight;
    if (Math.abs(offset) <= edge.distanceTo(b.center)) {
      return { zone: 'shoulder', type: profile.shoulder, s, offset };
    }
    return { zone: 'landscape', type: profile.landscape, s, offset };
  }
}

function coversPatch(obstacle: Obstacle, s: number, offset: number): boolean {
  if (obstacle.kind !== 'patch') return false;
  const across = Math.abs(offset - obstacle.offset) <= obstacle.width / 2;
  return across && s >= obstacle.from && s <= obstacle.to;
}
