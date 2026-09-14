import { Injectable, inject } from '@angular/core';
import { type Rng } from '@hexrace/commons';
import {
  type HazardSize,
  type Obstacle,
  type RoadType,
  type TileSweep,
  Faces,
  TileValidation,
} from '@hexrace/tile';

import { type Dials } from '@track/entity/generation';

const SIZES: readonly HazardSize[] = ['small', 'medium', 'large'];

/**
 * The obstacles a generated tile carries (functional spec 2.4), according to the density dial:
 * one candidate drawn per tile, kept only when it fits inside its tile. Barriers go on the outside
 * of a turn, ramps only on a straight; the start and finish tiles get none.
 */
@Injectable({ providedIn: 'root' })
export class ObstacleSeeder {
  private readonly faces = inject(Faces);
  private readonly validation = inject(TileValidation);

  make(rng: Rng, dials: Dials, sweep: TileSweep): Obstacle[] {
    if (!rng.chance(dials.obstacles * 0.6)) return [];
    const candidate = this.candidate(rng, sweep);
    return this.validation.obstacle(sweep, candidate).length === 0 ? [candidate] : [];
  }

  private candidate(rng: Rng, sweep: TileSweep): Obstacle {
    const turn = this.faces.turnOf(sweep.exit);
    const roll = rng.next();
    if (roll < 0.35) return this.hazard(rng, sweep);
    if (roll < 0.6) return { kind: 'barrier', side: this.outerSide(rng, turn), from: 0, to: 1 };
    if (roll < 0.7 && turn === 0) return { kind: 'ramp', from: 0.4, to: 0.55 };
    if (roll < 0.82) return { kind: 'bump', from: 0.45, to: 0.55 };
    return {
      kind: 'patch',
      road: ((sweep.exitProfile.road % 3) + 1) as RoadType,
      from: 0.3,
      to: 0.7,
      offset: 0,
      width: Math.min(sweep.exitProfile.roadWidth, 1 + rng.int(2)),
    };
  }

  private outerSide(rng: Rng, turn: number): 'left' | 'right' {
    if (turn !== 0) return turn > 0 ? 'left' : 'right';
    return rng.chance(0.5) ? 'left' : 'right';
  }

  private hazard(rng: Rng, sweep: TileSweep): Obstacle {
    const half = sweep.exitProfile.roadWidth / 2 + sweep.exitProfile.rightShoulder;
    return {
      kind: 'hazard',
      size: SIZES[rng.int(SIZES.length)]!,
      at: 0.3 + rng.next() * 0.4,
      offset: Math.round((rng.next() * 2 - 1) * half * 2) / 2,
    };
  }
}
