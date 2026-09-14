export type TileIssueCode =
  | 'road-width'
  | 'block-width'
  | 'position-not-whole'
  | 'no-landscape-left'
  | 'no-landscape-right'
  | 'height-out-of-range'
  | 'obstacle-position'
  | 'obstacle-span'
  | 'obstacle-empty-span'
  | 'obstacle-spills';

/**
 * What the model refuses about a profile or an obstacle: a code the editor can act on, the subject
 * it concerns (`profile`, or an obstacle's description), and a message in words for a human.
 */
export interface TileIssue {
  readonly code: TileIssueCode;
  readonly subject: string;
  readonly message: string;
}
