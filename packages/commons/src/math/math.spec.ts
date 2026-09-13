import {
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
