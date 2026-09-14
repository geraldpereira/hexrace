/** What a line marks: the start, the finish, or both on one tile (functional spec 2.5). */
export type MarkKind = 'start' | 'finish' | 'both';

/** A start or finish line, on a tile of the track, at a progress along its axis. */
export interface LineMark {
  readonly tile: number;
  readonly kind: MarkKind;
  readonly at: number;
}
