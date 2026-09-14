import { type Cell, type Heading, type Pose, type Profile, type Tile } from '@hexrace/tile';

/**
 * A tile of the track put on the grid: where it sits, which way it points, the profile it is
 * entered by, and the slopes at its two faces that the neighbours dictate (functional spec 2.3).
 */
export interface PlacedTile {
  readonly index: number;
  readonly tile: Tile;
  readonly cell: Cell;
  readonly heading: Heading;
  readonly entry: Profile;
  readonly entrySlope: number;
  readonly exitSlope: number;
}

/** A whole track laid on the grid, plus where one more tile would go. */
export interface Placement {
  readonly tiles: readonly PlacedTile[];
  /** Serves to check the closure of a loop and to extend the track. */
  readonly next: Pose;
}

/** A tile put on a cell another one already holds: the track crosses itself (spec 5.5). */
export interface Overlap {
  readonly tile: number;
  readonly previous: number;
  readonly cell: Cell;
}

/** Where the first tile goes: the centre cell, pointing north. */
export const ORIGIN: Pose = { cell: { q: 0, r: 0 }, heading: 0 };
