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

  it('gives the thresholds of the spec, 41, 28 and 12 steps, and half for the generator', () => {
    expect(slopes.maxHeightSteps(12)).toBe(41);
    expect(slopes.maxHeightSteps(2)).toBe(28);
    expect(slopes.maxHeightSteps(4)).toBe(12);
    expect(slopes.maxHeightSteps(12, GENERATOR_SLOPE_FACTOR)).toBe(31);
    expect(slopes.maxHeightSteps(2, GENERATOR_SLOPE_FACTOR)).toBe(21);
    expect(slopes.maxHeightSteps(4, GENERATOR_SLOPE_FACTOR)).toBe(9);
    expect(slopes.slopeOf(12, 41)).toBeLessThanOrEqual(MAX_SLOPE.straight);
    expect(slopes.slopeOf(12, 42)).toBeGreaterThan(MAX_SLOPE.straight);
    expect(slopes.slopeOf(8, 10)).toBeLessThanOrEqual(MAX_SLOPE.sharp);
  });
});
