import { type Vec2 } from '@hexrace/commons';

import { SIDE } from '@tile/entity/layout';

/** A point of the axis with the direction of travel and the driver's right, both unit vectors. */
export interface PathSample {
  readonly point: Vec2;
  readonly travel: Vec2;
  readonly right: Vec2;
}

export const WIDE_TURN_RADIUS = SIDE * 1.5;
export const SHARP_TURN_RADIUS = SIDE / 2;

/**
 * Where the profile changes along the axis: constant before `start`, constant after `end`, in
 * transition between. Spreading it softens position shifts; the faces stay exact since the
 * transition is over at s = 1 (functional spec 2.2).
 */
export interface TransitionSpan {
  readonly start: number;
  readonly end: number;
}

export const DEFAULT_TRANSITION: TransitionSpan = { start: 0.3, end: 0.7 };
