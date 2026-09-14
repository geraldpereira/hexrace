import { Vec2 } from '@hexrace/commons';

import { type ExitFace } from '@tile/entity/face';
import { type Heading } from '@tile/entity/grid';
import { type TransitionSpan } from '@tile/entity/path';
import { type Profile } from '@tile/entity/profile';
import { STANDARD_PROFILE } from '@tile/entity/profile.mock';
import { type TileSweep } from '@tile/entity/sweep';

export interface SweepOptions {
  readonly exit?: ExitFace;
  readonly entry?: Profile;
  readonly exitProfile?: Profile;
  readonly heading?: Heading;
  readonly center?: Vec2;
  readonly transition?: TransitionSpan;
  readonly entrySlope?: number;
  readonly exitSlope?: number;
}

export function sweepOf(options: SweepOptions = {}): TileSweep {
  const entry = options.entry ?? STANDARD_PROFILE;
  return {
    center: options.center ?? Vec2.ZERO,
    heading: options.heading ?? 0,
    exit: options.exit ?? 12,
    entry,
    exitProfile: options.exitProfile ?? entry,
    ...(options.transition ? { transition: options.transition } : {}),
    ...(options.entrySlope === undefined ? {} : { entrySlope: options.entrySlope }),
    ...(options.exitSlope === undefined ? {} : { exitSlope: options.exitSlope }),
  };
}

export const STRAIGHT_SWEEP: TileSweep = sweepOf();

export const SHARP_TURN_SWEEP: TileSweep = sweepOf({ exit: 4 });
