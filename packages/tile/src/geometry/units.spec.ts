import { TestBed } from '@angular/core/testing';
import { Vec2, Vec3 } from '@hexrace/commons';

import { HEIGHT_UNIT, UNIT_METERS } from '@tile/entity/units';
import { Units } from '@tile/geometry/units';

describe('Units', () => {
  let units: Units;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    units = TestBed.inject(Units);
  });

  it('converts metres, units and height steps both ways', () => {
    expect(units.metersToUnits(3.4)).toBeCloseTo(2, 12);
    expect(units.unitsToMeters(2)).toBeCloseTo(3.4, 12);
    expect(units.stepsToUnits(17)).toBeCloseTo(17 * HEIGHT_UNIT, 12);
    expect(HEIGHT_UNIT).toBeCloseTo(0.2 / 1.7, 12);
    expect(UNIT_METERS).toBe(1.7);
  });

  it('puts the plane in metres with north on -z and the height on y', () => {
    const world = units.toWorld(new Vec2(2, 3), 5);
    expect(world).toBeInstanceOf(Vec3);
    expect(world.equals(new Vec3(3.4, 8.5, -5.1))).toBe(true);
  });
});
