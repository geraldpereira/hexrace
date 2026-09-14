import { type Vec2 } from '@commons/math/vec2';

/** Signed area of a polygon (shoelace), positive counter-clockwise. */
export function polygonArea(points: readonly Vec2[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    sum += a.cross(b);
  }
  return sum / 2;
}

/** Inside a convex polygon given clockwise, with a tolerance on the edge, in the points' unit. */
export function insideConvex(p: Vec2, polygon: readonly Vec2[], tolerance = 1e-9): boolean {
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    if (b.sub(a).cross(p.sub(a)) > tolerance) return false;
  }
  return true;
}
