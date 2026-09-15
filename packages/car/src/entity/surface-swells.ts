import { type Swell } from '@hexrace/tile';

/** The swells of one zone, at least one, in the order of the ranks. */
export type SwellRanks = readonly [Swell, ...Swell[]];

/** The long swell of each of the eight ranks of an environment, in the order of the palette. */
export interface EnvironmentSwells {
  readonly road: readonly [Swell, Swell, Swell];
  readonly shoulder: readonly [Swell, Swell, Swell];
  readonly landscape: readonly [Swell, Swell];
}
