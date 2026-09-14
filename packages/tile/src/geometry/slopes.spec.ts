import { TestBed } from '@angular/core/testing';

import { GENERATOR_SLOPE_FACTOR, MAX_SLOPE } from '@tile/entity/slope';
import { Slopes } from '@tile/geometry/slopes';

describe('Slopes', () => {
  let slopes: Slopes;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    slopes = TestBed.inject(Slopes);
  });

  it('takes the mean slope when both tiles climb alike, zero when the sense changes or one is flat', () => {
    expect(slopes.steffen(0.1, 0.1, 10, 10)).toBeCloseTo(0.1, 12);
    expect(slopes.steffen(0.1, -0.1, 10, 10)).toBe(0);
    expect(slopes.steffen(0.1, 0, 10, 10)).toBe(0);
    expect(slopes.steffen(-0.1, -0.3, 10, 10)).toBeCloseTo(-0.2, 12);
    expect(slopes.steffen(0.1, 0.3, 10, 10)).toBeLessThanOrEqual(0.2 + 1e-12);
  });

  it('gives the thresholds of the spec, 23, 16 and 7 steps, and half for the generator', () => {
    expect(slopes.maxHeightSteps(12)).toBe(23);
    expect(slopes.maxHeightSteps(2)).toBe(16);
    expect(slopes.maxHeightSteps(4)).toBe(7);
    expect(slopes.maxHeightSteps(12, GENERATOR_SLOPE_FACTOR)).toBe(11);
    expect(slopes.maxHeightSteps(2, GENERATOR_SLOPE_FACTOR)).toBe(8);
    expect(slopes.maxHeightSteps(4, GENERATOR_SLOPE_FACTOR)).toBe(3);
    expect(slopes.slopeOf(12, 23)).toBeLessThanOrEqual(MAX_SLOPE.straight);
    expect(slopes.slopeOf(12, 24)).toBeGreaterThan(MAX_SLOPE.straight);
    expect(slopes.slopeOf(8, 7)).toBeLessThanOrEqual(MAX_SLOPE.sharp);
  });
});
