import { type Track } from '@track/entity/track';

/** A problem read in a track file, with the line it sits on; line 0 is the file as a whole. */
export interface TrackFileError {
  readonly line: number;
  readonly message: string;
}

/** What reading a file gives: a track, or the problems, never both. */
export type TrackParse = { readonly track: Track } | { readonly errors: readonly TrackFileError[] };
