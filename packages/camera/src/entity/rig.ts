import { degToRad, lerp, ramp } from '@hexrace/commons';

import { type CameraTarget, type Vec3Like } from '@camera/entity/camera-target';
import { type CameraTuning } from '@camera/entity/camera-tuning';

/** Where the camera should be and what it should look at, before any smoothing. */
export interface RigPose {
  readonly eye: Vec3Like;
  readonly aim: Vec3Like;
  /** The heading the camera ends up aligned with, radians. */
  readonly heading: number;
}

const TWO_PI = 2 * Math.PI;

/** The signed shortest turn from `from` to `to`, in (-π, π]. */
export function turnBetween(from: number, to: number): number {
  const d = (to - from) % TWO_PI;
  if (d > Math.PI) return d - TWO_PI;
  if (d <= -Math.PI) return d + TWO_PI;
  return d;
}

/** The heading from `from` to `to`, in the target's convention (0 along +Z). */
export function headingTo(from: Vec3Like, to: Vec3Like): number {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

/**
 * Solves the camera's pose for a target (functional spec 3.9): behind it along a heading that
 * leans towards the next tile by `anticipation`, capped by `anticipationMaxDeg`; as high as the
 * speed asks between the two heights; aiming `lookAhead` metres ahead along the same heading.
 */
export function solveRig(target: CameraTarget, tuning: CameraTuning): RigPose {
  let heading = target.heading;
  if (target.nextTile) {
    const turn = turnBetween(heading, headingTo(target.position, target.nextTile));
    const cap = degToRad(tuning.anticipationMaxDeg);
    heading += Math.max(-cap, Math.min(cap, turn * tuning.anticipation));
  }
  const height = lerp(
    tuning.heightAtRest,
    tuning.heightAtSpeed,
    ramp(target.speed, 0, tuning.speedForFullHeight),
  );
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  const p = target.position;
  return {
    heading,
    eye: { x: p.x - fx * tuning.distance, y: p.y + height, z: p.z - fz * tuning.distance },
    aim: { x: p.x + fx * tuning.lookAhead, y: p.y, z: p.z + fz * tuning.lookAhead },
  };
}
