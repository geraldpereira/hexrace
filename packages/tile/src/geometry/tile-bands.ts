import { Injectable, inject } from '@angular/core';
import { Vec3 } from '@hexrace/commons';

import { type Barrier } from '@tile/entity/obstacles/barrier';
import { type RoadBand } from '@tile/entity/obstacles/road-band';
import { type SPoint } from '@tile/entity/slice';
import { type TileSweep } from '@tile/entity/sweep';
import { type Paint, type Triangle3 } from '@tile/entity/triangle';
import { TileFacets } from '@tile/geometry/tile-facets';
import { TileObstacles } from '@tile/geometry/tile-obstacles';
import { Units } from '@tile/geometry/units';

type HeightAt = (p: SPoint) => number;

/** One sample of a band in the world: its two ground points, the two above them, their middle. */
interface BandRung {
  readonly ground: readonly [Vec3, Vec3];
  readonly top: readonly [Vec3, Vec3];
  readonly middle: Vec3;
}

/**
 * The relief of a band laid along the road — a barrier, a ramp, a bump: its top follows the ground
 * plus a lift its kind decides, and walls close it down to the ground along both edges and at both
 * ends. Every wall is wound away from the middle of its own pair of samples, never from the band's
 * centroid: on a long band in a turn that centroid falls on the wrong side of some segments and
 * Jolt then sees their back face, which collides with nothing (technical spec 3.5).
 */
@Injectable({ providedIn: 'root' })
export class TileBands {
  /** How high a barrier stands, where a ramp ends, how high a bump rises at its middle, in metres. */
  barrierHeight = 1;
  rampHeight = 0.8;
  bumpHeight = 0.3;

  private readonly facets = inject(TileFacets);
  private readonly obstacles = inject(TileObstacles);
  private readonly units = inject(Units);

  /** The triangles of one band in metres: its top, its two sides, its two ends. */
  build(sweep: TileSweep, obstacle: Barrier | RoadBand, heightAt: HeightAt): Triangle3[] {
    const rungs = this.rungs(sweep, obstacle, heightAt);
    const top = this.paint(obstacle, 'top');
    const side = this.paint(obstacle, 'side');
    const out: Triangle3[] = [];
    for (let i = 0; i + 1 < rungs.length; i++) {
      const a = rungs[i]!;
      const b = rungs[i + 1]!;
      this.facets.polygon([a.top[0], b.top[0], b.top[1], a.top[1]], top, Vec3.UP, out);
      const inside = a.middle.add(b.middle).scale(0.5);
      this.facets.wall([a.top[0], b.top[0]], [a.ground[0], b.ground[0]], inside, side, out);
      this.facets.wall([a.top[1], b.top[1]], [a.ground[1], b.ground[1]], inside, side, out);
    }
    const first = rungs[0]!;
    const last = rungs.at(-1)!;
    this.facets.wall(first.top, first.ground, rungs[1]!.middle, side, out);
    this.facets.wall(last.top, last.ground, rungs.at(-2)!.middle, side, out);
    return out;
  }

  /** How high the band stands above the ground at `t` along it, 0 to 1, in units. */
  liftAt(obstacle: Barrier | RoadBand, t: number): number {
    if (obstacle.kind === 'barrier') return this.units.metersToUnits(this.barrierHeight);
    if (obstacle.kind === 'ramp') return this.units.metersToUnits(this.rampHeight * t);
    const bump = (this.bumpHeight * (1 - Math.cos(2 * Math.PI * t))) / 2;
    return this.units.metersToUnits(bump);
  }

  private rungs(sweep: TileSweep, obstacle: Barrier | RoadBand, heightAt: HeightAt): BandRung[] {
    const { body } = this.obstacles.footprint(sweep, obstacle);
    const slices = this.obstacles.slices(body);
    const span = Math.max(1, slices.length - 1);
    return slices.map(([l, r]: [SPoint, SPoint], i: number): BandRung => {
      const lift = this.liftAt(obstacle, i / span);
      const ground: [Vec3, Vec3] = [
        this.facets.point(l, heightAt(l)),
        this.facets.point(r, heightAt(r)),
      ];
      const top: [Vec3, Vec3] = [
        this.facets.point(l, heightAt(l) + lift),
        this.facets.point(r, heightAt(r) + lift),
      ];
      return { ground, top, middle: ground[0].add(ground[1]).scale(0.5) };
    });
  }

  private paint(obstacle: Barrier | RoadBand, face: 'top' | 'side'): Paint {
    return { kind: 'obstacle', obstacle: obstacle.kind, face };
  }
}
