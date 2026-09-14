/** A cell of the grid in whole axial coordinates, flat side forward. */
export interface Cell {
  readonly q: number;
  readonly r: number;
}

/** The rank, clockwise from north, of the direction a tile's face 12 points to. */
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

/** A cell and a heading: where a tile sits and which way it points. */
export interface Pose {
  readonly cell: Cell;
  readonly heading: Heading;
}
