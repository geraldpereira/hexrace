import { type EnvironmentId } from '@hexrace/tile';

import { type EnvironmentSwells } from '@car/entity/surface-swells';

/** The swell of each rank beside the grain of `SURFACE_CATALOG`: flat road, heaving landscape. */
export const SWELL_CATALOG: Readonly<Record<EnvironmentId, EnvironmentSwells>> = {
  europe: {
    road: [
      { height: 0, length: 8 },
      { height: 0, length: 8 },
      { height: 0, length: 8 },
    ],
    shoulder: [
      { height: 0.015, length: 8 },
      { height: 0.02, length: 8 },
      { height: 0.03, length: 7 },
    ],
    landscape: [
      { height: 0.1, length: 7 },
      { height: 0.13, length: 6 },
    ],
  },
  north: {
    road: [
      { height: 0, length: 9 },
      { height: 0, length: 9 },
      { height: 0, length: 9 },
    ],
    shoulder: [
      { height: 0.02, length: 9 },
      { height: 0.025, length: 9 },
      { height: 0.02, length: 9 },
    ],
    landscape: [
      { height: 0.11, length: 8 },
      { height: 0.14, length: 6 },
    ],
  },
  africa: {
    road: [
      { height: 0, length: 7 },
      { height: 0, length: 7 },
      { height: 0, length: 7 },
    ],
    shoulder: [
      { height: 0.02, length: 8 },
      { height: 0.03, length: 7 },
      { height: 0.035, length: 7 },
    ],
    landscape: [
      { height: 0.1, length: 7 },
      { height: 0.14, length: 6 },
    ],
  },
};
