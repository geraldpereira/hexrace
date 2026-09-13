import { TestBed } from '@angular/core/testing';

import { APOTHEM, SIDE } from '@tile/entity/layout';
import {
  type Obstacle,
  BARRIER_BODY_WIDTH,
  HAZARD_FOOTPRINT,
  TileObstacles,
  describeObstacle,
} from '@tile/entity/obstacle';
import { type SPoint } from '@tile/entity/geometry';
import { type Profile } from '@tile/entity/profile';
import { type TileSweep } from '@tile/entity/sweep';

const close = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

const profile: Profile = {
  position: 2,
  roadWidth: 3,
  leftShoulder: 1,
  rightShoulder: 1,
  height: 5,
  road: 1,
  shoulder: 1,
  landscape: 1,
};
const straight: TileSweep = {
  center: { x: 0, y: 0 },
  heading: 0,
  exit: 12,
  entry: profile,
  exitProfile: profile,
};
const sharp: TileSweep = { ...straight, exit: 4 };

let obstacles: TileObstacles;

beforeEach(() => {
  TestBed.configureTestingModule({});
  obstacles = TestBed.inject(TileObstacles);
});

describe('footprint', () => {
  it('places a hazard at the road centre, along the road', () => {
    const { outline, body } = obstacles.footprint(straight, {
      kind: 'hazard',
      size: 'medium',
      at: 0.5,
      offset: 0,
    });
    const xs = outline.map((p: SPoint) => p.x);
    const ys = outline.map((p: SPoint) => p.y);
    expect(close(Math.min(...xs), -1) && close(Math.max(...xs), 0)).toBe(true);
    expect(close(Math.min(...ys), -1) && close(Math.max(...ys), 1)).toBe(true);
    expect(outline.every((p: SPoint) => p.s === 0.5)).toBe(true);
    expect(body).toBe(outline);
    expect(HAZARD_FOOTPRINT.large).toEqual({ length: 2, width: 2 });
  });

  it('follows the lateral offset, positive to the right of the driver', () => {
    const { outline } = obstacles.footprint(straight, {
      kind: 'hazard',
      size: 'small',
      at: 0.25,
      offset: 2,
    });
    const cx = outline.reduce((sum: number, p: SPoint) => sum + p.x, 0) / 4;
    const cy = outline.reduce((sum: number, p: SPoint) => sum + p.y, 0) / 4;
    expect(close(cx, -0.5 + 2)).toBe(true);
    expect(close(cy, -APOTHEM + 2 * APOTHEM * 0.25)).toBe(true);
  });

  it('runs a right barrier from the road edge one unit outwards, face to face, its body thinner', () => {
    const { outline, body } = obstacles.footprint(straight, {
      kind: 'barrier',
      side: 'right',
      from: 0,
      to: 1,
    });
    expect(outline.every((p: SPoint) => p.x >= 1 - 1e-9 && p.x <= 2 + 1e-9)).toBe(true);
    expect(close(Math.min(...outline.map((p: SPoint) => p.y)), -APOTHEM)).toBe(true);
    expect(close(Math.max(...outline.map((p: SPoint) => p.y)), APOTHEM)).toBe(true);
    expect(body.every((p: SPoint) => p.x >= 2 - BARRIER_BODY_WIDTH - 1e-9)).toBe(true);
  });

  it('mirrors a left barrier on the other side of the road', () => {
    const { outline, body } = obstacles.footprint(straight, {
      kind: 'barrier',
      side: 'left',
      from: 0.2,
      to: 0.8,
    });
    expect(outline.every((p: SPoint) => p.x >= -3 - 1e-9 && p.x <= -2 + 1e-9)).toBe(true);
    expect(body.every((p: SPoint) => p.x <= -3 + BARRIER_BODY_WIDTH + 1e-9)).toBe(true);
    expect(outline[0]?.s).toBe(0.2);
    expect(outline.at(-1)?.s).toBe(0.2);
  });

  it('hugs the curve of a sharp turn with a ramp, and a bump the same way', () => {
    const { outline } = obstacles.footprint(sharp, { kind: 'ramp', from: 0.3, to: 0.7 });
    const vertex = { x: SIDE / 2, y: -APOTHEM };
    expect(
      outline.every((p: SPoint) => dist(p, vertex) >= 3 - 1e-9 && dist(p, vertex) <= 6 + 1e-9),
    ).toBe(true);
    expect(outline.length).toBeGreaterThan(8);
    const bump = obstacles.footprint(sharp, { kind: 'bump', from: 0.3, to: 0.7 });
    expect(bump.outline).toEqual(outline);
    expect(bump.body).toBe(bump.outline);
  });

  it('cuts a patch of the given width around its offset', () => {
    const patch: Obstacle = { kind: 'patch', from: 0.4, to: 0.6, offset: 1, width: 1, road: 3 };
    const { outline, body } = obstacles.footprint(straight, patch);
    expect(outline.every((p: SPoint) => p.x >= 0 - 1e-9 && p.x <= 1 + 1e-9)).toBe(true);
    expect(body).toBe(outline);
  });
});

describe('errors', () => {
  it('refuses fractions outside the tile and empty spans', () => {
    expect(
      obstacles.errors(straight, { kind: 'hazard', size: 'small', at: 1.2, offset: 0 }),
    ).toEqual(['hazard small at 1.2: position 1.2 outside 0 to 1']);
    expect(obstacles.errors(straight, { kind: 'ramp', from: 0.6, to: 0.4 })).toEqual([
      'ramp: span 0.6 to 0.4 is empty',
    ]);
    expect(
      obstacles.errors(straight, { kind: 'barrier', side: 'left', from: -0.1, to: 0.5 }),
    ).toEqual(['left barrier: span -0.1 to 0.5 outside 0 to 1']);
  });

  it('refuses a hazard spilling out of the tile, accepts one that fits', () => {
    expect(
      obstacles.errors(straight, { kind: 'hazard', size: 'large', at: 0.02, offset: 3 }),
    ).toEqual(['hazard large at 0.02: spills out of the tile']);
    expect(
      obstacles.errors(straight, { kind: 'hazard', size: 'large', at: 0.5, offset: 3 }),
    ).toEqual([]);
    expect(obstacles.errors(sharp, { kind: 'barrier', side: 'left', from: 0, to: 1 })).toEqual([]);
  });
});

describe('describeObstacle', () => {
  it.each([
    [{ kind: 'hazard', size: 'medium', at: 0.5, offset: 0 }, 'hazard medium at 0.5'],
    [{ kind: 'barrier', side: 'right', from: 0, to: 1 }, 'right barrier'],
    [{ kind: 'bump', from: 0, to: 1 }, 'bump'],
    [{ kind: 'patch', from: 0, to: 1, offset: 0, width: 1, road: 2 }, 'patch'],
  ] as [Obstacle, string][])('names %o "%s"', (obstacle, name) => {
    expect(describeObstacle(obstacle)).toBe(name);
  });
});
