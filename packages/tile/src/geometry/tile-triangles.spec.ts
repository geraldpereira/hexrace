import { TestBed } from '@angular/core/testing';
import { Vec2, Vec3 } from '@hexrace/commons';

import { type Obstacle } from '@tile/entity/obstacle';
import { type Profile } from '@tile/entity/profile';
import { type TileSweep } from '@tile/entity/sweep';
import { type Triangle3 } from '@tile/entity/triangle';
import { UNIT_METERS } from '@tile/entity/units';
import { TileTriangles } from '@tile/geometry/tile-triangles';

const profile: Profile = {
  position: 2,
  roadWidth: 3,
  leftShoulder: 1,
  rightShoulder: 1,
  height: 10,
  road: 1,
  shoulder: 1,
  landscape: 1,
};
const sweep: TileSweep = {
  center: new Vec2(0, 0),
  heading: 0,
  exit: 2,
  entry: profile,
  exitProfile: profile,
};
const obstacles: Obstacle[] = [
  { kind: 'hazard', size: 'medium', at: 0.75, offset: -0.6 },
  { kind: 'barrier', side: 'right', from: 0, to: 1 },
  { kind: 'ramp', from: 0.3, to: 0.45 },
  { kind: 'patch', from: 0.5, to: 0.65, offset: 0.4, width: 1, road: 3 },
];

function normal(t: Triangle3): Vec3 {
  return t.b.sub(t.a).cross(t.c.sub(t.a));
}

function centre(t: Triangle3): Vec3 {
  return t.a
    .add(t.b)
    .add(t.c)
    .scale(1 / 3);
}

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
    expect(of('ramp', 'side')).toHaveLength(0);
    expect(of('patch', 'side')).toHaveLength(0);
    expect(of('ramp', 'top').length).toBeGreaterThan(0);
    for (const t of of('patch', 'top')) expect(t.paint).toMatchObject({ road: 3 });
    for (const t of of('hazard', 'top')) expect(t.paint).not.toHaveProperty('road');
    const hazardTop = of('hazard', 'top')[0]!;
    const groundY = 10 * 0.2;
    expect(hazardTop.a.y).toBeCloseTo(groundY + 1 * UNIT_METERS, 6);
    for (const t of of('hazard', 'side')) {
      const c = centre(t);
      const hazardCentre = of('hazard', 'top').flatMap((tri: Triangle3) => [tri.a, tri.b, tri.c]);
      const cx = hazardCentre.reduce((s: number, v: Vec3) => s + v.x, 0) / hazardCentre.length;
      const cz = hazardCentre.reduce((s: number, v: Vec3) => s + v.z, 0) / hazardCentre.length;
      expect(normal(t).dot(new Vec3(c.x - cx, 0, c.z - cz))).toBeGreaterThan(0);
    }
    const line = list.filter((t: Triangle3) => t.paint.kind === 'line');
    expect(line.length).toBeGreaterThan(0);
    expect(line.some((t: Triangle3) => t.paint.kind === 'line' && t.paint.dark)).toBe(true);
    expect(line.some((t: Triangle3) => t.paint.kind === 'line' && !t.paint.dark)).toBe(true);
    expect(line[0]!.a.y).toBeCloseTo(groundY + 0.04 * 1.5 * UNIT_METERS, 6);
  });

  it('follows the knobs for heights and lifts', () => {
    triangles.hazardHeight = 2;
    triangles.barrierHeight = 0.5;
    triangles.flatLift = 0.1;
    const list = triangles.build({ sweep, obstacles, skirtBase: -2 });
    const top = (kind: Obstacle['kind']): Triangle3 =>
      list.find(
        (t: Triangle3) =>
          t.paint.kind === 'obstacle' && t.paint.obstacle === kind && t.paint.face === 'top',
      )!;
    expect(top('hazard').a.y).toBeCloseTo(2 + 2 * UNIT_METERS, 6);
    expect(top('barrier').a.y).toBeCloseTo(2 + 0.5 * UNIT_METERS, 6);
    expect(top('ramp').a.y).toBeCloseTo(2 + 0.1 * UNIT_METERS, 6);
    expect(list.filter((t: Triangle3) => t.paint.kind === 'line')).toHaveLength(0);
  });

  it('emits nothing for a patch of no length, whose quads collapse to two points', () => {
    const flat: Obstacle = { kind: 'patch', from: 0.5, to: 0.5, offset: 0, width: 1, road: 2 };
    const list = triangles.build({ sweep, obstacles: [flat], skirtBase: -2 });
    expect(list.filter((t: Triangle3) => t.paint.kind === 'obstacle')).toHaveLength(0);
  });

  it('skips a degenerate face and drops repeated points', () => {
    const thin: TileSweep = { ...sweep, exit: 4 };
    const list = triangles.build({
      sweep: thin,
      obstacles: [{ kind: 'barrier', side: 'right', from: 0, to: 1 }],
      skirtBase: -2,
    });
    expect(list.length).toBeGreaterThan(0);
    const tiny = list.filter((t: Triangle3) => normal(t).length() < 1e-12);
    expect(tiny).toHaveLength(0);
  });
});
