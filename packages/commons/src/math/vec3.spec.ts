import { Vec3 } from '@commons/math/vec3';

describe('Vec3', () => {
  const a = new Vec3(1, 2, 3);
  const b = new Vec3(4, 5, 6);

  it('adds, subtracts, scales and measures', () => {
    expect(a.add(b)).toEqual(new Vec3(5, 7, 9));
    expect(b.sub(a)).toEqual(new Vec3(3, 3, 3));
    expect(a.scale(2)).toEqual(new Vec3(2, 4, 6));
    expect(a.dot(b)).toBe(32);
    expect(new Vec3(2, 0, 0).length()).toBe(2);
    expect(Vec3.ZERO.length()).toBe(0);
  });

  it('crosses with the right hand and compares within an epsilon', () => {
    expect(new Vec3(1, 0, 0).cross(new Vec3(0, 1, 0))).toEqual(new Vec3(0, 0, 1));
    expect(Vec3.UP.cross(new Vec3(0, 0, 1))).toEqual(new Vec3(1, 0, 0));
    expect(a.equals(new Vec3(1, 2, 3.0000000001))).toBe(true);
    expect(a.equals(b)).toBe(false);
  });
});
