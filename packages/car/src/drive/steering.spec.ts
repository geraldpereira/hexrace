import { TestBed } from '@angular/core/testing';

import { Steering } from '@car/drive/steering';
import { carSpec } from '@car/entity/car.mock';

describe('Steering', () => {
  let steering: Steering;

  beforeEach(() => {
    steering = TestBed.inject(Steering);
  });

  it('shapes an axis without moving its ends, and softens the centre', () => {
    expect(steering.shape(1, 0.6)).toBeCloseTo(1);
    expect(steering.shape(-1, 0.6)).toBeCloseTo(-1);
    expect(steering.shape(0, 0.6)).toBe(0);
    expect(steering.shape(0.5, 0.6)).toBeLessThan(0.5);
    expect(steering.shape(0.5, 0)).toBe(0.5);
  });

  it('runs the lock down from rest to the value at speed, then holds it', () => {
    const spec = carSpec().steering;
    expect(steering.maxAngleDeg(spec, 0)).toBe(32);
    expect(steering.maxAngleDeg(spec, 50)).toBe(22);
    expect(steering.maxAngleDeg(spec, 100)).toBe(12);
    expect(steering.maxAngleDeg(spec, 220)).toBe(12);
  });

  it('keeps the full lock when the car has no degressive steering', () => {
    const spec = carSpec().steering;
    spec.degressive = false;
    expect(steering.maxAngleDeg(spec, 120)).toBe(32);
    spec.degressive = true;
    spec.fullEffectKmh = 0;
    expect(steering.maxAngleDeg(spec, 120)).toBe(32);
  });
});
