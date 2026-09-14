import { Injectable, inject } from '@angular/core';
import { Faces, LINE_AT } from '@hexrace/tile';

import { type LineMark, type MarkKind } from '@track/entity/mark';
import { type Track } from '@track/entity/track';
import { TrackProfiles } from '@track/geometry/track-profiles';

const NAMES: Readonly<Record<MarkKind, string>> = {
  start: 'start',
  finish: 'finish',
  both: 'start and finish',
};

/**
 * The special tiles (functional spec 2.5): the first tile carries the start; in Track mode it
 * carries the finish too, in Rally the last tile does. The line lies across the road at the
 * middle of the tile. Such a tile may turn and climb, but never in a hairpin.
 */
@Injectable({ providedIn: 'root' })
export class TrackMarks {
  private readonly faces = inject(Faces);
  private readonly profiles = inject(TrackProfiles);

  marks(track: Track): LineMark[] {
    const n = track.tiles.length;
    if (n === 0) return [];
    if (this.profiles.isClosed(track) || n === 1) return [{ tile: 0, kind: 'both', at: LINE_AT }];
    return [
      { tile: 0, kind: 'start', at: LINE_AT },
      { tile: n - 1, kind: 'finish', at: LINE_AT },
    ];
  }

  /** Where the chequered line sits on a tile's axis, or null when that tile carries none. */
  at(track: Track, index: number): number | null {
    return this.marks(track).find((mark: LineMark) => mark.tile === index)?.at ?? null;
  }

  /** What a start or finish tile does wrong, in words, or null. */
  issue(track: Track, mark: LineMark): string | null {
    const tile = track.tiles[mark.tile];
    if (!tile || this.faces.turnKind(tile.exit) !== 'sharp') return null;
    return `the ${NAMES[mark.kind]} tile cannot be a hairpin`;
  }
}
