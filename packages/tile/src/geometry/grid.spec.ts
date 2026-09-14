import { TestBed } from '@angular/core/testing';

import { type Cell, type Heading, HEADING_OFFSETS } from '@tile/entity/grid';
import { Grid } from '@tile/geometry/grid';

describe('Grid', () => {
  let grid: Grid;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    grid = TestBed.inject(Grid);
  });

  it('steps to the neighbour of each direction, and stays put on a heading it does not know', () => {
    expect(HEADING_OFFSETS).toHaveLength(6);
    HEADING_OFFSETS.forEach((offset: Cell, heading: number) => {
      expect(grid.neighbor({ q: 1, r: 2 }, heading as Heading)).toEqual({
        q: 1 + offset.q,
        r: 2 + offset.r,
      });
    });
    expect(grid.neighbor({ q: 1, r: 2 }, 7 as Heading)).toEqual({ q: 1, r: 2 });
  });

  it('compares and keys cells', () => {
    expect(grid.sameCell({ q: 1, r: 2 }, { q: 1, r: 2 })).toBe(true);
    expect(grid.sameCell({ q: 1, r: 2 }, { q: 2, r: 1 })).toBe(false);
    expect(grid.key({ q: -3, r: 4 })).toBe('-3,4');
  });

  it('turns headings modulo six and follows an exit face', () => {
    expect(grid.turn(5, 1)).toBe(0);
    expect(grid.turn(0, -1)).toBe(5);
    expect(grid.turn(2, 9)).toBe(5);
    expect(grid.exitHeading(0, 12)).toBe(0);
    expect(grid.exitHeading(0, 2)).toBe(1);
    expect(grid.exitHeading(4, 10)).toBe(3);
    expect(grid.exitHeading(5, 4)).toBe(1);
  });

  it('compares poses on cell and heading', () => {
    const pose = { cell: { q: 0, r: 0 }, heading: 3 as const };
    expect(grid.samePose(pose, { cell: { q: 0, r: 0 }, heading: 3 })).toBe(true);
    expect(grid.samePose(pose, { cell: { q: 0, r: 0 }, heading: 2 })).toBe(false);
    expect(grid.samePose(pose, { cell: { q: 1, r: 0 }, heading: 3 })).toBe(false);
  });
});
