import { Injectable } from '@angular/core';

import { Vec2 } from '@commons/math/vec2';

/** What a polygon of the plane tells: its signed area, its centroid, whether a point is inside. */
@Injectable({ providedIn: 'root' })
export class Polygons {
  /** Signed area (shoelace), positive counter-clockwise. */
  area(points: readonly Vec2[]): number {
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i]!;
      const b = points[(i + 1) % points.length]!;
      sum += a.cross(b);
    }
    return sum / 2;
  }

  /** The mean of the points; zero for no point. */
  centroid(points: readonly Vec2[]): Vec2 {
    if (points.length === 0) return Vec2.ZERO;
    return points.reduce((acc, p) => acc.add(p), Vec2.ZERO).scale(1 / points.length);
  }

  /** Inside a convex polygon given clockwise, with a tolerance on the edge, in the points' unit. */
  insideConvex(p: Vec2, polygon: readonly Vec2[], tolerance = 1e-9): boolean {
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i]!;
      const b = polygon[(i + 1) % polygon.length]!;
      if (b.sub(a).cross(p.sub(a)) > tolerance) return false;
    }
    return true;
  }
}
