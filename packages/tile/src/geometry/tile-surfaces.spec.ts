import { TestBed } from '@angular/core/testing';
import { Vec2 } from '@hexrace/commons';

import { APOTHEM } from '@tile/entity/layout';
import { type Obstacle } from '@tile/entity/obstacle';
import { type Profile } from '@tile/entity/profile';
import { type TileSweep } from '@tile/entity/sweep';
import { TileSurfaces } from '@tile/geometry/tile-surfaces';

const profile: Profile = {
  position: 2,
  roadWidth: 3,
  leftShoulder: 1,
  rightShoulder: 1,
  height: 5,
  road: 1,
  shoulder: 2,
  landscape: 1,
};
const exitProfile: Profile = { ...profile, road: 3, shoulder: 3, landscape: 2 };
const straight: TileSweep = {
  center: new Vec2(0, 0),
  heading: 0,
  exit: 12,
  entry: profile,
  exitProfile,
  transition: { start: 0.4, end: 0.6 },
};
const patch: Obstacle = { kind: 'patch', from: 0.6, to: 0.9, offset: 1, width: 1, road: 2 };
const barrier: Obstacle = { kind: 'barrier', side: 'left', from: 0, to: 1 };

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
    expect(surfaces.at(straight, covered, [barrier, patch])).toMatchObject({
      zone: 'road',
      type: 2,
    });
    expect(surfaces.at(straight, new Vec2(-1.5, APOTHEM / 2), [patch])).toMatchObject({ type: 3 });
    expect(surfaces.at(straight, new Vec2(0.5, -APOTHEM / 2), [patch])).toMatchObject({ type: 1 });
    expect(surfaces.at(straight, covered, [barrier])).toMatchObject({ type: 3 });
  });
});
