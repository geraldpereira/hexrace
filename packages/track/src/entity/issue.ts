import { type Placement } from '@track/entity/placement';

export type TrackIssueCode =
  | 'empty-id'
  | 'unknown-environment'
  | 'unknown-mode'
  | 'laps-outside-track'
  | 'no-tile'
  | 'profile'
  | 'obstacle'
  | 'overlap'
  | 'not-closed'
  | 'slope'
  | 'amplitude'
  | 'hairpin-line';

/**
 * What the model refuses about a track (functional spec 2.6 and 5.5): a code an editor can act
 * on, the tile it concerns or null for the header, and a message in words for a human.
 */
export interface TrackIssue {
  readonly code: TrackIssueCode;
  readonly tile: number | null;
  readonly message: string;
}

/** A validated track: where its tiles landed, everything refused, and the tiles to highlight. */
export interface TrackReview {
  readonly placement: Placement;
  readonly issues: readonly TrackIssue[];
  readonly faulty: ReadonlySet<number>;
}
