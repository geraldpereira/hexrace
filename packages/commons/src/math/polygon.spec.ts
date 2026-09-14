import { insideConvex, polygonArea } from '@commons/math/polygon';
import { Vec2 } from '@commons/math/vec2';

const square = [new Vec2(0, 0), new Vec2(0, 1), new Vec2(1, 1), new Vec2(1, 0)];

describe('polygons', () => {
  it('measures a signed area, negative clockwise', () => {
    expect(polygonArea(square)).toBe(-1);
    expect(polygonArea([...square].reverse())).toBe(1);
    expect(polygonArea([])).toBe(0);
  });

  it('tells inside from outside a clockwise convex polygon, edges included', () => {
    expect(insideConvex(new Vec2(0.5, 0.5), square)).toBe(true);
    expect(insideConvex(new Vec2(1, 0.5), square)).toBe(true);
    expect(insideConvex(new Vec2(1.5, 0.5), square)).toBe(false);
    expect(insideConvex(new Vec2(1.0000001, 0.5), square, 1e-6)).toBe(true);
  });
});
