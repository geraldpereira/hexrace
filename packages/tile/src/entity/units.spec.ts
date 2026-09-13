import {
  HEIGHT_UNIT,
  MAX_AMPLITUDE_STEPS,
  SKIRT_DEPTH_METERS,
  UNIT_METERS,
  metersToUnits,
  stepsToUnits,
  unitsToMeters,
} from '@tile/entity/units';

describe('units', () => {
  it('counts a height step in car widths', () => {
    expect(HEIGHT_UNIT).toBeCloseTo(0.2 / 1.7, 12);
    expect(stepsToUnits(17)).toBeCloseTo(2, 12);
  });

  it('converts metres and units both ways', () => {
    expect(metersToUnits(UNIT_METERS)).toBe(1);
    expect(unitsToMeters(2)).toBeCloseTo(3.4, 12);
    expect(metersToUnits(unitsToMeters(3.25))).toBeCloseTo(3.25, 12);
  });

  it('bounds a track to 200 m of amplitude and drops the skirt 2 m', () => {
    expect(MAX_AMPLITUDE_STEPS * 0.2).toBe(200);
    expect(SKIRT_DEPTH_METERS).toBe(2);
  });
});
