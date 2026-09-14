import { TestBed } from '@angular/core/testing';
import { Vec2 } from '@hexrace/commons';

import { APOTHEM } from '@tile/entity/layout';
import { LEFT_BARRIER, PATCH } from '@tile/entity/obstacle.mock';
import { type Patch } from '@tile/entity/obstacles/patch';
import { DARK_EXIT, PALE_SHOULDER } from '@tile/entity/profile.mock';
import { sweepOf } from '@tile/entity/sweep.mock';
import { TileSurfaces } from '@tile/geometry/tile-surfaces';

const straight = sweepOf({
  entry: PALE_SHOULDER,
  exitProfile: DARK_EXIT,
  transition: { start: 0.4, end: 0.6 },
});
const patch: Patch = { ...PATCH, from: 0.6, to: 0.9, offset: 1, road: 2 };

describe('TileSurfaces', () => {
  let surfaces: TileSurfaces;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    surfaces = TestBed.inject(TileSurfaces);
  });

  it('reads the road, then the shoulders, then the landscape across the profile', () => {
    const y = -APOTHEM / 2;
    expect(surfaces.at(straight, new Vec2(-0.5, y))).toEqual({
      zone: 'road',
      type: 1,
      s: 0.25,
      offset: 0,
    });
    expect(surfaces.at(straight, new Vec2(0.9, y))).toMatchObject({ zone: 'road', type: 1 });
    expect(surfaces.at(straight, new Vec2(-2.5, y))).toMatchObject({
      zone: 'shoulder',
      type: 2,
      offset: -2,
    });
    expect(surfaces.at(straight, new Vec2(1.5, y))).toMatchObject({
      zone: 'shoulder',
      type: 2,
      offset: 2,
    });
    expect(surfaces.at(straight, new Vec2(-3.5, y))).toMatchObject({ zone: 'landscape', type: 1 });
    expect(surfaces.at(straight, new Vec2(3.5, y))).toMatchObject({ zone: 'landscape', type: 1 });
  });

  it('switches to the exit types past the middle and returns null outside the hexagon', () => {
    const y = APOTHEM / 2;
    const far = surfaces.at(straight, new Vec2(-0.5, y));
    expect(far).toMatchObject({ zone: 'road', type: 3 });
    expect(far?.s).toBeCloseTo(0.75, 9);
    expect(surfaces.at(straight, new Vec2(-2.5, y))).toMatchObject({ zone: 'shoulder', type: 3 });
    expect(surfaces.at(straight, new Vec2(3.5, y))).toMatchObject({ zone: 'landscape', type: 2 });
    expect(surfaces.at(straight, new Vec2(0, APOTHEM + 1))).toBeNull();
    expect(surfaces.at(straight, new Vec2(9, 0))).toBeNull();
  });

  it('lets a patch replace the road type where it covers the point, and nowhere else', () => {
    const covered = new Vec2(0.5, APOTHEM / 2);
    expect(surfaces.at(straight, covered, [LEFT_BARRIER, patch])).toMatchObject({
      zone: 'road',
      type: 2,
    });
    expect(surfaces.at(straight, new Vec2(-1.5, APOTHEM / 2), [patch])).toMatchObject({ type: 3 });
    expect(surfaces.at(straight, new Vec2(0.5, -APOTHEM / 2), [patch])).toMatchObject({ type: 1 });
    expect(surfaces.at(straight, covered, [LEFT_BARRIER])).toMatchObject({ type: 3 });
  });
});
