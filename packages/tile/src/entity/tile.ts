import { type ExitFace } from '@tile/entity/face';
import { type Obstacle } from '@tile/entity/obstacles/obstacle';
import { type Profile } from '@tile/entity/profile';

/**
 * A tile as a track file writes it (functional spec 5.4): its exit face and its exit profile. The
 * entry profile is not stored, it is the previous tile's exit profile, which makes the joining
 * rule 2.6 true by construction.
 */
export interface Tile {
  readonly exit: ExitFace;
  /** On the exit face; whatever differs from the entry changes inside the tile. */
  readonly profile: Profile;
  /** Placed relative to the road (functional spec 2.4). */
  readonly obstacles?: readonly Obstacle[];
}

/** A tile with both profiles resolved: what the geometry needs. */
export interface TileProfiles {
  readonly entry: Profile;
  readonly exit: Profile;
}
