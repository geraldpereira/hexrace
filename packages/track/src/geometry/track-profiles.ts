import { Injectable } from '@angular/core';
import { type Profile, type Tile, type TileProfiles } from '@hexrace/tile';

import { type Track } from '@track/entity/track';

/**
 * The track read as an ordered list of tiles (functional spec 2.6): whether it closes on itself,
 * the tile at an index, and the profile a tile is entered by, which is the previous tile's exit
 * profile. That is what makes the joining rule true by construction: nothing to check at a face.
 */
@Injectable({ providedIn: 'root' })
export class TrackProfiles {
  isClosed(track: Track): boolean {
    return track.mode === 'track';
  }

  tileAt(track: Track, index: number): Tile {
    const tile = track.tiles[index];
    if (!tile) throw new RangeError(`no tile ${index} in a track of ${track.tiles.length}`);
    return tile;
  }

  /** The previous tile's exit profile; the last one's in a loop, its own on an open track. */
  entryProfile(track: Track, index: number): Profile {
    const tile = this.tileAt(track, index);
    if (index > 0) return this.tileAt(track, index - 1).profile;
    if (this.isClosed(track)) return this.tileAt(track, track.tiles.length - 1).profile;
    return tile.profile;
  }

  profilesOf(track: Track, index: number): TileProfiles {
    return { entry: this.entryProfile(track, index), exit: this.tileAt(track, index).profile };
  }
}
