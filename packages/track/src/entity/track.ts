import { type EnvironmentId, type Tile } from '@hexrace/tile';

/** A loop (Track) or a point to point (Rally), functional spec 4.2 and 4.3. */
export type TrackMode = 'track' | 'rally';

export const TRACK_MODES: readonly TrackMode[] = ['track', 'rally'];

/**
 * A track (functional spec 5.4): a header and the ordered list of its tiles, without a single
 * position. The first tile carries the start; in Track mode it carries the finish too (spec 2.5).
 */
export interface Track {
  readonly id: string;
  readonly name: string;
  readonly environment: EnvironmentId;
  readonly mode: TrackMode;
  /** How many laps, Track mode only. */
  readonly laps?: number;
  readonly tiles: readonly Tile[];
}
