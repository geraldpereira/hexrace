import { TestBed } from '@angular/core/testing';

import { EXIT_FACES } from '@tile/entity/face';
import { type Heading, exitHeading } from '@tile/entity/grid';
import { APOTHEM, cellToWorld, entryFrame, exitFrame, facePoint } from '@tile/entity/layout';
import { pathLength } from '@tile/entity/path';
import { type Profile } from '@tile/entity/profile';
import { type TileSweep, TileSweeper } from '@tile/entity/sweep';
import { HEIGHT_UNIT } from '@tile/entity/units';

const close = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

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
const low: Profile = { ...narrowLeft, roadWidth: 3 };
const high: Profile = { ...low, height: 7, position: 3, roadWidth: 2, road: 3 };

let sweeper: TileSweeper;

beforeEach(() => {
  TestBed.configureTestingModule({});
  sweeper = TestBed.inject(TileSweeper);
});

describe('boundariesAt', () => {
  it('keeps the road and shoulder widths constant while the road shifts in a turn', () => {
    for (const exit of EXIT_FACES) {
      const sweep: TileSweep = {
        center: { x: 0, y: 0 },
        heading: 0,
        exit,
        entry: narrowLeft,
        exitProfile: narrowRight,
      };
      for (let i = 0; i <= 40; i++) {
        const b = sweeper.boundariesAt(sweep, i / 40);
        expect(close(dist(b.roadLeft, b.roadRight), 1)).toBe(true);
        expect(close(dist(b.blockLeft, b.blockRight), 3)).toBe(true);
      }
    }
  });

  it('lands exactly on the face profiles at both ends, whatever the heading', () => {
    for (let h = 0; h < 6; h++) {
      const heading = h as Heading;
      const center = cellToWorld({ q: -1, r: 2 });
      for (const exit of EXIT_FACES) {
        const sweep: TileSweep = { center, heading, exit, entry: wide, exitProfile: narrowRight };
        const inn = entryFrame(center, heading);
        const out = exitFrame(center, exitHeading(heading, exit));
        const start = sweeper.boundariesAt(sweep, 0);
        const end = sweeper.boundariesAt(sweep, 1);
        expect(dist(start.blockLeft, facePoint(inn, 0))).toBeLessThan(1e-6);
        expect(dist(start.roadLeft, facePoint(inn, 1))).toBeLessThan(1e-6);
        expect(dist(start.roadRight, facePoint(inn, 6))).toBeLessThan(1e-6);
        expect(dist(start.blockRight, facePoint(inn, 6))).toBeLessThan(1e-6);
        expect(dist(end.blockLeft, facePoint(out, 4))).toBeLessThan(1e-6);
        expect(dist(end.roadRight, facePoint(out, 6))).toBeLessThan(1e-6);
        expect(dist(end.blockRight, facePoint(out, 7))).toBeLessThan(1e-6);
      }
    }
  });

  it('puts the road centre on the axis shifted by the profile centre, with a unit travel', () => {
    const sweep: TileSweep = {
      center: { x: 0, y: 0 },
      heading: 0,
      exit: 12,
      entry: narrowLeft,
      exitProfile: narrowLeft,
    };
    const b = sweeper.boundariesAt(sweep, 0.5);
    expect(sweeper.roadCenter(sweep, 0.5)).toEqual(b.center);
    expect(close(b.center.x, -1.5)).toBe(true);
    expect(close(Math.hypot(b.travel.x, b.travel.y), 1)).toBe(true);
    expect(close(b.right.x, 1) && close(b.right.y, 0)).toBe(true);
  });
});

describe('profileAt', () => {
  it('reads the entry profile before the middle and the exit profile from it', () => {
    const sweep: TileSweep = {
      center: { x: 0, y: 0 },
      heading: 0,
      exit: 12,
      entry: low,
      exitProfile: high,
    };
    expect(sweeper.profileAt(sweep, 0.49)).toBe(low);
    expect(sweeper.profileAt(sweep, 0.5)).toBe(high);
  });
});

describe('heightOfS', () => {
  const sweep: TileSweep = {
    center: { x: 0, y: 0 },
    heading: 0,
    exit: 12,
    entry: low,
    exitProfile: high,
  };

  it('interpolates the two face heights with a smoothstep when no slope is given, clamped', () => {
    expect(sweeper.heightOfS(sweep, 0)).toBeCloseTo(3 * HEIGHT_UNIT, 9);
    expect(sweeper.heightOfS(sweep, 1)).toBeCloseTo(7 * HEIGHT_UNIT, 9);
    expect(sweeper.heightOfS(sweep, 0.5)).toBeCloseTo(5 * HEIGHT_UNIT, 9);
    expect(sweeper.heightOfS(sweep, -1)).toBeCloseTo(3 * HEIGHT_UNIT, 9);
    expect(sweeper.heightOfS(sweep, 2)).toBeCloseTo(7 * HEIGHT_UNIT, 9);
  });

  it('draws a straight ramp when both slopes equal the mean slope', () => {
    const length = pathLength(12);
    const slope = 4 / length;
    const ramp: TileSweep = { ...sweep, entrySlope: slope, exitSlope: slope };
    for (let i = 0; i <= 10; i++) {
      expect(sweeper.heightOfS(ramp, i / 10)).toBeCloseTo((3 + (4 * i) / 10) * HEIGHT_UNIT, 9);
    }
  });
});

describe('heightAt', () => {
  it('gives the profile height all along each face, for every heading and exit', () => {
    for (let h = 0; h < 6; h++) {
      const heading = h as Heading;
      const center = cellToWorld({ q: 3, r: -1 });
      for (const exit of EXIT_FACES) {
        const sweep: TileSweep = { center, heading, exit, entry: low, exitProfile: high };
        const inn = entryFrame(center, heading);
        const out = exitFrame(center, exitHeading(heading, exit));
        for (const u of [0.01, 2, 5.5, 7.99]) {
          expect(sweeper.heightAt(sweep, facePoint(inn, u))).toBeCloseTo(3 * HEIGHT_UNIT, 9);
          expect(sweeper.heightAt(sweep, facePoint(out, u))).toBeCloseTo(7 * HEIGHT_UNIT, 9);
        }
      }
    }
  });

  it('climbs without steps: increasing along the axis, flat at both ends', () => {
    const sweep: TileSweep = {
      center: { x: 0, y: 0 },
      heading: 0,
      exit: 12,
      entry: low,
      exitProfile: high,
      transition: { start: 0, end: 1 },
    };
    let previous = -Infinity;
    for (let i = 0; i <= 40; i++) {
      const y = -APOTHEM + (2 * APOTHEM * i) / 40;
      const height = sweeper.heightAt(sweep, { x: 1, y });
      expect(height).toBeGreaterThanOrEqual(previous);
      previous = height;
    }
    const step = 0.05;
    const slopeStart = sweeper.heightAt(sweep, { x: 0, y: -APOTHEM + step }) - 3 * HEIGHT_UNIT;
    const slopeMiddle =
      sweeper.heightAt(sweep, { x: 0, y: step / 2 }) -
      sweeper.heightAt(sweep, { x: 0, y: -step / 2 });
    expect(slopeStart).toBeLessThan(slopeMiddle / 20);
  });
});
