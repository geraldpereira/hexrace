import { Injectable, inject } from '@angular/core';
import { Polygons, Vec3 } from '@hexrace/commons';

import { type Hazard } from '@tile/entity/obstacles/hazard';
import { type Obstacle } from '@tile/entity/obstacles/obstacle';
import { type Patch } from '@tile/entity/obstacles/patch';
import { type SPoint } from '@tile/entity/slice';
import { type TileSweep } from '@tile/entity/sweep';
import { type Paint, type TileBuild, type Triangle3 } from '@tile/entity/triangle';
import { TileBands } from '@tile/geometry/tile-bands';
import { TileFacets } from '@tile/geometry/tile-facets';
import { TileGeometry } from '@tile/geometry/tile-geometry';
import { TileLines } from '@tile/geometry/tile-lines';
import { TileObstacles } from '@tile/geometry/tile-obstacles';
import { Units } from '@tile/geometry/units';

type HeightAt = (p: SPoint) => number;

const SKIRT: Paint = { kind: 'skirt' };

/**
 * The triangles of one tile in metres, the same list for the mesh and the collider (technical
 * spec 3.5): zone quads fanned, hazards as boxes and bands as relief (`TileBands`), a patch as one
 * lifted face, the chequered line barely off the ground, and the skirt down to `skirtBase`
 * (spec 2.7). Every triangle is wound with its normal up or outwards, for Jolt; the line alone is
 * dropped from the collider, by `TileBodies`, so it is paint and not a speed bump.
 */
@Injectable({ providedIn: 'root' })
export class TileTriangles {
  /** How high a hazard stands, how far a flat face and the line are lifted off the ground, in metres. */
  hazardHeight = 1.5;
  flatLift = 0.03;
  lineLift = 0.02;

  private readonly bands = inject(TileBands);
  private readonly facets = inject(TileFacets);
  private readonly geometry = inject(TileGeometry);
  private readonly lines = inject(TileLines);
  private readonly obstacles = inject(TileObstacles);
  private readonly polygons = inject(Polygons);
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
      const lift = this.units.metersToUnits(this.lineLift);
      for (const square of this.lines.squares(sweep, build.line)) {
        this.fan(square.points, heightAt, { kind: 'line', dark: square.dark }, out, lift);
      }
    }
    const inside = this.units.toWorld(sweep.center, 0);
    const base: HeightAt = () => build.skirtBase;
    this.walls(this.geometry.boundary(sweep), heightAt, base, inside, SKIRT, out);
    return out;
  }

  private obstacleTriangles(
    sweep: TileSweep,
    obstacle: Obstacle,
    heightAt: HeightAt,
    out: Triangle3[],
  ): void {
    if (obstacle.kind === 'hazard') this.hazardTriangles(sweep, obstacle, heightAt, out);
    else if (obstacle.kind === 'patch') this.patchTriangles(sweep, obstacle, heightAt, out);
    else out.push(...this.bands.build(sweep, obstacle, heightAt));
  }

  private hazardTriangles(
    sweep: TileSweep,
    obstacle: Hazard,
    heightAt: HeightAt,
    out: Triangle3[],
  ): void {
    const { body } = this.obstacles.footprint(sweep, obstacle);
    const raised = this.units.metersToUnits(this.hazardHeight);
    this.fan(body, heightAt, this.obstaclePaint(obstacle, 'top'), out, raised);
    const outline = this.facets.dedupe(body);
    const inside = this.units.toWorld(this.polygons.centroid(outline.map((p: SPoint) => p.at)), 0);
    const top: HeightAt = (p) => heightAt(p) + raised;
    this.walls(outline, top, heightAt, inside, this.obstaclePaint(obstacle, 'side'), out);
  }

  private patchTriangles(
    sweep: TileSweep,
    obstacle: Patch,
    heightAt: HeightAt,
    out: Triangle3[],
  ): void {
    const { body } = this.obstacles.footprint(sweep, obstacle);
    const paint = this.obstaclePaint(obstacle, 'top');
    const lift = this.units.metersToUnits(this.flatLift);
    for (const quad of this.bandQuads(body)) this.fan(quad, heightAt, paint, out, lift);
  }

  private fan(
    points: readonly SPoint[],
    heightAt: HeightAt,
    paint: Paint,
    out: Triangle3[],
    lift = 0,
  ): void {
    const contour = this.facets.dedupe(points);
    const world = contour.map((p: SPoint) => this.facets.point(p, heightAt(p) + lift));
    this.facets.polygon(world, paint, Vec3.UP, out);
  }

  private walls(
    outline: readonly SPoint[],
    top: HeightAt,
    base: HeightAt,
    inside: Vec3,
    paint: Paint,
    out: Triangle3[],
  ): void {
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i]!;
      const b = outline[(i + 1) % outline.length]!;
      this.facets.wall(
        [this.facets.point(a, top(a)), this.facets.point(b, top(b))],
        [this.facets.point(a, base(a)), this.facets.point(b, base(b))],
        inside,
        paint,
        out,
      );
    }
  }

  private bandQuads(body: readonly SPoint[]): SPoint[][] {
    const slices = this.obstacles.slices(body);
    const quads: SPoint[][] = [];
    for (let i = 0; i + 1 < slices.length; i++) {
      const [left, right] = slices[i]!;
      const [nextLeft, nextRight] = slices[i + 1]!;
      quads.push([left, nextLeft, nextRight, right]);
    }
    return quads;
  }

  private obstaclePaint(obstacle: Obstacle, face: 'top' | 'side'): Paint {
    const paint: Paint = { kind: 'obstacle', obstacle: obstacle.kind, face };
    return obstacle.kind === 'patch' ? { ...paint, road: obstacle.road } : paint;
  }
}
