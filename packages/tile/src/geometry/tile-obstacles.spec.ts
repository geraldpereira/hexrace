import { TestBed } from '@angular/core/testing';
import { Vec2 } from '@hexrace/commons';

import { APOTHEM, SIDE } from '@tile/entity/layout';
import { BARRIER_BODY_METERS } from '@tile/entity/obstacles/barrier';
import { UNIT_METERS } from '@tile/entity/units';
import {
  BUMP,
  LEFT_BARRIER,
  MEDIUM_HAZARD,
  PATCH,
  RAMP,
  RIGHT_BARRIER,
  SMALL_HAZARD_RIGHT,
} from '@tile/entity/obstacle.mock';
import { HAZARD_FOOTPRINT } from '@tile/entity/obstacles/hazard';
import { type SPoint } from '@tile/entity/slice';
import { SHARP_TURN_SWEEP, STRAIGHT_SWEEP } from '@tile/entity/sweep.mock';
import { TileObstacles } from '@tile/geometry/tile-obstacles';

const xs = (points: readonly SPoint[]): number[] => points.map((p: SPoint) => p.at.x);
const ys = (points: readonly SPoint[]): number[] => points.map((p: SPoint) => p.at.y);

describe('TileObstacles', () => {
  let obstacles: TileObstacles;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    obstacles = TestBed.inject(TileObstacles);
  });

  it('lays a hazard on the road centre, along the road, each corner at its own s', () => {
    const { outline, body } = obstacles.footprint(STRAIGHT_SWEEP, MEDIUM_HAZARD);
    expect(Math.min(...xs(outline))).toBeCloseTo(-1, 9);
    expect(Math.max(...xs(outline))).toBeCloseTo(0, 9);
    expect(Math.min(...ys(outline))).toBeCloseTo(-1, 9);
    expect(Math.max(...ys(outline))).toBeCloseTo(1, 9);
    const ss = outline.map((p: SPoint) => p.s).sort((a: number, b: number) => a - b);
    expect(ss[0]).toBeCloseTo(ss[1]!, 9);
    expect(ss[2]).toBeCloseTo(ss[3]!, 9);
    expect(ss[0]! + ss[3]!).toBeCloseTo(1, 9);
    expect(ss[3]! - ss[0]!).toBeGreaterThan(0.1);
    expect(body).toBe(outline);
    expect(HAZARD_FOOTPRINT.large).toEqual({ length: 2, width: 2 });
  });

  it('follows the lateral offset, positive to the driver’s right', () => {
    const { outline } = obstacles.footprint(STRAIGHT_SWEEP, SMALL_HAZARD_RIGHT);
    const cx = xs(outline).reduce((sum, x) => sum + x, 0) / 4;
    const cy = ys(outline).reduce((sum, y) => sum + y, 0) / 4;
    expect(cx).toBeCloseTo(-0.5 + 2, 9);
    expect(cy).toBeCloseTo(-APOTHEM + 2 * APOTHEM * 0.25, 9);
  });

  it('reserves a unit outwards for a barrier, face to face, and stands its body on the road edge', () => {
    const { outline, body } = obstacles.footprint(STRAIGHT_SWEEP, RIGHT_BARRIER);
    expect(xs(outline).every((x) => x >= 1 - 1e-9 && x <= 2 + 1e-9)).toBe(true);
    expect(Math.min(...ys(outline))).toBeCloseTo(-APOTHEM, 9);
    expect(Math.max(...ys(outline))).toBeCloseTo(APOTHEM, 9);
    const thickness = BARRIER_BODY_METERS / UNIT_METERS;
    expect(xs(body).every((x) => x >= 1 - 1e-9 && x <= 1 + thickness + 1e-9)).toBe(true);
    const left = obstacles.footprint(STRAIGHT_SWEEP, LEFT_BARRIER);
    expect(xs(left.outline).every((x) => x >= -3 - 1e-9 && x <= -2 + 1e-9)).toBe(true);
    expect(xs(left.body).every((x) => x <= -2 + 1e-9 && x >= -2 - thickness - 1e-9)).toBe(true);
  });

  it('hugs the curve of a sharp turn with a road band', () => {
    const { outline } = obstacles.footprint(SHARP_TURN_SWEEP, RAMP);
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
    const bump = obstacles.footprint(STRAIGHT_SWEEP, BUMP);
    expect(bump.body).toBe(bump.outline);
  });

  it('centres a patch on its offset with its width', () => {
    const { outline, body } = obstacles.footprint(STRAIGHT_SWEEP, PATCH);
    expect(Math.min(...xs(outline))).toBeCloseTo(-0.5 + PATCH.offset - PATCH.width / 2, 9);
    expect(Math.max(...xs(outline))).toBeCloseTo(-0.5 + PATCH.offset + PATCH.width / 2, 9);
    expect(body).toBe(outline);
  });

  it('samples a band as often as asked', () => {
    obstacles.bandSamples = 3;
    const { outline } = obstacles.footprint(STRAIGHT_SWEEP, { ...RAMP, from: 0, to: 1 });
    expect(outline).toHaveLength(8);
  });
});
