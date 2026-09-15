import { type TransitionSpan } from '@tile/entity/path';

export type EnvironmentId = 'north' | 'europe' | 'africa';

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
  /** How many road ranks may pave a whole face; the ranks above only ever come as a patch. */
  readonly faceRoads: 2 | 3;
  /** The fraction of the axis over which width, position and types change (functional spec 2.2). */
  readonly transition: TransitionSpan;
}
