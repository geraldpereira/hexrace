import { Injectable, inject } from '@angular/core';
import { type Rng } from '@hexrace/commons';
import {
  type Boundaries,
  type HazardSize,
  type Obstacle,
  type RoadType,
  type SPoint,
  type TileSweep,
  Faces,
  TileObstacles,
  TileSweeper,
  TileValidation,
} from '@hexrace/tile';

import { type Dials } from '@track/entity/generation';

const SIZES: readonly HazardSize[] = ['small', 'medium', 'large'];
const ROAD_TYPES: readonly RoadType[] = [1, 2, 3];
const STEP = 0.5;
const EPSILON = 1e-9;
const MIN_PASSAGE = 1;

/**
 * The obstacles a generated tile carries (functional spec 2.4), according to the density dial:
 * one candidate drawn per tile, kept only when it fits inside its tile. Barriers go on the outside
 * of a turn, ramps only on a straight; the start and finish tiles get none. A hazard never blocks
 * the way: its offset is drawn among those leaving a unit of road free on one side of it, and it
 * drops a size, then becomes a patch, when its size has no such offset on that road.
 */
@Injectable({ providedIn: 'root' })
export class ObstacleSeeder {
  private readonly faces = inject(Faces);
  private readonly obstacles = inject(TileObstacles);
  private readonly sweeper = inject(TileSweeper);
  private readonly validation = inject(TileValidation);

  make(rng: Rng, dials: Dials, sweep: TileSweep): Obstacle[] {
    if (!rng.chance(dials.obstacles * 0.6)) return [];
    const candidate = this.candidate(rng, sweep);
    return this.validation.obstacle(sweep, candidate).length === 0 ? [candidate] : [];
  }

  private candidate(rng: Rng, sweep: TileSweep): Obstacle {
    const turn = this.faces.turnOf(sweep.exit);
    const straight = turn === 0;
    const roll = rng.next();
    if (roll < 0.35) return this.hazard(rng, sweep);
    if (roll < (straight ? 0.55 : 0.6)) {
      return { kind: 'barrier', side: this.outerSide(rng, turn), from: 0, to: 1 };
    }
    if (roll < 0.7 && straight) return { kind: 'ramp', from: 0.4, to: 0.55 };
    if (roll < 0.82) return { kind: 'bump', from: 0.45, to: 0.55 };
    return this.patch(rng, sweep);
  }

  private outerSide(rng: Rng, turn: number): 'left' | 'right' {
    if (turn !== 0) return turn > 0 ? 'left' : 'right';
    return rng.chance(0.5) ? 'left' : 'right';
  }

  private patch(rng: Rng, sweep: TileSweep): Obstacle {
    return {
      kind: 'patch',
      road: this.otherRoad(rng, sweep.exitProfile.road),
      from: 0.3,
      to: 0.7,
      offset: 0,
      width: Math.min(sweep.exitProfile.roadWidth, 1 + rng.int(2)),
    };
  }

  private otherRoad(rng: Rng, road: RoadType): RoadType {
    const others = ROAD_TYPES.filter((one: RoadType) => one !== road);
    return others[rng.int(others.length)]!;
  }

  private hazard(rng: Rng, sweep: TileSweep): Obstacle {
    const drawn = rng.int(SIZES.length);
    const at = 0.3 + rng.next() * 0.4;
    const bounds = this.sweeper.boundariesAt(sweep, at);
    for (let rank = drawn; rank >= 0; rank--) {
      const size = SIZES[rank]!;
      const offsets = this.offsets(sweep, bounds, size, at);
      if (offsets.length > 0) {
        return { kind: 'hazard', size, at, offset: offsets[rng.int(offsets.length)]! };
      }
    }
    return this.patch(rng, sweep);
  }

  private offsets(
    sweep: TileSweep,
    bounds: Boundaries,
    size: HazardSize,
    at: number,
  ): readonly number[] {
    const arm = this.armOf(sweep, bounds, size, at);
    const half = bounds.roadLeft.distanceTo(bounds.roadRight) / 2;
    const toLeft = bounds.blockLeft.distanceTo(bounds.roadLeft);
    const toRight = bounds.blockRight.distanceTo(bounds.roadRight);
    return [
      ...new Set([
        ...this.steps(arm - half - toLeft, half - MIN_PASSAGE - arm),
        ...this.steps(MIN_PASSAGE - half + arm, half + toRight - arm),
      ]),
    ];
  }

  private armOf(sweep: TileSweep, bounds: Boundaries, size: HazardSize, at: number): number {
    const { outline } = this.obstacles.footprint(sweep, { kind: 'hazard', size, at, offset: 0 });
    return Math.max(
      ...outline.map((p: SPoint) => Math.abs(p.at.sub(bounds.center).dot(bounds.right))),
    );
  }

  private steps(low: number, high: number): number[] {
    const first = Math.ceil((low - EPSILON) / STEP);
    const last = Math.floor((high + EPSILON) / STEP);
    const found: number[] = [];
    for (let i = first; i <= last; i++) found.push(i * STEP);
    return found;
  }
}
