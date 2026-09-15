import { Injectable, inject } from '@angular/core';
import {
  type Cell,
  type ExitFace,
  type Heading,
  type Pose,
  EXIT_FACES,
  Faces,
  Grid,
} from '@hexrace/tile';

import { ORIGIN } from '@track/entity/placement';

const HEADINGS: readonly Heading[] = [0, 1, 2, 3, 4, 5];

/** The cell the last tile of a loop stands on: the one the start tile is entered from. */
export const CLOSING_CELL: Cell = { q: 0, r: -1 };

/**
 * What a loop has to satisfy to come back on itself (functional spec 5.5). A track in Track mode
 * closes when one more tile after the last lands on the start, same cell and same heading; since
 * the start tile always heads north from the origin, the last tile stands on `CLOSING_CELL` and
 * leaves northwards. Everything else joins on its own: in a loop the start tile's entry profile
 * is the last tile's exit profile, so heights and widths need no matching, only the path does.
 */
@Injectable({ providedIn: 'root' })
export class LoopClosing {
  private readonly faces = inject(Faces);
  private readonly grid = inject(Grid);

  /** Whole steps between two cells on the grid, which is the fewest tiles that can join them. */
  distance(a: Cell, b: Cell): number {
    const q = a.q - b.q;
    const r = a.r - b.r;
    return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
  }

  /** How many tiles more than the shortest way home are left once a tile stands here. */
  slack(cell: Cell, remaining: number): number {
    return remaining - 2 - this.distance(cell, CLOSING_CELL);
  }

  /** Whether a tile standing here still leaves room to reach the closing cell in `remaining`. */
  reachable(cell: Cell, remaining: number): boolean {
    return this.slack(cell, remaining) >= 0;
  }

  /** Whether the closing cell is still reachable through cells nobody holds, not merely close. */
  canReach(cell: Cell, occupied: ReadonlySet<string>, remaining: number): boolean {
    const budget = remaining - 2;
    if (budget < 0) return false;
    let front = [cell];
    const seen = new Set<string>([this.grid.key(cell)]);
    for (let step = 0; step <= budget; step++) {
      if (front.some((one: Cell) => this.grid.sameCell(one, CLOSING_CELL))) return true;
      front = this.around(front, seen, occupied, budget - step);
    }
    return false;
  }

  private around(
    front: readonly Cell[],
    seen: Set<string>,
    occupied: ReadonlySet<string>,
    left: number,
  ): Cell[] {
    const next: Cell[] = [];
    for (const one of front) {
      for (const heading of HEADINGS) {
        const cell = this.grid.neighbor(one, heading);
        const key = this.grid.key(cell);
        if (seen.has(key) || occupied.has(key)) continue;
        if (this.distance(cell, CLOSING_CELL) > left) continue;
        seen.add(key);
        next.push(cell);
      }
    }
    return next;
  }

  /** The one exit that closes the loop from this pose, as a list, empty when none does. */
  closingExits(pose: Pose): ExitFace[] {
    if (!this.grid.sameCell(pose.cell, CLOSING_CELL)) return [];
    const face = this.faces.fromIndex(ORIGIN.heading - pose.heading);
    return EXIT_FACES.filter((one: ExitFace) => one === face);
  }
}
