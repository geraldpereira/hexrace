import { TestBed } from '@angular/core/testing';

import { type CheckerSquare, LINE_AT, TileLines } from '@tile/entity/checker';
import { type SPoint, polygonArea } from '@tile/entity/geometry';
import { type Profile } from '@tile/entity/profile';
import { type TileSweep } from '@tile/entity/sweep';

const profile: Profile = {
  position: 2,
  roadWidth: 3,
  leftShoulder: 1,
  rightShoulder: 1,
  height: 40,
  road: 1,
  shoulder: 1,
  landscape: 1,
};

let lines: TileLines;

beforeEach(() => {
  TestBed.configureTestingModule({});
  lines = TestBed.inject(TileLines);
});

describe('squares', () => {
  it('draws a chequerboard over the road width, one unit long', () => {
    const sweep: TileSweep = {
      center: { x: 0, y: 0 },
      heading: 0,
      exit: 12,
      entry: profile,
      exitProfile: profile,
    };
    const squares: CheckerSquare[] = lines.squares(sweep, LINE_AT);
    expect(squares).toHaveLength(6 * lines.rows);
    const area = squares.reduce(
      (sum: number, sq: CheckerSquare) => sum + Math.abs(polygonArea(sq.points)),
      0,
    );
    expect(area).toBeCloseTo(3 * lines.length, 6);
    expect(squares.filter((sq: CheckerSquare) => sq.dark)).toHaveLength(6);
    expect(squares[0]?.dark).not.toBe(squares[1]?.dark);
    for (const square of squares) {
      expect([...new Set(square.points.map((p: SPoint) => p.s))]).toHaveLength(2);
    }
  });

  it('never draws fewer than two columns on the narrowest road', () => {
    const narrow: Profile = { ...profile, roadWidth: 1 };
    const sweep: TileSweep = {
      center: { x: 0, y: 0 },
      heading: 0,
      exit: 2,
      entry: narrow,
      exitProfile: narrow,
    };
    expect(lines.squares(sweep, 0.5)).toHaveLength(2 * lines.rows);
  });

  it('follows the length and rows knobs', () => {
    const sweep: TileSweep = {
      center: { x: 0, y: 0 },
      heading: 0,
      exit: 12,
      entry: profile,
      exitProfile: profile,
    };
    lines.length = 2;
    lines.rows = 3;
    const squares: CheckerSquare[] = lines.squares(sweep, LINE_AT);
    expect(squares).toHaveLength(6 * 3);
    const area = squares.reduce(
      (sum: number, sq: CheckerSquare) => sum + Math.abs(polygonArea(sq.points)),
      0,
    );
    expect(area).toBeCloseTo(3 * 2, 6);
  });
});
