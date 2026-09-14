import { TestBed } from '@angular/core/testing';
import { Vec2 } from '@hexrace/commons';

import { type Heading } from '@tile/entity/grid';
import { APOTHEM, PITCH, SIDE } from '@tile/entity/layout';
import { Grid } from '@tile/geometry/grid';
import { Layout } from '@tile/geometry/layout';

const HEADINGS: readonly Heading[] = [0, 1, 2, 3, 4, 5];

describe('Layout', () => {
  let layout: Layout;
  let grid: Grid;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    layout = TestBed.inject(Layout);
    grid = TestBed.inject(Grid);
  });

  it('puts neighbours one pitch apart, in the announced direction', () => {
    for (const heading of HEADINGS) {
      const there = layout.cellToWorld(grid.neighbor({ q: 0, r: 0 }, heading));
      expect(there.equals(layout.direction(heading).scale(PITCH))).toBe(true);
    }
    expect(APOTHEM).toBeCloseTo((SIDE * Math.sqrt(3)) / 2, 12);
  });

  it('has corners one side from the centre, clockwise from the north-east', () => {
    const corners = layout.corners(new Vec2(1, 1));
    expect(corners).toHaveLength(6);
    for (const c of corners) expect(c.distanceTo(new Vec2(1, 1))).toBeCloseTo(SIDE, 9);
    expect(corners[0]!.equals(new Vec2(1 + SIDE / 2, 1 + APOTHEM))).toBe(true);
    expect(corners[1]!.equals(new Vec2(1 + SIDE, 1))).toBe(true);
  });

  it('puts the entry face of a northward tile at the bottom, the driver’s left to the west', () => {
    const frame = layout.entryFrame(Vec2.ZERO, 0);
    expect(layout.facePoint(frame, 0).equals(new Vec2(-SIDE / 2, -APOTHEM))).toBe(true);
    expect(layout.facePoint(frame, SIDE).equals(new Vec2(SIDE / 2, -APOTHEM))).toBe(true);
    expect(layout.facePoint(frame, 1, 2).equals(new Vec2(-SIDE / 2 + 1, -APOTHEM + 2))).toBe(true);
  });

  it('makes the exit face of a tile coincide with the entry face of the next one', () => {
    for (const heading of HEADINGS) {
      const there = layout.cellToWorld(grid.neighbor({ q: 0, r: 0 }, heading));
      const out = layout.exitFrame(Vec2.ZERO, heading);
      const inn = layout.entryFrame(there, heading);
      for (const u of [0, 2.5, SIDE]) {
        expect(layout.facePoint(out, u).equals(layout.facePoint(inn, u))).toBe(true);
      }
    }
  });
});
