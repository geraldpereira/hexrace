import { TestBed } from '@angular/core/testing';

import { type Obstacle } from '@tile/entity/obstacle';
import { type Profile } from '@tile/entity/profile';
import { TileSurfaces } from '@tile/entity/surface';
import { type TileSweep } from '@tile/entity/sweep';

const entry: Profile = {
  position: 2,
  roadWidth: 3,
  leftShoulder: 1,
  rightShoulder: 0,
  height: 5,
  road: 1,
  shoulder: 2,
  landscape: 1,
};
const exit: Profile = { ...entry, road: 3, shoulder: 3, landscape: 2 };
const sweep: TileSweep = { center: { x: 0, y: 0 }, heading: 0, exit: 12, entry, exitProfile: exit };
const patch: Obstacle = { kind: 'patch', from: 0.4, to: 0.6, offset: 1, width: 1, road: 2 };

describe('TileSurfaces', () => {
  let surfaces: TileSurfaces;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    surfaces = TestBed.inject(TileSurfaces);
  });

  it('reads the road, the left shoulder and the landscapes, with the entry types before the middle', () => {
    const road = surfaces.at(sweep, { x: -0.5, y: -2 });
    expect(road).toMatchObject({ zone: 'road', type: 1 });
    expect(road?.offset).toBeCloseTo(0, 9);
    expect(road?.s).toBeCloseTo(0.5 - 2 / (2 * 6.928203230275509), 6);
    expect(surfaces.at(sweep, { x: -2.5, y: -2 })).toMatchObject({ zone: 'shoulder', type: 2 });
    expect(surfaces.at(sweep, { x: -3.5, y: -2 })).toMatchObject({ zone: 'landscape', type: 1 });
    expect(surfaces.at(sweep, { x: 1.5, y: -2 })).toMatchObject({ zone: 'landscape', type: 1 });
  });

  it('reads the exit types past the middle, and a right shoulder when the profile has one', () => {
    expect(surfaces.at(sweep, { x: -0.5, y: 2 })).toMatchObject({ zone: 'road', type: 3 });
    expect(surfaces.at(sweep, { x: 1.5, y: 2 })).toMatchObject({ zone: 'landscape', type: 2 });
    const bothShoulders: TileSweep = {
      ...sweep,
      entry: { ...entry, rightShoulder: 1 },
      exitProfile: { ...exit, rightShoulder: 1 },
    };
    expect(surfaces.at(bothShoulders, { x: 1.5, y: 2 })).toMatchObject({
      zone: 'shoulder',
      type: 3,
    });
    expect(surfaces.at(bothShoulders, { x: 1.5, y: 2 })?.offset).toBeCloseTo(2, 9);
  });

  it('is null outside the hexagon', () => {
    expect(surfaces.at(sweep, { x: 0, y: 9 })).toBeNull();
    expect(surfaces.at(sweep, { x: -9, y: 0 })).toBeNull();
  });

  it('lets a patch replace the road type where it covers the point, and nowhere else', () => {
    expect(surfaces.at(sweep, { x: 0.5, y: 0 }, [patch])).toMatchObject({ zone: 'road', type: 2 });
    expect(surfaces.at(sweep, { x: -1.5, y: 0 }, [patch])).toMatchObject({ zone: 'road', type: 3 });
    expect(surfaces.at(sweep, { x: 0.5, y: -4 }, [patch])).toMatchObject({ zone: 'road', type: 1 });
    const hazard: Obstacle = { kind: 'hazard', size: 'small', at: 0.5, offset: 1 };
    expect(surfaces.at(sweep, { x: 0.5, y: 0 }, [hazard])).toMatchObject({ zone: 'road', type: 3 });
    expect(surfaces.at(sweep, { x: 0.5, y: 0 })).toMatchObject({ zone: 'road', type: 3 });
  });
});
