import { TestBed } from '@angular/core/testing';
import { Vec2 } from '@hexrace/commons';

import { EXIT_FACES } from '@tile/entity/face';
import { type Heading } from '@tile/entity/grid';
import { APOTHEM } from '@tile/entity/layout';
import { type Profile } from '@tile/entity/profile';
import { type TileSweep } from '@tile/entity/sweep';
import { HEIGHT_UNIT } from '@tile/entity/units';
import { Grid } from '@tile/geometry/grid';
import { Layout } from '@tile/geometry/layout';
import { TilePaths } from '@tile/geometry/tile-paths';
import { TileSweeper } from '@tile/geometry/tile-sweeper';

const narrowLeft: Profile = {
  position: 2,
  roadWidth: 1,
  leftShoulder: 1,
  rightShoulder: 1,
  height: 3,
  road: 1,
  shoulder: 1,
  landscape: 1,
};
const narrowRight: Profile = { ...narrowLeft, position: 5 };
const wide: Profile = { ...narrowLeft, position: 1, roadWidth: 5, rightShoulder: 0 };
const high: Profile = { ...narrowLeft, height: 7, position: 3, roadWidth: 2 };
const HEADINGS: Heading[] = [0, 1, 2, 3, 4, 5];

describe('TileSweeper', () => {
  let sweeper: TileSweeper;
  let layout: Layout;
  let grid: Grid;
  let paths: TilePaths;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    sweeper = TestBed.inject(TileSweeper);
    layout = TestBed.inject(Layout);
    grid = TestBed.inject(Grid);
    paths = TestBed.inject(TilePaths);
  });

  it('keeps the road and block widths constant while the road shifts, in every turn', () => {
    for (const exit of EXIT_FACES) {
      const sweep: TileSweep = {
        center: Vec2.ZERO,
        heading: 0,
        exit,
        entry: narrowLeft,
        exitProfile: narrowRight,
      };
      for (let i = 0; i <= 40; i++) {
        const b = sweeper.boundariesAt(sweep, i / 40);
        expect(b.roadLeft.distanceTo(b.roadRight)).toBeCloseTo(1, 6);
        expect(b.blockLeft.distanceTo(b.blockRight)).toBeCloseTo(3, 6);
        expect(b.travel.length()).toBeCloseTo(1, 9);
        expect(b.right.dot(b.travel)).toBeCloseTo(0, 9);
      }
    }
  });

  it('lands exactly on the face profiles at both ends, whatever the heading', () => {
    for (const heading of HEADINGS) {
      const center = layout.cellToWorld({ q: -1, r: 2 });
      for (const exit of EXIT_FACES) {
        const sweep: TileSweep = { center, heading, exit, entry: wide, exitProfile: narrowRight };
        const inn = layout.entryFrame(center, heading);
        const out = layout.exitFrame(center, grid.exitHeading(heading, exit));
        const start = sweeper.boundariesAt(sweep, 0);
        const end = sweeper.boundariesAt(sweep, 1);
        expect(start.blockLeft.distanceTo(layout.facePoint(inn, 0))).toBeLessThan(1e-6);
        expect(start.roadLeft.distanceTo(layout.facePoint(inn, 1))).toBeLessThan(1e-6);
        expect(start.roadRight.distanceTo(layout.facePoint(inn, 6))).toBeLessThan(1e-6);
        expect(start.blockRight.distanceTo(layout.facePoint(inn, 6))).toBeLessThan(1e-6);
        expect(end.blockLeft.distanceTo(layout.facePoint(out, 4))).toBeLessThan(1e-6);
        expect(end.roadRight.distanceTo(layout.facePoint(out, 6))).toBeLessThan(1e-6);
        expect(end.blockRight.distanceTo(layout.facePoint(out, 7))).toBeLessThan(1e-6);
      }
    }
  });

  it('puts the road centre on the axis shifted by the profile, with a custom transition span', () => {
    const sweep: TileSweep = {
      center: Vec2.ZERO,
      heading: 0,
      exit: 12,
      entry: narrowLeft,
      exitProfile: narrowRight,
      transition: { start: 0, end: 1 },
    };
    expect(sweeper.roadCenter(sweep, 0).equals(new Vec2(2.5 - 4, -APOTHEM))).toBe(true);
    expect(sweeper.roadCenter(sweep, 1).equals(new Vec2(5.5 - 4, APOTHEM))).toBe(true);
    expect(sweeper.roadCenter(sweep, 0.5).x).toBeCloseTo(0, 9);
    const { transition: _spanned, ...defaulted } = sweep;
    expect(_spanned).toBeDefined();
    expect(sweeper.roadCenter(defaulted, 0.2).x).toBeCloseTo(-1.5, 9);
    expect(sweeper.roadCenter(defaulted, 0.8).x).toBeCloseTo(1.5, 9);
  });

  it('takes the entry types before the middle and the exit types after', () => {
    const sweep: TileSweep = {
      center: Vec2.ZERO,
      heading: 0,
      exit: 2,
      entry: narrowLeft,
      exitProfile: high,
    };
    expect(sweeper.profileAt(sweep, 0.49)).toBe(narrowLeft);
    expect(sweeper.profileAt(sweep, 0.5)).toBe(high);
  });

  it('gives the profile height over the whole face, for every heading and exit', () => {
    for (const heading of HEADINGS) {
      const center = layout.cellToWorld({ q: 3, r: -1 });
      for (const exit of EXIT_FACES) {
        const sweep: TileSweep = { center, heading, exit, entry: narrowLeft, exitProfile: high };
        const inn = layout.entryFrame(center, heading);
        const out = layout.exitFrame(center, grid.exitHeading(heading, exit));
        for (const u of [0.01, 2, 5.5, 7.99]) {
          expect(sweeper.heightAt(sweep, layout.facePoint(inn, u))).toBeCloseTo(3 * HEIGHT_UNIT, 9);
          expect(sweeper.heightAt(sweep, layout.facePoint(out, u))).toBeCloseTo(7 * HEIGHT_UNIT, 9);
        }
      }
    }
  });

  it('climbs without a step, flat at both ends when the slopes are zero', () => {
    const sweep: TileSweep = {
      center: Vec2.ZERO,
      heading: 0,
      exit: 12,
      entry: narrowLeft,
      exitProfile: high,
      transition: { start: 0, end: 1 },
    };
    let previous = -Infinity;
    for (let i = 0; i <= 40; i++) {
      const y = -APOTHEM + (2 * APOTHEM * i) / 40;
      const height = sweeper.heightAt(sweep, new Vec2(1, y));
      expect(height).toBeGreaterThanOrEqual(previous);
      previous = height;
    }
    const step = 0.05;
    const slopeStart = sweeper.heightAt(sweep, new Vec2(0, -APOTHEM + step)) - 3 * HEIGHT_UNIT;
    const slopeMiddle =
      sweeper.heightAt(sweep, new Vec2(0, step / 2)) -
      sweeper.heightAt(sweep, new Vec2(0, -step / 2));
    expect(slopeStart).toBeLessThan(slopeMiddle / 20);
    expect(sweeper.heightOfS(sweep, -1)).toBe(3 * HEIGHT_UNIT);
    expect(sweeper.heightOfS(sweep, 2)).toBe(7 * HEIGHT_UNIT);
  });

  it('follows the slopes the neighbours dictate: a steady climb is a straight ramp', () => {
    const length = paths.length(12);
    const slope = 1 / length;
    const sweep: TileSweep = {
      center: Vec2.ZERO,
      heading: 0,
      exit: 12,
      entry: { ...narrowLeft, height: 4 },
      exitProfile: { ...narrowLeft, height: 5 },
      entrySlope: slope,
      exitSlope: slope,
    };
    for (let i = 0; i <= 10; i++) {
      const s = i / 10;
      expect(sweeper.heightOfS(sweep, s)).toBeCloseTo((4 + s) * HEIGHT_UNIT, 9);
    }
  });
});
