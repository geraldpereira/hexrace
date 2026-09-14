import { TestBed } from '@angular/core/testing';

import { Maths } from '@commons/math/maths';

describe('Maths', () => {
  let maths: Maths;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    maths = TestBed.inject(Maths);
  });

  it('interpolates and inverts', () => {
    expect(maths.lerp(10, 20, 0.25)).toBe(12.5);
    expect(maths.inverseLerp(10, 20, 12.5)).toBe(0.25);
    expect(maths.inverseLerp(10, 20, 5)).toBe(0);
    expect(maths.inverseLerp(10, 20, 25)).toBe(1);
    expect(maths.inverseLerp(3, 3, 3)).toBe(0);
  });

  it('ramps between a start and a full value', () => {
    expect(maths.ramp(0.5, 1, 3)).toBe(0);
    expect(maths.ramp(2, 1, 3)).toBe(0.5);
    expect(maths.ramp(9, 1, 3)).toBe(1);
  });

  it('draws a Hermite curve through both ends with the given tangents', () => {
    expect(maths.hermite(1, 0, 3, 0, 0)).toBe(1);
    expect(maths.hermite(1, 0, 3, 0, 1)).toBe(3);
    expect(maths.hermite(1, 0, 3, 0, 0.5)).toBe(2);
    expect(maths.hermite(0, 1, 1, 1, 0.5)).toBe(0.5);
  });

  it('converts angles and speeds both ways', () => {
    expect(maths.degToRad(180)).toBeCloseTo(Math.PI, 10);
    expect(maths.radToDeg(Math.PI / 2)).toBeCloseTo(90, 10);
    expect(maths.kmhToMps(36)).toBe(10);
    expect(maths.mpsToKmh(10)).toBe(36);
  });
});
