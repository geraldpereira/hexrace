import { Injectable, inject } from '@angular/core';
import { TileSweeper } from '@hexrace/tile';
import { clamp } from 'lodash-es';

import { type Cursor, type PlayerPose, TILES_AHEAD, TILES_BEHIND } from '@track/entity/cursor';
import { type Placement } from '@track/entity/placement';
import { type Track } from '@track/entity/track';
import { TrackProfiles } from '@track/geometry/track-profiles';
import { TrackSweeps } from '@track/geometry/track-sweeps';

/**
 * The tile window (functional spec 9.2): only `ahead` tiles in front of the player and `behind`
 * behind exist in the scene. A loop's window runs past the start, an open track's stops at the
 * ends. The player is a continuous position: whole part the tile, fraction the progress on it.
 */
@Injectable({ providedIn: 'root' })
export class TrackWindow {
  /** How many tiles live in front of the player, and behind. */
  ahead = TILES_AHEAD;
  behind = TILES_BEHIND;

  private readonly profiles = inject(TrackProfiles);
  private readonly sweeps = inject(TrackSweeps);
  private readonly sweeper = inject(TileSweeper);

  cursorAt(position: number, total: number, closed: boolean): Cursor {
    if (total === 0) return { tile: 0, s: 0 };
    const wrapped = closed ? this.wrap(position, total) : clamp(position, 0, total - 1e-9);
    const tile = Math.min(total - 1, Math.floor(wrapped));
    return { tile, s: wrapped - tile };
  }

  indices(
    total: number,
    current: number,
    closed: boolean,
    ahead = this.ahead,
    behind = this.behind,
  ): Set<number> {
    const indices = new Set<number>();
    for (let k = -behind; k <= ahead; k++) {
      const i = current + k;
      if (closed) indices.add(this.wrap(i, total));
      else if (i >= 0 && i < total) indices.add(i);
    }
    return indices;
  }

  /** Where the player stands at a position along the track, or null when there is no tile there. */
  playerPose(track: Track, placement: Placement, position: number): PlayerPose | null {
    const cursor = this.cursorAt(position, placement.tiles.length, this.profiles.isClosed(track));
    const placed = placement.tiles[cursor.tile];
    if (!placed) return null;
    const sweep = this.sweeps.of(track, placed);
    const boundaries = this.sweeper.boundariesAt(sweep, cursor.s);
    return {
      point: boundaries.center,
      travel: boundaries.travel,
      height: this.sweeper.heightOfS(sweep, cursor.s),
      cursor,
    };
  }

  private wrap(value: number, total: number): number {
    return ((value % total) + total) % total;
  }
}
