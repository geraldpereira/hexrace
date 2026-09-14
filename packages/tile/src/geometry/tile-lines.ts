import { Injectable, inject } from '@angular/core';

import { type CheckerSquare } from '@tile/entity/line';
import { type SPoint } from '@tile/entity/slice';
import { type Boundaries, type TileSweep } from '@tile/entity/sweep';
import { TilePaths } from '@tile/geometry/tile-paths';
import { TileSweeper } from '@tile/geometry/tile-sweeper';

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

  private readonly paths = inject(TilePaths);
  private readonly sweeper = inject(TileSweeper);

  squares(sweep: TileSweep, at: number): CheckerSquare[] {
    const span = this.length / this.paths.length(sweep.exit);
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
    const columns = Math.max(2, Math.round(b0.roadLeft.distanceTo(b0.roadRight) * 2));
    const squares: CheckerSquare[] = [];
    for (let column = 0; column < columns; column++) {
      const u0 = column / columns;
      const u1 = (column + 1) / columns;
      const at = (b: Boundaries, u: number, s: number): SPoint => ({
        at: b.roadLeft.lerp(b.roadRight, u),
        s,
      });
      squares.push({
        points: [at(b0, u0, s0), at(b1, u0, s1), at(b1, u1, s1), at(b0, u1, s0)],
        dark: (row + column) % 2 === 0,
      });
    }
    return squares;
  }
}
