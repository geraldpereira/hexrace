import { Injectable, inject } from '@angular/core';

import { EXAMPLE_TRACK_FILES } from '@track/entity/examples/examples';
import { type Track } from '@track/entity/track';
import { TrackFiles } from '@track/format/track-files';

/**
 * The example tracks the module ships with, kept as track files and read on demand: what the lab
 * offers to load, and what the specs try the placement and the validation on. A file that does
 * not read is dropped rather than thrown, so one bad example never takes the others down.
 */
@Injectable({ providedIn: 'root' })
export class TrackExamples {
  /** The files to read; a test puts its own here. */
  files: readonly string[] = EXAMPLE_TRACK_FILES;

  private readonly reader = inject(TrackFiles);

  all(): Track[] {
    return this.files.flatMap((text: string) => {
      const read = this.reader.parse(text);
      return 'track' in read ? [read.track] : [];
    });
  }

  of(id: string): Track | null {
    return this.all().find((track: Track) => track.id === id) ?? null;
  }

  ids(): string[] {
    return this.all().map((track: Track) => track.id);
  }
}
