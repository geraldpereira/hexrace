import {
  GENERATOR_SLOPE_FACTOR,
  MAX_SLOPE,
  hermite,
  maxHeightSteps,
  slopeOf,
  steffen,
} from '@tile/entity/slope';

describe('slope at a face', () => {
  it('is the mean slope when two tiles climb alike, zero when the sense changes or one is flat', () => {
    expect(steffen(0.1, 0.1, 10, 10)).toBeCloseTo(0.1, 12);
    expect(steffen(0.1, -0.1, 10, 10)).toBe(0);
    expect(steffen(0.1, 0, 10, 10)).toBe(0);
    expect(steffen(-0.2, -0.2, 5, 5)).toBeCloseTo(-0.2, 12);
  });

  it('never exceeds twice the smaller mean slope', () => {
    expect(steffen(0.1, 0.3, 10, 10)).toBeLessThanOrEqual(0.2 + 1e-12);
    expect(steffen(0.3, 0.1, 20, 10)).toBeLessThanOrEqual(0.2 + 1e-12);
  });
});

describe('hermite', () => {
  it('passes through both heights with the given tangents', () => {
    expect(hermite(3, 0, 7, 0, 0)).toBe(3);
    expect(hermite(3, 0, 7, 0, 1)).toBe(7);
    expect(hermite(3, 0, 7, 0, 0.5)).toBe(5);
    expect(hermite(0, 1, 1, 1, 0.5)).toBeCloseTo(0.5, 12);
    const step = 1e-6;
    expect((hermite(0, 2, 1, 1, step) - hermite(0, 2, 1, 1, 0)) / step).toBeCloseTo(2, 4);
  });
});

describe('thresholds', () => {
  it('gives the spec’s maximum climbs: 23, 16 and 7 steps, half for the generator', () => {
    expect(maxHeightSteps(12)).toBe(23);
    expect(maxHeightSteps(2)).toBe(16);
    expect(maxHeightSteps(4)).toBe(7);
    expect(maxHeightSteps(12, GENERATOR_SLOPE_FACTOR)).toBe(11);
    expect(maxHeightSteps(2, GENERATOR_SLOPE_FACTOR)).toBe(8);
    expect(maxHeightSteps(4, GENERATOR_SLOPE_FACTOR)).toBe(3);
  });

  it('measures a tile’s slope against its exit’s threshold', () => {
    expect(slopeOf(12, 23)).toBeLessThanOrEqual(MAX_SLOPE.straight);
    expect(slopeOf(12, 24)).toBeGreaterThan(MAX_SLOPE.straight);
    expect(slopeOf(10, 16)).toBeLessThanOrEqual(MAX_SLOPE.wide);
    expect(slopeOf(8, 8)).toBeGreaterThan(MAX_SLOPE.sharp);
  });
});
