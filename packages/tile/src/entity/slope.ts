import { type ExitFace, type TurnKind, turnKind } from '@tile/entity/face';
import { pathLength } from '@tile/entity/path';
import { HEIGHT_STEP_METERS, UNIT_METERS } from '@tile/entity/units';

/** The most a tile may climb by exit, along the axis; a turn's inner edge is steeper (spec 2.3). */
export const MAX_SLOPE: Readonly<Record<TurnKind, number>> = {
  straight: 0.2,
  wide: 0.15,
  sharp: 0.1,
};

/** The generator stays below the hand: half the threshold. */
export const GENERATOR_SLOPE_FACTOR = 0.5;

/**
 * The slope at a node between two segments of mean slopes `a` and `b` and lengths `la` and `lb`
 * (Steffen, 1990): nothing is written in the data, the track deduces each face's slope from the
 * two tiles touching it, in height units per unit of axis length, and `hermite` draws the height.
 */
export function steffen(a: number, b: number, la: number, lb: number): number {
  if (a * b <= 0) return 0;
  const p = (a * lb + b * la) / (la + lb);
  return (Math.sign(a) + Math.sign(b)) * Math.min(Math.abs(a), Math.abs(b), Math.abs(p) / 2);
}

/** Cubic Hermite interpolation on [0, 1]: heights and tangents (derivatives in s) at both ends. */
export function hermite(h0: number, t0: number, h1: number, t1: number, s: number): number {
  const s2 = s * s;
  const s3 = s2 * s;
  return (
    (2 * s3 - 3 * s2 + 1) * h0 + (s3 - 2 * s2 + s) * t0 + (-2 * s3 + 3 * s2) * h1 + (s3 - s2) * t1
  );
}

/** The slope of a tile as a fraction (0.2 = 20 %): steps climbed over axis length, both in metres. */
export function slopeOf(exit: ExitFace, heightSteps: number): number {
  return (heightSteps * HEIGHT_STEP_METERS) / (pathLength(exit) * UNIT_METERS);
}

/** The most whole steps a tile may climb to stay under the threshold of its exit. */
export function maxHeightSteps(exit: ExitFace, factor = 1): number {
  const slope = MAX_SLOPE[turnKind(exit)] * factor;
  return Math.floor((slope * pathLength(exit) * UNIT_METERS) / HEIGHT_STEP_METERS + 1e-9);
}
