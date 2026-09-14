import { Injectable, inject } from '@angular/core';
import { Vec2, Vec3 } from '@hexrace/commons';

import { type Obstacle } from '@tile/entity/obstacle';
import { type SPoint } from '@tile/entity/slice';
import { type TileSweep } from '@tile/entity/sweep';
import { type Paint, type TileBuild, type Triangle3 } from '@tile/entity/triangle';
import { TileGeometry } from '@tile/geometry/tile-geometry';
import { TileLines } from '@tile/geometry/tile-lines';
import { TileObstacles } from '@tile/geometry/tile-obstacles';
import { Units } from '@tile/geometry/units';

type HeightAt = (p: SPoint) => number;

/**
 * The triangles of one tile in metres, the same list for the mesh and the collider (technical
 * spec 3.5): zone quads fanned, obstacles as volumes whose top follows the ground and whose sides
 * drop to it (flat ones as one lifted face until driven), the chequered line, and the skirt down
 * to `skirtBase` (spec 2.7). Every triangle is wound with its normal up or outwards, for Jolt.
 */
@Injectable({ providedIn: 'root' })
export class TileTriangles {
  /** How high a hazard and a barrier stand, and how much a flat face is lifted, in units. */
  hazardHeight = 1;
  barrierHeight = 0.8;
  flatLift = 0.04;

  private readonly geometry = inject(TileGeometry);
  private readonly obstacles = inject(TileObstacles);
  private readonly lines = inject(TileLines);
  private readonly units = inject(Units);

  build(build: TileBuild): Triangle3[] {
    const { sweep } = build;
    const out: Triangle3[] = [];
    const heightAt: HeightAt = (p) => this.geometry.heightOf(sweep, p);
    for (const quad of this.geometry.quads(sweep)) {
      this.fan(quad.points, heightAt, { kind: 'zone', zone: quad.zone, type: quad.type }, out);
    }
    for (const obstacle of build.obstacles ?? []) {
      this.obstacleTriangles(sweep, obstacle, heightAt, out);
    }
    if (build.line !== null && build.line !== undefined) {
      for (const square of this.lines.squares(sweep, build.line)) {
        this.fan(
          square.points,
          heightAt,
          { kind: 'line', dark: square.dark },
          out,
          this.flatLift * 1.5,
        );
      }
    }
    const inside = this.units.toWorld(sweep.center, 0);
    const outline = this.geometry.boundary(sweep);
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i]!;
      const b = outline[(i + 1) % outline.length]!;
      this.wall(a, b, heightAt, () => build.skirtBase, { kind: 'skirt' }, inside, out);
    }
    return out;
  }

  private obstacleTriangles(
    sweep: TileSweep,
    obstacle: Obstacle,
    heightAt: HeightAt,
    out: Triangle3[],
  ): void {
    const body = this.obstacles.footprint(sweep, obstacle).body;
    const raised = this.raisedBy(obstacle);
    const top = obstaclePaint(obstacle, 'top');
    const pieces = obstacle.kind === 'hazard' ? [body] : bandQuads(body);
    for (const piece of pieces)
      this.fan(piece, heightAt, top, out, raised > 0 ? raised : this.flatLift);
    if (raised === 0) return;
    const side = obstaclePaint(obstacle, 'side');
    const outline = dedupe(body);
    const inside = this.units.toWorld(centroid(outline), 0);
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i]!;
      const b = outline[(i + 1) % outline.length]!;
      this.wall(a, b, (p) => heightAt(p) + raised, heightAt, side, inside, out);
    }
  }

  private raisedBy(obstacle: Obstacle): number {
    if (obstacle.kind === 'hazard') return this.hazardHeight;
    return obstacle.kind === 'barrier' ? this.barrierHeight : 0;
  }

  private fan(
    points: readonly SPoint[],
    heightAt: HeightAt,
    paint: Paint,
    out: Triangle3[],
    lift = 0,
  ): void {
    const contour = dedupe(points);
    if (contour.length < 3) return;
    const lifted = (p: SPoint): Vec3 => this.units.toWorld(p.at, heightAt(p) + lift);
    const a = lifted(contour[0]!);
    for (let i = 1; i + 1 < contour.length; i++) {
      out.push(oriented(a, lifted(contour[i]!), lifted(contour[i + 1]!), paint, Vec3.UP));
    }
  }

  private wall(
    a: SPoint,
    b: SPoint,
    top: HeightAt,
    base: HeightAt,
    paint: Paint,
    inside: Vec3,
    out: Triangle3[],
  ): void {
    const w = this.units;
    const q = [
      w.toWorld(a.at, top(a)),
      w.toWorld(b.at, top(b)),
      w.toWorld(b.at, base(b)),
      w.toWorld(a.at, base(a)),
    ];
    const middle = q[0]!.add(q[1]!).scale(0.5);
    const outward = new Vec3(middle.x - inside.x, 0, middle.z - inside.z);
    out.push(
      oriented(q[0]!, q[1]!, q[2]!, paint, outward),
      oriented(q[0]!, q[2]!, q[3]!, paint, outward),
    );
  }
}

function oriented(a: Vec3, b: Vec3, c: Vec3, paint: Paint, outward: Vec3): Triangle3 {
  const normal = b.sub(a).cross(c.sub(a));
  return normal.dot(outward) < 0 ? { a, b: c, c: b, paint } : { a, b, c, paint };
}

function bandQuads(points: readonly SPoint[]): SPoint[][] {
  const n = points.length / 2;
  const quads: SPoint[][] = [];
  for (let i = 0; i + 1 < n; i++) {
    quads.push([points[i]!, points[i + 1]!, points[2 * n - 2 - i]!, points[2 * n - 1 - i]!]);
  }
  return quads;
}

function obstaclePaint(obstacle: Obstacle, face: 'top' | 'side'): Paint {
  const paint: Paint = { kind: 'obstacle', obstacle: obstacle.kind, face };
  return obstacle.kind === 'patch' ? { ...paint, road: obstacle.road } : paint;
}

function centroid(points: readonly SPoint[]): Vec2 {
  return points.reduce((acc, p) => acc.add(p.at), Vec2.ZERO).scale(1 / points.length);
}

function dedupe(points: readonly SPoint[]): SPoint[] {
  const result: SPoint[] = [];
  for (const p of points) {
    const last = result.at(-1);
    if (!last || p.at.distanceTo(last.at) > 1e-6) result.push(p);
  }
  return result;
}
