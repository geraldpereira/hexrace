import { TestBed } from '@angular/core/testing';
import { type Heading, Grid } from '@hexrace/tile';

import { CLOSING_CELL, LoopClosing } from '@track/generation/loop-closing';

describe('LoopClosing', () => {
  let loops: LoopClosing;
  let grid: Grid;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    loops = TestBed.inject(LoopClosing);
    grid = TestBed.inject(Grid);
  });

  it('counts the whole steps between two cells', () => {
    expect(loops.distance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0);
    expect(loops.distance({ q: 0, r: 0 }, { q: 0, r: 1 })).toBe(1);
    expect(loops.distance({ q: 0, r: 0 }, { q: 1, r: -1 })).toBe(1);
    expect(loops.distance({ q: 0, r: 0 }, { q: 2, r: -1 })).toBe(2);
    expect(loops.distance({ q: -3, r: 1 }, { q: 1, r: 1 })).toBe(4);
  });

  it('leaves slack only for the tiles beyond the shortest way home', () => {
    expect(loops.slack(CLOSING_CELL, 2)).toBe(0);
    expect(loops.slack(CLOSING_CELL, 5)).toBe(3);
    expect(loops.reachable(CLOSING_CELL, 2)).toBe(true);
    expect(loops.reachable({ q: 0, r: 3 }, 2)).toBe(false);
  });

  it('walks the free cells to the closing cell, and gives up when walled in', () => {
    const far = { q: 0, r: 4 };
    expect(loops.canReach(far, new Set(), 20)).toBe(true);
    expect(loops.canReach(far, new Set(), 5)).toBe(false);
    expect(loops.canReach(CLOSING_CELL, new Set(), 1)).toBe(false);
    const walls = new Set(
      ([0, 1, 2, 3, 4, 5] as Heading[]).map((h: Heading) => grid.key(grid.neighbor(far, h))),
    );
    expect(loops.canReach(far, walls, 20)).toBe(false);
  });

  it('names the exit that lands on the start, and refuses the one that would enter by face 6', () => {
    expect(loops.closingExits({ cell: CLOSING_CELL, heading: 0 })).toEqual([12]);
    expect(loops.closingExits({ cell: CLOSING_CELL, heading: 1 })).toEqual([10]);
    expect(loops.closingExits({ cell: CLOSING_CELL, heading: 2 })).toEqual([8]);
    expect(loops.closingExits({ cell: CLOSING_CELL, heading: 4 })).toEqual([4]);
    expect(loops.closingExits({ cell: CLOSING_CELL, heading: 5 })).toEqual([2]);
    expect(loops.closingExits({ cell: CLOSING_CELL, heading: 3 })).toEqual([]);
    expect(loops.closingExits({ cell: { q: 0, r: 0 }, heading: 0 })).toEqual([]);
  });
});
