import { Injectable, inject } from '@angular/core';
import { type Cell, type Pose, type Tile, Grid } from '@hexrace/tile';

import { type Overlap, type PlacedTile, type Placement, ORIGIN } from '@track/entity/placement';
import { type Track } from '@track/entity/track';
import { TrackProfiles } from '@track/geometry/track-profiles';
import { TrackSlopes } from '@track/geometry/track-slopes';

/**
 * A track laid on the grid (technical spec 3.2): an ordered list of tiles becomes cells and
 * headings, no position ever written in the data. Each tile's exit face points where the next one
 * sits and how it is turned; from there come the closure of a loop and the overlaps of spec 5.5.
 */
@Injectable({ providedIn: 'root' })
export class TrackPlacement {
  private readonly grid = inject(Grid);
  private readonly profiles = inject(TrackProfiles);
  private readonly slopes = inject(TrackSlopes);

  /** Lays the tiles one after another from `start`, the first one pointing north. */
  place(track: Track, start: Pose = ORIGIN): Placement {
    const slopes = this.slopes.faceSlopes(track);
    const tiles: PlacedTile[] = [];
    let pose = start;
    track.tiles.forEach((tile: Tile, index: number) => {
      tiles.push({
        index,
        tile,
        cell: pose.cell,
        heading: pose.heading,
        entry: this.profiles.entryProfile(track, index),
        entrySlope: slopes[index]!,
        exitSlope: slopes[index + 1]!,
      });
      const heading = this.grid.exitHeading(pose.heading, tile.exit);
      pose = { cell: this.grid.neighbor(pose.cell, heading), heading };
    });
    return { tiles, next: pose };
  }

  /** In a loop, one more tile must land on the first one, same cell and same heading (spec 5.5). */
  closureIssue(track: Track, placement: Placement): string | null {
    if (!this.profiles.isClosed(track)) return null;
    const first = placement.tiles[0];
    if (!first) return 'no tile';
    if (this.grid.samePose(placement.next, first)) return null;
    return (
      `the loop does not close: after the last tile we reach ${this.say(placement.next.cell)} ` +
      `heading ${placement.next.heading}, the start is at ${this.say(first.cell)} ` +
      `heading ${first.heading}`
    );
  }

  overlaps(placement: Placement): Overlap[] {
    const seen = new Map<string, number>();
    const found: Overlap[] = [];
    for (const placed of placement.tiles) {
      const key = this.grid.key(placed.cell);
      const previous = seen.get(key);
      if (previous === undefined) seen.set(key, placed.index);
      else found.push({ tile: placed.index, previous, cell: placed.cell });
    }
    return found;
  }

  firstOverlap(placement: Placement): number | null {
    return this.overlaps(placement)[0]?.tile ?? null;
  }

  /** What can still be built of a track that crosses itself: up to the first faulty tile. */
  validPrefix(placement: Placement): Placement {
    const index = this.firstOverlap(placement);
    if (index === null) return placement;
    const faulty = placement.tiles[index]!;
    return {
      tiles: placement.tiles.slice(0, index),
      next: { cell: faulty.cell, heading: faulty.heading },
    };
  }

  private say(cell: Cell): string {
    return `(${cell.q}, ${cell.r})`;
  }
}
