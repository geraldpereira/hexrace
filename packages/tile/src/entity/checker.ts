import { Injectable, inject } from '@angular/core';

import { type SPoint } from '@tile/entity/geometry';
import { type Vec2, add, distance, scale } from '@tile/entity/layout';
import { pathLength } from '@tile/entity/path';
import { type Boundaries, type TileSweep, TileSweeper } from '@tile/entity/sweep';

/** Where the start or finish line sits on its tile's axis (functional spec 2.5). */
export const LINE_AT = 0.5;

export interface CheckerSquare {
  readonly points: SPoint[];
  readonly dark: boolean;
}

/**
 * The chequered start or finish line across the road (functional spec 2.5): half-unit squares on
 * `rows` rows over `length` units along the road, following its curve, each point knowing its `s`
 * and so its height.
 */
@Injectable({ providedIn: 'root' })
export class TileLines {
  /** Length of the line along the road, in units, and its rows of squares. */
  length = 1;
  rows = 2;

  private readonly sweeper = inject(TileSweeper);

  squares(sweep: TileSweep, at: number): CheckerSquare[] {
    const span = this.length / pathLength(sweep.exit);
    const squares: CheckerSquare[] = [];
    for (let row = 0; row < this.rows; row++) {
      const s0 = at - span / 2 + (span * row) / this.rows;
      squares.push(...this.row(sweep, row, s0, s0 + span / this.rows));
    }
    return squares;
  }

  private row(sweep: TileSweep, row: number, s0: number, s1: number): CheckerSquare[] {
    const b0 = this.sweeper.boundariesAt(sweep, s0);
    const b1 = this.sweeper.boundariesAt(sweep, s1);
    const columns = Math.max(2, Math.round(distance(b0.roadLeft, b0.roadRight) * 2));
    const squares: CheckerSquare[] = [];
    for (let column = 0; column < columns; column++) {
      const u0 = column / columns;
      const u1 = (column + 1) / columns;
      squares.push({
        points: [across(b0, u0, s0), across(b1, u0, s1), across(b1, u1, s1), across(b0, u1, s0)],
        dark: (row + column) % 2 === 0,
      });
    }
    return squares;
  }
}

function across(b: Boundaries, u: number, s: number): SPoint {
  const width: Vec2 = { x: b.roadRight.x - b.roadLeft.x, y: b.roadRight.y - b.roadLeft.y };
  return { ...add(b.roadLeft, scale(width, u)), s };
}
