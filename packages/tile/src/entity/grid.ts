import { type ExitFace, faceIndex } from '@tile/entity/face';

/**
 * The grid the tiles sit on, in whole axial coordinates (q, r), flat side forward. A `Heading` is
 * the rank, clockwise from north, of the direction a tile's face 12 points to; the six absolute
 * directions are the six faces of a tile heading north. Nothing here is a position in the world:
 * `layout` turns cells into units.
 */
export interface Cell {
  readonly q: number;
  readonly r: number;
}

export type Heading = 0 | 1 | 2 | 3 | 4 | 5;

/** The neighbouring cell in each absolute direction, rank 0 north then clockwise. */
export const HEADING_OFFSETS: readonly Cell[] = [
  { q: 0, r: 1 },
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
];

export function neighbor(cell: Cell, heading: Heading): Cell {
  const offset = HEADING_OFFSETS[heading] ?? { q: 0, r: 0 };
  return { q: cell.q + offset.q, r: cell.r + offset.r };
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a.q === b.q && a.r === b.r;
}

export function cellKey(cell: Cell): string {
  return `${cell.q},${cell.r}`;
}

export function turnHeading(heading: Heading, turn: number): Heading {
  return ((((heading + turn) % 6) + 6) % 6) as Heading;
}

/** The absolute direction of the exit face of a tile heading `heading`; also the next tile's heading. */
export function exitHeading(heading: Heading, exit: ExitFace): Heading {
  return turnHeading(heading, faceIndex(exit));
}

/** A cell and a heading: where a tile sits and which way it points. */
export interface Pose {
  readonly cell: Cell;
  readonly heading: Heading;
}

export function samePose(a: Pose, b: Pose): boolean {
  return sameCell(a.cell, b.cell) && a.heading === b.heading;
}
