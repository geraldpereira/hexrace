import { Vec2 } from '@commons/math/vec2';

describe('Vec2', () => {
  const a = new Vec2(3, 4);
  const b = new Vec2(-1, 2);

  it('adds, subtracts, scales and measures', () => {
    expect(a.add(b)).toEqual(new Vec2(2, 6));
    expect(a.sub(b)).toEqual(new Vec2(4, 2));
    expect(a.scale(2)).toEqual(new Vec2(6, 8));
    expect(a.length()).toBe(5);
    expect(a.distanceTo(b)).toBeCloseTo(Math.hypot(4, 2));
    expect(a.dot(b)).toBe(5);
    expect(new Vec2(1, 0).cross(new Vec2(0, 1))).toBe(1);
  });

  it('normalises, keeps zero at zero, and turns right', () => {
    expect(a.normalized().equals(new Vec2(0.6, 0.8))).toBe(true);
    expect(Vec2.ZERO.normalized()).toBe(Vec2.ZERO);
    expect(new Vec2(0, 1).right()).toEqual(new Vec2(1, -0));
  });

  it('interpolates, rotates counter-clockwise and compares within an epsilon', () => {
    expect(a.lerp(b, 0.5)).toEqual(new Vec2(1, 3));
    const turned = new Vec2(1, 0).rotate(Math.PI / 2);
    expect(turned.equals(new Vec2(0, 1))).toBe(true);
    expect(turned.equals(new Vec2(0, 1.01))).toBe(false);
    expect(turned.equals(new Vec2(0, 1.01), 0.1)).toBe(true);
  });
});
