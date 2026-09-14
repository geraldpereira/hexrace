import { TestBed } from '@angular/core/testing';
import { Vec2, polygonArea } from '@hexrace/commons';

import { LINE_AT } from '@tile/entity/line';
import { type Profile } from '@tile/entity/profile';
import { type SPoint } from '@tile/entity/slice';
import { type TileSweep } from '@tile/entity/sweep';
import { TileLines } from '@tile/geometry/tile-lines';

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
const sweep: TileSweep = {
  center: Vec2.ZERO,
  heading: 0,
  exit: 12,
  entry: profile,
  exitProfile: profile,
};

const area = (points: readonly SPoint[]): number =>
  Math.abs(polygonArea(points.map((p: SPoint) => p.at)));

describe('TileLines', () => {
  let lines: TileLines;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    lines = TestBed.inject(TileLines);
  });

  it('draws a chequer over the road width, one unit long, two rows of half-unit squares', () => {
    const squares = lines.squares(sweep, LINE_AT);
    expect(squares).toHaveLength(12);
    expect(squares.reduce((sum, sq) => sum + area(sq.points), 0)).toBeCloseTo(3, 6);
    expect(squares.filter((sq) => sq.dark)).toHaveLength(6);
    expect(squares[0]?.dark).not.toBe(squares[1]?.dark);
    expect(squares.every((sq) => sq.points.length === 4)).toBe(true);
    const ss = squares.flatMap((sq) => sq.points.map((p: SPoint) => p.s));
    expect(Math.min(...ss)).toBeCloseTo(LINE_AT - 0.5 / (2 * 6.928203230275509), 6);
  });

  it('takes its length and rows from the knobs, and at least two columns', () => {
    lines.length = 2;
    lines.rows = 3;
    const squares = lines.squares(sweep, 0.5);
    expect(squares).toHaveLength(18);
    expect(squares.reduce((sum, sq) => sum + area(sq.points), 0)).toBeCloseTo(6, 6);
    const narrow: Profile = { ...profile, roadWidth: 1 };
    lines.length = 1;
    lines.rows = 1;
    const few = lines.squares({ ...sweep, entry: narrow, exitProfile: narrow }, 0.5);
    expect(few).toHaveLength(2);
  });
});
