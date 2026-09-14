import { type TransitionSpan } from '@tile/entity/path';

export type EnvironmentId = 'north' | 'europe' | 'africa';

export const ENVIRONMENT_IDS: readonly EnvironmentId[] = ['north', 'europe', 'africa'];

/**
 * An environment (functional spec 2.2): a track's theme. It fixes the palette of eight surface
 * types, named by rank and ordered by decreasing grip (road 1 the grippiest, road 3 the
 * slipperiest, landscape 2 the one that may block), their look, and the transition span inside a
 * tile. Grip values will come from the car; here the look is a colour.
 */
export interface Environment {
  readonly id: EnvironmentId;
  readonly name: string;
  /** One colour per rank: road 1 to 3, shoulder 1 to 3, landscape 1 to 2. */
  readonly colors: {
    readonly road: readonly [string, string, string];
    readonly shoulder: readonly [string, string, string];
    readonly landscape: readonly [string, string];
  };
  /** The fraction of the axis over which width, position and types change (functional spec 2.2). */
  readonly transition: TransitionSpan;
}

const FULL: TransitionSpan = { start: 0, end: 1 };

/** The three environments of the functional spec 2.2, by id. */
export const ENVIRONMENTS: Readonly<Record<EnvironmentId, Environment>> = {
  europe: {
    id: 'europe',
    name: 'Europe',
    colors: {
      road: ['#3f3f46', '#57534e', '#78716c'],
      shoulder: ['#a8a29e', '#84cc16', '#d6d3d1'],
      landscape: ['#4d7c0f', '#365314'],
    },
    transition: FULL,
  },
  north: {
    id: 'north',
    name: 'North',
    colors: {
      road: ['#94a3b8', '#cbd5e1', '#bae6fd'],
      shoulder: ['#e2e8f0', '#f1f5f9', '#7dd3fc'],
      landscape: ['#f8fafc', '#1e3a5f'],
    },
    transition: FULL,
  },
  africa: {
    id: 'africa',
    name: 'Africa',
    colors: {
      road: ['#a16207', '#ca8a04', '#eab308'],
      shoulder: ['#d6d3d1', '#fde68a', '#fed7aa'],
      landscape: ['#b45309', '#78350f'],
    },
    transition: FULL,
  },
};
