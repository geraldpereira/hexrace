import { type Vec2 } from '@hexrace/commons';

import { type ExitFace } from '@tile/entity/face';
import { type Heading } from '@tile/entity/grid';
import { type TransitionSpan } from '@tile/entity/path';
import { type Profile } from '@tile/entity/profile';

/**
 * Everything the geometry of one tile needs, resolved: where it sits, which way it points, its
 * two profiles, the transition span, and the slopes at its faces that the track deduced from the
 * neighbours (zero for a tile alone). Distances in units.
 */
export interface TileSweep {
  readonly center: Vec2;
  readonly heading: Heading;
  readonly exit: ExitFace;
  readonly entry: Profile;
  readonly exitProfile: Profile;
  readonly transition?: TransitionSpan;
  readonly entrySlope?: number;
  readonly exitSlope?: number;
}

/** The edges of the zones at one `s`: the road centre, its travel and right, then left to right. */
export interface Boundaries {
  readonly center: Vec2;
  readonly travel: Vec2;
  readonly right: Vec2;
  readonly blockLeft: Vec2;
  readonly roadLeft: Vec2;
  readonly roadRight: Vec2;
  readonly blockRight: Vec2;
}
