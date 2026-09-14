import {
  hermite,
  degToRad,
  inverseLerp,
  kmhToMps,
  lerp,
  mpsToKmh,
  radToDeg,
  ramp,
} from '@commons/math/math';

describe('math', () => {
  it('interpolates and inverts', () => {
    expect(lerp(10, 20, 0.25)).toBe(12.5);
    expect(inverseLerp(10, 20, 12.5)).toBe(0.25);
    expect(inverseLerp(10, 20, 5)).toBe(0);
    expect(inverseLerp(10, 20, 25)).toBe(1);
    expect(inverseLerp(3, 3, 3)).toBe(0);
  });

  it('ramps between a start and a full value', () => {
    expect(ramp(0.5, 1, 3)).toBe(0);
    expect(ramp(2, 1, 3)).toBe(0.5);
    expect(ramp(9, 1, 3)).toBe(1);
  });

  it('converts angles and speeds both ways', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI, 10);
    expect(radToDeg(Math.PI / 2)).toBeCloseTo(90, 10);
    expect(kmhToMps(36)).toBe(10);
    expect(mpsToKmh(10)).toBe(36);
  });
});

describe('hermite', () => {
  it('passes through both ends with the given tangents', () => {
    expect(hermite(1, 0, 3, 0, 0)).toBe(1);
    expect(hermite(1, 0, 3, 0, 1)).toBe(3);
    expect(hermite(1, 0, 3, 0, 0.5)).toBe(2);
    expect(hermite(0, 1, 1, 1, 0.5)).toBe(0.5);
  });
});
