import { TestBed } from '@angular/core/testing';
import { Vec2 } from '@hexrace/commons';

import { APOTHEM, SIDE } from '@tile/entity/layout';
import { HAZARD_FOOTPRINT } from '@tile/entity/obstacle';
import { type Profile } from '@tile/entity/profile';
import { type SPoint } from '@tile/entity/slice';
import { type TileSweep } from '@tile/entity/sweep';
import { TileObstacles } from '@tile/geometry/tile-obstacles';

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
  center: Vec2.ZERO,
  heading: 0,
  exit: 12,
  entry: profile,
  exitProfile: profile,
};
const sharp: TileSweep = { ...straight, exit: 4 };

const xs = (points: readonly SPoint[]): number[] => points.map((p: SPoint) => p.at.x);
const ys = (points: readonly SPoint[]): number[] => points.map((p: SPoint) => p.at.y);

describe('TileObstacles', () => {
  let obstacles: TileObstacles;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    obstacles = TestBed.inject(TileObstacles);
  });

  it('lays a hazard on the road centre, along the road, level at its own s', () => {
    const { outline, body } = obstacles.footprint(straight, {
      kind: 'hazard',
      size: 'medium',
      at: 0.5,
      offset: 0,
    });
    expect(Math.min(...xs(outline))).toBeCloseTo(-1, 9);
    expect(Math.max(...xs(outline))).toBeCloseTo(0, 9);
    expect(Math.min(...ys(outline))).toBeCloseTo(-1, 9);
    expect(Math.max(...ys(outline))).toBeCloseTo(1, 9);
    expect(outline.every((p: SPoint) => p.s === 0.5)).toBe(true);
    expect(body).toBe(outline);
    expect(HAZARD_FOOTPRINT.large).toEqual({ length: 2, width: 2 });
  });

  it('follows the lateral offset, positive to the driver’s right', () => {
    const { outline } = obstacles.footprint(straight, {
      kind: 'hazard',
      size: 'small',
      at: 0.25,
      offset: 2,
    });
    const cx = xs(outline).reduce((sum, x) => sum + x, 0) / 4;
    const cy = ys(outline).reduce((sum, y) => sum + y, 0) / 4;
    expect(cx).toBeCloseTo(-0.5 + 2, 9);
    expect(cy).toBeCloseTo(-APOTHEM + 2 * APOTHEM * 0.25, 9);
  });

  it('runs a barrier from the road edge one unit outwards, face to face, with a thinner body', () => {
    const { outline, body } = obstacles.footprint(straight, {
      kind: 'barrier',
      side: 'right',
      from: 0,
      to: 1,
    });
    expect(xs(outline).every((x) => x >= 1 - 1e-9 && x <= 2 + 1e-9)).toBe(true);
    expect(Math.min(...ys(outline))).toBeCloseTo(-APOTHEM, 9);
    expect(Math.max(...ys(outline))).toBeCloseTo(APOTHEM, 9);
    expect(xs(body).every((x) => x >= 1.7 - 1e-9)).toBe(true);
    const left = obstacles.footprint(straight, { kind: 'barrier', side: 'left', from: 0, to: 1 });
    expect(xs(left.outline).every((x) => x >= -3 - 1e-9 && x <= -2 + 1e-9)).toBe(true);
    expect(xs(left.body).every((x) => x <= -2.7 + 1e-9)).toBe(true);
  });

  it('hugs the curve of a sharp turn with a road band', () => {
    const { outline } = obstacles.footprint(sharp, { kind: 'ramp', from: 0.3, to: 0.7 });
    const vertex = new Vec2(SIDE / 2, -APOTHEM);
    expect(
      outline.every(
        (p: SPoint) => p.at.distanceTo(vertex) >= 3 - 1e-9 && p.at.distanceTo(vertex) <= 6 + 1e-9,
      ),
    ).toBe(true);
    expect(outline.length).toBe(2 * (obstacles.bandSamples + 1));
    expect(outline.map((p: SPoint) => p.s).slice(0, 2)).toEqual([
      0.3,
      0.3 + 0.4 / obstacles.bandSamples,
    ]);
    const bump = obstacles.footprint(straight, { kind: 'bump', from: 0.1, to: 0.2 });
    expect(bump.body).toBe(bump.outline);
  });

  it('centres a patch on its offset with its width', () => {
    const { outline, body } = obstacles.footprint(straight, {
      kind: 'patch',
      from: 0.4,
      to: 0.6,
      offset: 1,
      width: 1,
      road: 3,
    });
    expect(Math.min(...xs(outline))).toBeCloseTo(-0.5 + 0.5, 9);
    expect(Math.max(...xs(outline))).toBeCloseTo(-0.5 + 1.5, 9);
    expect(body).toBe(outline);
  });

  it('samples a band as often as asked', () => {
    obstacles.bandSamples = 3;
    const { outline } = obstacles.footprint(straight, { kind: 'ramp', from: 0, to: 1 });
    expect(outline).toHaveLength(8);
  });
});
