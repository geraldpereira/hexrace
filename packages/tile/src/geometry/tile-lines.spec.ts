import { TestBed } from '@angular/core/testing';
import { Polygons } from '@hexrace/commons';

import { type CheckerSquare, LINE_AT } from '@tile/entity/line';
import { NARROW_LEFT } from '@tile/entity/profile.mock';
import { type SPoint } from '@tile/entity/slice';
import { STRAIGHT_SWEEP, sweepOf } from '@tile/entity/sweep.mock';
import { TileLines } from '@tile/geometry/tile-lines';

describe('TileLines', () => {
  let lines: TileLines;
  let polygons: Polygons;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    lines = TestBed.inject(TileLines);
    polygons = TestBed.inject(Polygons);
  });

  const area = (points: readonly SPoint[]): number =>
    Math.abs(polygons.area(points.map((p: SPoint) => p.at)));

  it('draws a chequer over the road width, one unit long, two rows of half-unit squares', () => {
    const squares = lines.squares(STRAIGHT_SWEEP, LINE_AT);
    expect(squares).toHaveLength(12);
    expect(
      squares.reduce((sum: number, sq: CheckerSquare) => sum + area(sq.points), 0),
    ).toBeCloseTo(3, 6);
    expect(squares.filter((sq: CheckerSquare) => sq.dark)).toHaveLength(6);
    expect(squares[0]?.dark).not.toBe(squares[1]?.dark);
    expect(squares.every((sq: CheckerSquare) => sq.points.length === 4)).toBe(true);
    const ss = squares.flatMap((sq: CheckerSquare) => sq.points.map((p: SPoint) => p.s));
    expect(Math.min(...ss)).toBeCloseTo(LINE_AT - 0.5 / (2 * 6.928203230275509), 6);
  });

  it('takes its length and rows from the knobs, and at least two columns', () => {
    lines.length = 2;
    lines.rows = 3;
    const squares = lines.squares(STRAIGHT_SWEEP, 0.5);
    expect(squares).toHaveLength(18);
    expect(
      squares.reduce((sum: number, sq: CheckerSquare) => sum + area(sq.points), 0),
    ).toBeCloseTo(6, 6);
    lines.length = 1;
    lines.rows = 1;
    const few = lines.squares(sweepOf({ entry: NARROW_LEFT }), 0.5);
    expect(few).toHaveLength(2);
  });
});
