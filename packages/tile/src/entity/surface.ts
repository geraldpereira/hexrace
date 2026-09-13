import { Injectable, inject } from '@angular/core';

import { type Vec2, hexCorners, insideConvex } from '@tile/entity/layout';
import { type Obstacle } from '@tile/entity/obstacle';
import { axisParameter } from '@tile/entity/path';
import { type Zone } from '@tile/entity/profile';
import { type TileSweep, TileSweeper } from '@tile/entity/sweep';

/** What lies under a point: the zone and its rank in the palette, a patch's road type included. */
export interface Surface {
  readonly zone: Zone;
  readonly type: number;
  /** Progress along the axis of the nearest axis point. */
  readonly s: number;
  /** Offset from the road centre in units, negative to the left. */
  readonly offset: number;
}

/**
 * The surface under a point of the plane, in units (technical spec 4.2): the nearest axis point
 * gives `s`, the signed distance to the road centre along the driver's right says whether the
 * point is on the road, a shoulder or the landscape, and a patch that covers it replaces the road
 * type. Null outside the hexagon: another tile owns the point.
 */
@Injectable({ providedIn: 'root' })
export class TileSurfaces {
  private readonly sweeper = inject(TileSweeper);

  at(sweep: TileSweep, p: Vec2, obstacles: readonly Obstacle[] = []): Surface | null {
    if (!insideConvex(p, hexCorners(sweep.center))) return null;
    const s = axisParameter(sweep.center, sweep.heading, sweep.exit, p);
    const b = this.sweeper.boundariesAt(sweep, s);
    const offset = (p.x - b.center.x) * b.right.x + (p.y - b.center.y) * b.right.y;
    const halfRoad = Math.hypot(b.roadRight.x - b.center.x, b.roadRight.y - b.center.y);
    const profile = this.sweeper.profileAt(sweep, s);
    if (Math.abs(offset) <= halfRoad) {
      const patch = obstacles.find((o) => coversPatch(o, s, offset));
      const type = patch?.kind === 'patch' ? patch.road : profile.road;
      return { zone: 'road', type, s, offset };
    }
    const edge = offset < 0 ? b.blockLeft : b.blockRight;
    const halfBlock = Math.hypot(edge.x - b.center.x, edge.y - b.center.y);
    if (Math.abs(offset) <= halfBlock) {
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
