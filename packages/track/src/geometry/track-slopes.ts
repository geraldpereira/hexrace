import { Injectable, inject } from '@angular/core';
import { type Tile, Slopes, TilePaths } from '@hexrace/tile';

import { type Track } from '@track/entity/track';
import { TrackProfiles } from '@track/geometry/track-profiles';

/**
 * The slope of the road at each face of a laid track, in height units per unit of axis length. It
 * is not written in the data: the two tiles touching a face deduce the same one by Steffen's
 * method, so a steady climb is a straight ramp, a flat tile stays flat, and no face has an edge.
 */
@Injectable({ providedIn: 'root' })
export class TrackSlopes {
  private readonly profiles = inject(TrackProfiles);
  private readonly paths = inject(TilePaths);
  private readonly slopes = inject(Slopes);

  /** Mean slope of a tile: its height difference over the length of its axis. */
  secant(track: Track, index: number): number {
    const tile = track.tiles[index];
    if (!tile) return 0;
    const climb = tile.profile.height - this.profiles.entryProfile(track, index).height;
    return climb / this.paths.length(tile.exit);
  }

  /** One slope per face: face `i` is the entry of tile `i`; in a loop faces 0 and n are the same. */
  faceSlopes(track: Track): number[] {
    const n = track.tiles.length;
    const secants = track.tiles.map((_tile: Tile, i: number) => this.secant(track, i));
    const lengths = track.tiles.map((tile: Tile) => this.paths.length(tile.exit));
    const slopes = new Array<number>(n + 1).fill(0);
    for (let face = 1; face < n; face++) {
      slopes[face] = this.at(secants, lengths, face - 1, face);
    }
    if (this.profiles.isClosed(track) && n > 0) {
      const wrap = this.at(secants, lengths, n - 1, 0);
      slopes[0] = wrap;
      slopes[n] = wrap;
    }
    return slopes;
  }

  private at(secants: number[], lengths: number[], before: number, after: number): number {
    return this.slopes.steffen(
      secants[before]!,
      secants[after]!,
      lengths[before]!,
      lengths[after]!,
    );
  }
}
