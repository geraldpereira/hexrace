import { type Vec2 } from '@hexrace/commons';

/** Where the player is along the track: the tile index and the progress on its axis. */
export interface Cursor {
  readonly tile: number;
  readonly s: number;
}

/** The player on the track: the road centre under them, in the plane, and the ground height. */
export interface PlayerPose {
  readonly point: Vec2;
  /** Direction of travel, a unit vector. */
  readonly travel: Vec2;
  /** Ground height, in units of length. */
  readonly height: number;
  readonly cursor: Cursor;
}

/** How many tiles live around the player by default, ahead and behind (functional spec 9.2). */
export const TILES_AHEAD = 4;
export const TILES_BEHIND = 2;
