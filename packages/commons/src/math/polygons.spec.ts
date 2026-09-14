import { TestBed } from '@angular/core/testing';

import { Polygons } from '@commons/math/polygons';
import { Vec2 } from '@commons/math/vec2';

const square = [new Vec2(0, 0), new Vec2(0, 1), new Vec2(1, 1), new Vec2(1, 0)];

describe('Polygons', () => {
  let polygons: Polygons;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    polygons = TestBed.inject(Polygons);
  });

  it('measures a signed area, negative clockwise', () => {
    expect(polygons.area(square)).toBe(-1);
    expect(polygons.area([...square].reverse())).toBe(1);
    expect(polygons.area([])).toBe(0);
  });

  it('finds the centroid, zero for no point', () => {
    expect(polygons.centroid(square)).toEqual(new Vec2(0.5, 0.5));
    expect(polygons.centroid([])).toBe(Vec2.ZERO);
  });

  it('tells inside from outside a clockwise convex polygon, edges included', () => {
    expect(polygons.insideConvex(new Vec2(0.5, 0.5), square)).toBe(true);
    expect(polygons.insideConvex(new Vec2(1, 0.5), square)).toBe(true);
    expect(polygons.insideConvex(new Vec2(1.5, 0.5), square)).toBe(false);
    expect(polygons.insideConvex(new Vec2(1.0000001, 0.5), square, 1e-6)).toBe(true);
  });
});
