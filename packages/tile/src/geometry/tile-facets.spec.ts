import { TestBed } from '@angular/core/testing';
import { Vec2, Vec3 } from '@hexrace/commons';

import { type SPoint } from '@tile/entity/slice';
import { type Paint, type Triangle3 } from '@tile/entity/triangle';
import { UNIT_METERS } from '@tile/entity/units';
import { TileFacets } from '@tile/geometry/tile-facets';

const SKIRT: Paint = { kind: 'skirt' };

const at = (x: number, y: number): SPoint => ({ at: new Vec2(x, y), s: 0 });

const normal = (t: Triangle3): Vec3 => t.b.sub(t.a).cross(t.c.sub(t.a));

describe('TileFacets', () => {
  let facets: TileFacets;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    facets = TestBed.inject(TileFacets);
  });

  it('puts a slice point in the world in metres, north on -z', () => {
    expect(
      facets
        .point(at(2, 3), 4)
        .equals(new Vec3(2 * UNIT_METERS, 4 * UNIT_METERS, -3 * UNIT_METERS)),
    ).toBe(true);
  });

  it('fans a polygon and winds every triangle along the direction given', () => {
    const square = [new Vec3(0, 0, 0), new Vec3(1, 0, 0), new Vec3(1, 0, 1), new Vec3(0, 0, 1)];
    const up: Triangle3[] = [];
    facets.polygon(square, SKIRT, Vec3.UP, up);
    expect(up).toHaveLength(2);
    for (const t of up) expect(normal(t).y).toBeGreaterThan(0);
    const down: Triangle3[] = [];
    facets.polygon(square, SKIRT, new Vec3(0, -1, 0), down);
    for (const t of down) expect(normal(t).y).toBeLessThan(0);
  });

  it('emits nothing for an empty contour, a segment, or a triangle with no area', () => {
    const out: Triangle3[] = [];
    facets.polygon([], SKIRT, Vec3.UP, out);
    facets.polygon([new Vec3(0, 0, 0), new Vec3(1, 0, 0)], SKIRT, Vec3.UP, out);
    facets.polygon(
      [new Vec3(0, 0, 0), new Vec3(1, 0, 0), new Vec3(2, 0, 0), new Vec3(3, 0, 0)],
      SKIRT,
      Vec3.UP,
      out,
    );
    expect(out).toHaveLength(0);
  });

  it('drops a wall away from the inside point it is given', () => {
    const top: [Vec3, Vec3] = [new Vec3(1, 2, -1), new Vec3(1, 2, 1)];
    const base: [Vec3, Vec3] = [new Vec3(1, 0, -1), new Vec3(1, 0, 1)];
    const out: Triangle3[] = [];
    facets.wall(top, base, Vec3.ZERO, SKIRT, out);
    expect(out).toHaveLength(2);
    for (const t of out) expect(normal(t).x).toBeGreaterThan(0);
  });

  it('drops a repeated point but keeps one that only shares its s', () => {
    expect(facets.dedupe([at(0, 0), at(0, 0), at(1, 0)])).toHaveLength(2);
    expect(facets.dedupe([])).toHaveLength(0);
  });
});
