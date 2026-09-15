import { Injectable, inject } from '@angular/core';
import { type Vec2 } from '@hexrace/commons';

import {
  type Barrier,
  BARRIER_BODY_METERS,
  BARRIER_FOOTPRINT_WIDTH,
} from '@tile/entity/obstacles/barrier';
import { type Footprint } from '@tile/entity/obstacles/footprint';
import { type Hazard, HAZARD_FOOTPRINT } from '@tile/entity/obstacles/hazard';
import { type Obstacle } from '@tile/entity/obstacles/obstacle';
import { type SPoint } from '@tile/entity/slice';
import { type Boundaries, type TileSweep } from '@tile/entity/sweep';
import { TileSweeper } from '@tile/geometry/tile-sweeper';
import { Units } from '@tile/geometry/units';

/** Lays obstacles on a swept tile: where each sits in the plane, as an outline and a body. */
@Injectable({ providedIn: 'root' })
export class TileObstacles {
  /** Samples along a band; more keeps a long barrier round in a sharp turn. */
  bandSamples = 12;

  private readonly sweeper = inject(TileSweeper);
  private readonly units = inject(Units);

  footprint(sweep: TileSweep, obstacle: Obstacle): Footprint {
    switch (obstacle.kind) {
      case 'hazard':
        return this.hazardFootprint(sweep, obstacle);
      case 'barrier':
        return this.barrierFootprint(sweep, obstacle);
      case 'ramp':
      case 'bump': {
        const outline = this.band(sweep, obstacle, (b) => [b.roadLeft, b.roadRight]);
        return { obstacle, outline, body: outline };
      }
      case 'patch': {
        const outline = this.band(sweep, obstacle, (b) => [
          b.center.add(b.right.scale(obstacle.offset - obstacle.width / 2)),
          b.center.add(b.right.scale(obstacle.offset + obstacle.width / 2)),
        ]);
        return { obstacle, outline, body: outline };
      }
    }
  }

  /** A band's body read back as slices, each the left then the right point of one sample. */
  slices(body: readonly SPoint[]): [SPoint, SPoint][] {
    const count = body.length / 2;
    return Array.from({ length: count }, (_, i): [SPoint, SPoint] => [
      body[i]!,
      body[2 * count - 1 - i]!,
    ]);
  }

  private hazardFootprint(sweep: TileSweep, obstacle: Hazard): Footprint {
    const { length, width } = HAZARD_FOOTPRINT[obstacle.size];
    const b = this.sweeper.boundariesAt(sweep, obstacle.at);
    const center = b.center.add(b.right.scale(obstacle.offset));
    const along = b.travel.scale(length / 2);
    const across = b.right.scale(width / 2);
    const outline = [
      center.add(along).add(across),
      center.add(along).sub(across),
      center.sub(along).sub(across),
      center.sub(along).add(across),
    ].map((at) => ({ at, s: obstacle.at }));
    return { obstacle, outline, body: outline };
  }

  private barrierFootprint(sweep: TileSweep, obstacle: Barrier): Footprint {
    const out = obstacle.side === 'left' ? -1 : 1;
    const edge = obstacle.side === 'left' ? 'roadLeft' : 'roadRight';
    const thickness = this.units.metersToUnits(BARRIER_BODY_METERS);
    const outline = this.band(sweep, obstacle, (b) => [
      b[edge],
      b[edge].add(b.right.scale(out * BARRIER_FOOTPRINT_WIDTH)),
    ]);
    const body = this.band(sweep, obstacle, (b) => [
      b[edge].add(b.right.scale(out * (BARRIER_FOOTPRINT_WIDTH - thickness))),
      b[edge].add(b.right.scale(out * BARRIER_FOOTPRINT_WIDTH)),
    ]);
    return { obstacle, outline, body };
  }

  private band(
    sweep: TileSweep,
    span: { readonly from: number; readonly to: number },
    edges: (b: Boundaries) => [Vec2, Vec2],
  ): SPoint[] {
    const left: SPoint[] = [];
    const right: SPoint[] = [];
    for (let i = 0; i <= this.bandSamples; i++) {
      const s = span.from + ((span.to - span.from) * i) / this.bandSamples;
      const [l, r] = edges(this.sweeper.boundariesAt(sweep, s));
      left.push({ at: l, s });
      right.push({ at: r, s });
    }
    return [...left, ...right.reverse()];
  }
}
