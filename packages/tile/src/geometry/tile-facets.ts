import { Injectable, inject } from '@angular/core';
import { Vec3 } from '@hexrace/commons';

import { type SPoint } from '@tile/entity/slice';
import { type Paint, type Triangle3 } from '@tile/entity/triangle';
import { Units } from '@tile/geometry/units';

const FLAT = 1e-12;

/**
 * The winding primitives every part of a tile shares: a point of the plane brought into the world
 * in metres, a polygon fanned into triangles, a wall dropped between two of them. Each triangle is
 * wound so its normal follows the direction given, up for a face, outwards for a wall, because
 * Jolt only collides with the front face of a mesh (technical spec 3.5); a triangle with no area
 * is dropped rather than handed on.
 */
@Injectable({ providedIn: 'root' })
export class TileFacets {
  private readonly units = inject(Units);

  /** A slice point in the world, at the height given in units. */
  point(p: SPoint, height: number): Vec3 {
    return this.units.toWorld(p.at, height);
  }

  /** The polygon fanned from its first point, every triangle wound along `outward`. */
  polygon(points: readonly Vec3[], paint: Paint, outward: Vec3, out: Triangle3[]): void {
    const a = points[0];
    if (!a) return;
    for (let i = 1; i + 1 < points.length; i++) {
      this.push(a, points[i]!, points[i + 1]!, paint, outward, out);
    }
  }

  /** The quad between two top points and the two below them, wound away from `inside`. */
  wall(
    top: readonly [Vec3, Vec3],
    base: readonly [Vec3, Vec3],
    inside: Vec3,
    paint: Paint,
    out: Triangle3[],
  ): void {
    const middle = top[0].add(top[1]).scale(0.5);
    const outward = new Vec3(middle.x - inside.x, 0, middle.z - inside.z);
    this.polygon([top[0], top[1], base[1], base[0]], paint, outward, out);
  }

  /** Repeated points dropped, so a contour that collapsed makes no degenerate triangle. */
  dedupe(points: readonly SPoint[]): SPoint[] {
    const result: SPoint[] = [];
    for (const p of points) {
      const last = result.at(-1);
      if (!last || p.at.distanceTo(last.at) > 1e-6) result.push(p);
    }
    return result;
  }

  private push(a: Vec3, b: Vec3, c: Vec3, paint: Paint, outward: Vec3, out: Triangle3[]): void {
    const normal = b.sub(a).cross(c.sub(a));
    if (normal.length() < FLAT) return;
    out.push(normal.dot(outward) < 0 ? { a, b: c, c: b, paint } : { a, b, c, paint });
  }
}
