import { Injectable, inject } from '@angular/core';

import { type ExitFace } from '@tile/entity/face';
import { MAX_SLOPE } from '@tile/entity/slope';
import { HEIGHT_STEP_METERS, UNIT_METERS } from '@tile/entity/units';
import { Faces } from '@tile/geometry/faces';
import { TilePaths } from '@tile/geometry/tile-paths';

/**
 * Slopes along the axis (functional spec 2.3), in height units per unit of axis length. Nothing is
 * written in the data: the track deduces each face's slope from the two tiles touching it with
 * `steffen`, and the thresholds bound what a tile may climb according to its exit.
 */
@Injectable({ providedIn: 'root' })
export class Slopes {
  private readonly faces = inject(Faces);
  private readonly paths = inject(TilePaths);

  /** The slope at a node between two segments of mean slopes `a` and `b` and lengths `la` and `lb` (Steffen, 1990). */
  steffen(a: number, b: number, la: number, lb: number): number {
    if (a * b <= 0) return 0;
    const p = (a * lb + b * la) / (la + lb);
    return (Math.sign(a) + Math.sign(b)) * Math.min(Math.abs(a), Math.abs(b), Math.abs(p) / 2);
  }

  /** The slope of a tile as a fraction (0.2 = 20 %): steps climbed over axis length, both in metres. */
  slopeOf(exit: ExitFace, heightSteps: number): number {
    return (heightSteps * HEIGHT_STEP_METERS) / (this.paths.length(exit) * UNIT_METERS);
  }

  /** The most whole steps a tile may climb to stay under the threshold of its exit. */
  maxHeightSteps(exit: ExitFace, factor = 1): number {
    const slope = MAX_SLOPE[this.faces.turnKind(exit)] * factor;
    return Math.floor((slope * this.paths.length(exit) * UNIT_METERS) / HEIGHT_STEP_METERS + 1e-9);
  }
}
