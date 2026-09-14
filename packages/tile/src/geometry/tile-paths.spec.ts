import { TestBed } from '@angular/core/testing';
import { Vec2 } from '@hexrace/commons';

import { EXIT_FACES } from '@tile/entity/face';
import { type Heading } from '@tile/entity/grid';
import { APOTHEM, SIDE } from '@tile/entity/layout';
import { Grid } from '@tile/geometry/grid';
import { Layout } from '@tile/geometry/layout';
import { TilePaths } from '@tile/geometry/tile-paths';

const HEADINGS: readonly Heading[] = [0, 1, 2, 3, 4, 5];

describe('TilePaths', () => {
  let paths: TilePaths;
  let layout: Layout;
  let grid: Grid;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    paths = TestBed.inject(TilePaths);
    layout = TestBed.inject(Layout);
    grid = TestBed.inject(Grid);
  });

  it('starts from the middle of face 6 heading north, the right to the east', () => {
    for (const exit of EXIT_FACES) {
      const { point, travel, right } = paths.local(exit, 0);
      expect(point.equals(new Vec2(0, -APOTHEM))).toBe(true);
      expect(travel.equals(new Vec2(0, 1))).toBe(true);
      expect(right.equals(new Vec2(1, 0))).toBe(true);
    }
  });

  it('ends in the middle of the exit face, in its direction, whatever the heading', () => {
    for (const heading of HEADINGS) {
      const center = layout.cellToWorld({ q: 2, r: -1 });
      for (const exit of EXIT_FACES) {
        const out = layout.exitFrame(center, grid.exitHeading(heading, exit));
        const end = paths.world(center, heading, exit, 1);
        expect(end.point.equals(layout.facePoint(out, SIDE / 2))).toBe(true);
        expect(end.travel.equals(out.travel)).toBe(true);
        expect(paths.profilePoint(end, 0).equals(layout.facePoint(out, 0))).toBe(true);
        const inn = layout.entryFrame(center, heading);
        const begin = paths.world(center, heading, exit, 0);
        expect(paths.profilePoint(begin, SIDE).equals(layout.facePoint(inn, SIDE))).toBe(true);
      }
    }
  });

  it('keeps a constant speed along the axis', () => {
    for (const exit of EXIT_FACES) {
      const n = 50;
      let previous = paths.local(exit, 0).point;
      const step = paths.length(exit) / n;
      for (let i = 1; i <= n; i++) {
        const { point } = paths.local(exit, i / n);
        expect(Math.abs(point.distanceTo(previous) - step)).toBeLessThan(step * 0.01);
        previous = point;
      }
    }
  });

  it('measures the straight, the wide turn and the sharp turn', () => {
    expect(paths.length(12)).toBeCloseTo(2 * APOTHEM, 9);
    expect(paths.length(2)).toBeCloseTo((12 * Math.PI) / 3, 9);
    expect(paths.length(8)).toBeCloseTo((4 * 2 * Math.PI) / 3, 9);
  });

  it('shrinks the inner edge of a sharp turn to the shared corner', () => {
    const mid = paths.local(4, 0.5);
    expect(paths.profilePoint(mid, SIDE).equals(new Vec2(SIDE / 2, -APOTHEM))).toBe(true);
    const left = paths.local(8, 0.5);
    expect(paths.profilePoint(left, 0).equals(new Vec2(-SIDE / 2, -APOTHEM))).toBe(true);
  });

  it('rotates by whole headings and back', () => {
    const v = new Vec2(1, 2);
    expect(paths.rotate(v, 0).equals(v)).toBe(true);
    expect(paths.rotate(new Vec2(0, 1), 1).equals(layout.direction(1))).toBe(true);
    for (const heading of HEADINGS) {
      expect(paths.unrotate(paths.rotate(v, heading), heading).equals(v)).toBe(true);
    }
  });

  it('transitions in the middle only, over a span of any extent', () => {
    expect(paths.lerpSpan([1, 4], [3, 5], 0.2)).toEqual([1, 4]);
    expect(paths.lerpSpan([1, 4], [3, 5], 0.5)).toEqual([2, 4.5]);
    expect(paths.lerpSpan([1, 4], [3, 5], 0.9)).toEqual([3, 5]);
    for (const extent of [0.2, 0.4, 1]) {
      const span = paths.spanOfExtent(extent);
      expect(paths.transition(0, span)).toBe(0);
      expect(paths.transition(1, span)).toBe(1);
      expect(paths.transition(0.5, span)).toBeCloseTo(0.5, 9);
      expect(paths.lerpSpan([0, 0], [2, 2], 1, span)).toEqual([2, 2]);
    }
    expect(paths.spanOfExtent(1)).toEqual({ start: 0, end: 1 });
    expect(paths.spanOfExtent(3).end).toBe(1);
    expect(paths.spanOfExtent(0).start).toBeCloseTo(0.495, 9);
  });

  it('finds s again for every point of the swept profile, for every exit', () => {
    for (const exit of EXIT_FACES) {
      for (let i = 0; i <= 10; i++) {
        const s = i / 10;
        const sample = paths.local(exit, s);
        for (const u of [1, 4, 6.5]) {
          expect(paths.localAxisParameter(exit, paths.profilePoint(sample, u))).toBeCloseTo(s, 6);
        }
      }
    }
  });

  it('clamps beyond the faces, reads 0.5 at the apex of a sharp turn, and 0 just before a turn’s entry', () => {
    expect(paths.localAxisParameter(12, new Vec2(0, -APOTHEM - 3))).toBe(0);
    expect(paths.localAxisParameter(12, new Vec2(2, APOTHEM + 1))).toBe(1);
    expect(paths.localAxisParameter(2, new Vec2(0, -APOTHEM - 0.1))).toBe(0);
    expect(paths.localAxisParameter(10, new Vec2(0, -APOTHEM - 0.1))).toBe(0);
    expect(paths.localAxisParameter(4, new Vec2(SIDE / 2, -APOTHEM))).toBe(0.5);
    expect(paths.localAxisParameter(8, new Vec2(-SIDE / 2, -APOTHEM))).toBe(0.5);
  });

  it('reads the axis parameter of a world point through the tile’s frame', () => {
    const center = layout.cellToWorld({ q: 1, r: 1 });
    for (const heading of HEADINGS) {
      for (const exit of EXIT_FACES) {
        const point = paths.world(center, heading, exit, 0.3).point;
        expect(paths.axisParameter(center, heading, exit, point)).toBeCloseTo(0.3, 6);
      }
    }
  });
});
