import { TestBed } from '@angular/core/testing';
import { Vec3 } from '@hexrace/commons';

import { MEDIUM_HAZARD, PATCH, RAMP, RIGHT_BARRIER } from '@tile/entity/obstacle.mock';
import { type Obstacle } from '@tile/entity/obstacles/obstacle';
import { TEN_STEPS_HIGH } from '@tile/entity/profile.mock';
import { sweepOf } from '@tile/entity/sweep.mock';
import { type Triangle3 } from '@tile/entity/triangle';
import { UNIT_METERS } from '@tile/entity/units';
import { TileTriangles } from '@tile/geometry/tile-triangles';

const sweep = sweepOf({ exit: 2, entry: TEN_STEPS_HIGH });
const obstacles: Obstacle[] = [
  { ...MEDIUM_HAZARD, at: 0.75, offset: -0.6 },
  RIGHT_BARRIER,
  { ...RAMP, from: 0.3, to: 0.45 },
  { ...PATCH, from: 0.5, to: 0.65, offset: 0.4 },
];

const normal = (t: Triangle3): Vec3 => t.b.sub(t.a).cross(t.c.sub(t.a));
const centre = (t: Triangle3): Vec3 =>
  t.a
    .add(t.b)
    .add(t.c)
    .scale(1 / 3);

describe('TileTriangles', () => {
  let triangles: TileTriangles;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    triangles = TestBed.inject(TileTriangles);
  });

  it('builds zone quads, a skirt down to the base, and nothing else for a bare tile', () => {
    const list = triangles.build({ sweep, skirtBase: -2 });
    const kinds = new Set(list.map((t: Triangle3) => t.paint.kind));
    expect(kinds).toEqual(new Set(['zone', 'skirt']));
    const skirt = list.filter((t: Triangle3) => t.paint.kind === 'skirt');
    expect(Math.min(...skirt.flatMap((t: Triangle3) => [t.a.y, t.b.y, t.c.y]))).toBeCloseTo(
      -2 * UNIT_METERS,
      9,
    );
    const zones = list.filter((t: Triangle3) => t.paint.kind === 'zone');
    for (const t of zones) expect(t.a.y).toBeCloseTo(10 * 0.2, 9);
    for (const t of zones) expect(normal(t).y).toBeGreaterThan(0);
    expect(list.every((t: Triangle3) => Number.isFinite(t.a.x + t.b.z + t.c.y))).toBe(true);
  });

  it('winds skirt walls outwards and lays the plane in metres with z pointing south', () => {
    const list = triangles.build({ sweep, skirtBase: -2 });
    for (const t of list.filter((tri: Triangle3) => tri.paint.kind === 'skirt')) {
      const c = centre(t);
      expect(normal(t).dot(new Vec3(c.x, 0, c.z))).toBeGreaterThan(0);
    }
    const xs = list.flatMap((t: Triangle3) => [t.a.x, t.b.x, t.c.x]);
    const zs = list.flatMap((t: Triangle3) => [t.a.z, t.b.z, t.c.z]);
    expect(Math.max(...xs)).toBeCloseTo(8 * UNIT_METERS, 6);
    expect(Math.max(...zs)).toBeCloseTo(4 * Math.sqrt(3) * UNIT_METERS, 6);
  });

  it('adds obstacles as volumes or lifted faces, a patch keeping its road type, and a chequered line', () => {
    const list = triangles.build({ sweep, obstacles, line: 0.5, skirtBase: -2 });
    const of = (kind: Obstacle['kind'], face: 'top' | 'side'): Triangle3[] =>
      list.filter(
        (t: Triangle3) =>
          t.paint.kind === 'obstacle' && t.paint.obstacle === kind && t.paint.face === face,
      );
    expect(of('hazard', 'top')).toHaveLength(2);
    expect(of('hazard', 'side')).toHaveLength(8);
    expect(of('barrier', 'side').length).toBeGreaterThan(0);
    expect(of('ramp', 'side').length).toBeGreaterThan(0);
    expect(of('patch', 'side')).toHaveLength(0);
    expect(of('ramp', 'top').length).toBeGreaterThan(0);
    for (const t of of('patch', 'top')) expect(t.paint).toMatchObject({ road: 3 });
    for (const t of of('hazard', 'top')) expect(t.paint).not.toHaveProperty('road');
    const hazardTop = of('hazard', 'top')[0]!;
    const groundY = 10 * 0.2;
    expect(hazardTop.a.y).toBeCloseTo(groundY + 1.5, 6);
    const patchTop = of('patch', 'top')[0]!;
    expect(patchTop.a.y).toBeCloseTo(groundY + 0.03, 6);
    const hazardPoints = of('hazard', 'top').flatMap((tri: Triangle3) => [tri.a, tri.b, tri.c]);
    const cx = hazardPoints.reduce((s: number, v: Vec3) => s + v.x, 0) / hazardPoints.length;
    const cz = hazardPoints.reduce((s: number, v: Vec3) => s + v.z, 0) / hazardPoints.length;
    for (const t of of('hazard', 'side')) {
      const c = centre(t);
      expect(normal(t).dot(new Vec3(c.x - cx, 0, c.z - cz))).toBeGreaterThan(0);
    }
    const line = list.filter((t: Triangle3) => t.paint.kind === 'line');
    expect(line.length).toBeGreaterThan(0);
    expect(line.some((t: Triangle3) => t.paint.kind === 'line' && t.paint.dark)).toBe(true);
    expect(line.some((t: Triangle3) => t.paint.kind === 'line' && !t.paint.dark)).toBe(true);
    expect(line[0]!.a.y).toBeCloseTo(groundY + 0.02, 6);
  });

  it('lays the line barely off the road, well under the flat lift of a patch', () => {
    const list = triangles.build({ sweep, obstacles, line: 0.5, skirtBase: -2 });
    const line = list.filter((t: Triangle3) => t.paint.kind === 'line');
    const groundY = 10 * 0.2;
    const lifts = line
      .flatMap((t: Triangle3) => [t.a.y, t.b.y, t.c.y])
      .map((y: number) => y - groundY);
    expect(Math.max(...lifts)).toBeLessThan(0.025);
    expect(Math.min(...lifts)).toBeGreaterThan(0);
  });

  it('follows the knobs for heights and lifts', () => {
    triangles.hazardHeight = 2;
    triangles.flatLift = 0.1;
    triangles.lineLift = 0.5;
    const list = triangles.build({ sweep, obstacles, skirtBase: -2 });
    const top = (kind: Obstacle['kind']): Triangle3 =>
      list.find(
        (t: Triangle3) =>
          t.paint.kind === 'obstacle' && t.paint.obstacle === kind && t.paint.face === 'top',
      )!;
    expect(top('hazard').a.y).toBeCloseTo(2 + 2, 6);
    expect(top('patch').a.y).toBeCloseTo(2 + 0.1, 6);
    expect(list.filter((t: Triangle3) => t.paint.kind === 'line')).toHaveLength(0);
  });

  it('emits nothing for a patch of no length, whose quads collapse to two points', () => {
    const flat: Obstacle = { ...PATCH, from: 0.5, to: 0.5, offset: 0 };
    const list = triangles.build({ sweep, obstacles: [flat], skirtBase: -2 });
    expect(list.filter((t: Triangle3) => t.paint.kind === 'obstacle')).toHaveLength(0);
  });

  it('skips a degenerate face and drops repeated points', () => {
    const thin = sweepOf({ exit: 4, entry: TEN_STEPS_HIGH });
    const list = triangles.build({ sweep: thin, obstacles: [RIGHT_BARRIER], skirtBase: -2 });
    expect(list.length).toBeGreaterThan(0);
    const tiny = list.filter((t: Triangle3) => normal(t).length() < 1e-12);
    expect(tiny).toHaveLength(0);
  });
});
