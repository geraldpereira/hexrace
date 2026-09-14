import { Injectable, inject } from '@angular/core';

import { type ExitFace } from '@tile/entity/face';
import { type Cell, type Heading, type Pose, HEADING_OFFSETS } from '@tile/entity/grid';
import { Faces } from '@tile/geometry/faces';

/**
 * Moves on the grid of cells (technical spec 3.2): the neighbour in an absolute direction, a
 * heading turned by whole 60° steps, and the direction a tile's exit face points to, which is
 * also the next tile's heading. Nothing here is a position in the world: `Layout` does that.
 */
@Injectable({ providedIn: 'root' })
export class Grid {
  private readonly faces = inject(Faces);

  neighbor(cell: Cell, heading: Heading): Cell {
    const offset = HEADING_OFFSETS[heading] ?? { q: 0, r: 0 };
    return { q: cell.q + offset.q, r: cell.r + offset.r };
  }

  sameCell(a: Cell, b: Cell): boolean {
    return a.q === b.q && a.r === b.r;
  }

  key(cell: Cell): string {
    return `${cell.q},${cell.r}`;
  }

  turn(heading: Heading, steps: number): Heading {
    return ((((heading + steps) % 6) + 6) % 6) as Heading;
  }

  /** The absolute direction of the exit face of a tile heading `heading`. */
  exitHeading(heading: Heading, exit: ExitFace): Heading {
    return this.turn(heading, this.faces.index(exit));
  }

  samePose(a: Pose, b: Pose): boolean {
    return this.sameCell(a.cell, b.cell) && a.heading === b.heading;
  }
}
