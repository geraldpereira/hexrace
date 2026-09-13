import { Injectable, inject } from '@angular/core';

import { TileLines } from '@tile/entity/checker';
import { type SPoint, TileGeometry } from '@tile/entity/geometry';
import { type Vec2 } from '@tile/entity/layout';
import { type Obstacle, TileObstacles } from '@tile/entity/obstacle';
import { type RoadType, type Zone } from '@tile/entity/profile';
import { type TileSweep } from '@tile/entity/sweep';
import { UNIT_METERS } from '@tile/entity/units';

/** A point of the 3D world in metres, y up, z pointing south (the plane's -y). */
export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** What a triangle is made of, for the renderer to colour and the physics to know. */
export type Paint =
  | { readonly kind: 'zone'; readonly zone: Zone; readonly type: number }
  | { readonly kind: 'skirt' }
  | {
      readonly kind: 'obstacle';
      readonly obstacle: Obstacle['kind'];
      readonly road?: RoadType;
      readonly face: 'top' | 'side';
    }
  | { readonly kind: 'line'; readonly dark: boolean };

export interface Triangle3 {
  readonly a: Vec3;
  readonly b: Vec3;
  readonly c: Vec3;
  readonly paint: Paint;
}

/** What to build: the sweep, its obstacles, a chequered line at that `s` or none, the skirt's floor in units. */
export interface TileBuild {
  readonly sweep: TileSweep;
  readonly obstacles?: readonly Obstacle[];
  readonly line?: number | null;
  readonly skirtBase: number;
}

const UP: Vec3 = { x: 0, y: 1, z: 0 };

type HeightAt = (p: SPoint) => number;

export function toWorld(p: Vec2, height: number): Vec3 {
  return { x: p.x * UNIT_METERS, y: height * UNIT_METERS, z: -p.y * UNIT_METERS };
}

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

  build(build: TileBuild): Triangle3[] {
    const { sweep } = build;
    const out: Triangle3[] = [];
    const heightAt: HeightAt = (p) => this.geometry.heightOf(sweep, p);
    for (const quad of this.geometry.quads(sweep)) {
      fan(quad.points, heightAt, { kind: 'zone', zone: quad.zone, type: quad.type }, out);
    }
    for (const obstacle of build.obstacles ?? []) {
      this.obstacleTriangles(sweep, obstacle, heightAt, out);
    }
    if (build.line !== null && build.line !== undefined) {
      for (const square of this.lines.squares(sweep, build.line)) {
        fan(square.points, heightAt, { kind: 'line', dark: square.dark }, out, this.flatLift * 1.5);
      }
    }
    skirt(this.geometry.boundary(sweep), heightAt, build.skirtBase, toWorld(sweep.center, 0), out);
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
    for (const piece of pieces) fan(piece, heightAt, top, out, raised > 0 ? raised : this.flatLift);
    if (raised === 0) return;
    const side = obstaclePaint(obstacle, 'side');
    const outline = dedupe(body);
    const inside = centroid(outline);
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i]!;
      const b = outline[(i + 1) % outline.length]!;
      wall(a, b, (p) => heightAt(p) + raised, heightAt, side, inside, out);
    }
  }

  private raisedBy(obstacle: Obstacle): number {
    if (obstacle.kind === 'hazard') return this.hazardHeight;
    return obstacle.kind === 'barrier' ? this.barrierHeight : 0;
  }
}

function fan(points: SPoint[], heightAt: HeightAt, paint: Paint, out: Triangle3[], lift = 0): void {
  const contour = dedupe(points);
  if (contour.length < 3) return;
  const first = contour[0]!;
  const a = toWorld(first, heightAt(first) + lift);
  for (let i = 1; i + 1 < contour.length; i++) {
    const b = contour[i]!;
    const c = contour[i + 1]!;
    out.push(
      oriented(a, toWorld(b, heightAt(b) + lift), toWorld(c, heightAt(c) + lift), paint, UP),
    );
  }
}

function oriented(a: Vec3, b: Vec3, c: Vec3, paint: Paint, outward: Vec3): Triangle3 {
  const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
  const normal = {
    x: ab.y * ac.z - ab.z * ac.y,
    y: ab.z * ac.x - ab.x * ac.z,
    z: ab.x * ac.y - ab.y * ac.x,
  };
  const facing = normal.x * outward.x + normal.y * outward.y + normal.z * outward.z;
  return facing < 0 ? { a, b: c, c: b, paint } : { a, b, c, paint };
}

function bandQuads(points: SPoint[]): SPoint[][] {
  const n = points.length / 2;
  const quads: SPoint[][] = [];
  for (let i = 0; i + 1 < n; i++) {
    quads.push([points[i]!, points[i + 1]!, points[2 * n - 2 - i]!, points[2 * n - 1 - i]!]);
  }
  return quads;
}

function wall(
  a: SPoint,
  b: SPoint,
  top: HeightAt,
  base: HeightAt,
  paint: Paint,
  inside: Vec3,
  out: Triangle3[],
): void {
  const q = [toWorld(a, top(a)), toWorld(b, top(b)), toWorld(b, base(b)), toWorld(a, base(a))];
  const outward = {
    x: (q[0]!.x + q[1]!.x) / 2 - inside.x,
    y: 0,
    z: (q[0]!.z + q[1]!.z) / 2 - inside.z,
  };
  out.push(
    oriented(q[0]!, q[1]!, q[2]!, paint, outward),
    oriented(q[0]!, q[2]!, q[3]!, paint, outward),
  );
}

function skirt(
  outline: SPoint[],
  heightAt: HeightAt,
  base: number,
  inside: Vec3,
  out: Triangle3[],
): void {
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]!;
    const b = outline[(i + 1) % outline.length]!;
    wall(a, b, heightAt, () => base, { kind: 'skirt' }, inside, out);
  }
}

function obstaclePaint(obstacle: Obstacle, face: 'top' | 'side'): Paint {
  const paint: Paint = { kind: 'obstacle', obstacle: obstacle.kind, face };
  return obstacle.kind === 'patch' ? { ...paint, road: obstacle.road } : paint;
}

function centroid(points: SPoint[]): Vec3 {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return toWorld({ x: sum.x / points.length, y: sum.y / points.length }, 0);
}

function dedupe(points: SPoint[]): SPoint[] {
  const result: SPoint[] = [];
  for (const p of points) {
    const last = result.at(-1);
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 1e-6) result.push(p);
  }
  return result;
}
