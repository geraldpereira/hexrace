import { TestBed } from '@angular/core/testing';

import { HEX_AREA } from '@tile/entity/geometry';
import { type Obstacle } from '@tile/entity/obstacle';
import { type Profile } from '@tile/entity/profile';
import { type TileSweep } from '@tile/entity/sweep';
import {
  type Paint,
  type Triangle3,
  type Vec3,
  TileTriangles,
  toWorld,
} from '@tile/entity/triangles';
import { HEIGHT_UNIT, UNIT_METERS } from '@tile/entity/units';

const profile: Profile = {
  position: 2,
  roadWidth: 3,
  leftShoulder: 1,
  rightShoulder: 1,
  height: 5,
  road: 1,
  shoulder: 1,
  landscape: 1,
};
const sweep: TileSweep = {
  center: { x: 0, y: 0 },
  heading: 0,
  exit: 12,
  entry: profile,
  exitProfile: profile,
};
const skirtBase = -2;

function area(t: Triangle3): number {
  const ab = { x: t.b.x - t.a.x, z: t.b.z - t.a.z };
  const ac = { x: t.c.x - t.a.x, z: t.c.z - t.a.z };
  return Math.abs(ab.x * ac.z - ab.z * ac.x) / 2;
}

function ofKind(triangles: Triangle3[], kind: Paint['kind']): Triangle3[] {
  return triangles.filter((t) => t.paint.kind === kind);
}

function obstacleFaces(triangles: Triangle3[], face: 'top' | 'side'): Triangle3[] {
  return triangles.filter((t) => t.paint.kind === 'obstacle' && t.paint.face === face);
}

function vertices(triangles: Triangle3[]): Vec3[] {
  return triangles.flatMap((t) => [t.a, t.b, t.c]);
}

describe('toWorld', () => {
  it('turns units into metres, y up, the plane north to -z', () => {
    expect(toWorld({ x: 1, y: 2 }, 3)).toEqual({
      x: UNIT_METERS,
      y: 3 * UNIT_METERS,
      z: -2 * UNIT_METERS,
    });
  });
});

describe('TileTriangles', () => {
  let triangulator: TileTriangles;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    triangulator = TestBed.inject(TileTriangles);
  });

  it('covers the hexagon with zone triangles at the tile height, and drops a skirt to the base', () => {
    const triangles = triangulator.build({ sweep, skirtBase });
    const zones = ofKind(triangles, 'zone');
    const covered = zones.reduce((sum, t) => sum + area(t), 0) / UNIT_METERS ** 2;
    expect(Math.abs(covered - HEX_AREA) / HEX_AREA).toBeLessThan(0.003);
    for (const v of vertices(zones)) expect(v.y).toBeCloseTo(5 * HEIGHT_UNIT * UNIT_METERS, 9);
    const skirt = ofKind(triangles, 'skirt');
    expect(skirt.length).toBeGreaterThan(0);
    const ys = new Set(vertices(skirt).map((v) => Math.round(v.y * 1e6) / 1e6));
    expect(ys).toContain(Math.round(skirtBase * UNIT_METERS * 1e6) / 1e6);
    expect(ys.size).toBe(2);
    expect(ofKind(triangles, 'line')).toHaveLength(0);
    expect(ofKind(triangles, 'obstacle')).toHaveLength(0);
  });

  it('paints the zones with their rank and side', () => {
    const paints = ofKind(triangulator.build({ sweep, skirtBase, line: null }), 'zone').map(
      (t) => t.paint,
    );
    expect(paints.some((p) => p.kind === 'zone' && p.zone === 'road' && p.type === 1)).toBe(true);
    expect(paints.some((p) => p.kind === 'zone' && p.zone === 'shoulder')).toBe(true);
    expect(paints.some((p) => p.kind === 'zone' && p.zone === 'landscape')).toBe(true);
  });

  it('adds a lifted chequered line across the road when asked', () => {
    const triangles = triangulator.build({ sweep, skirtBase, line: 0.5 });
    const line = ofKind(triangles, 'line');
    expect(line).toHaveLength(12 * 2);
    expect(line.some((t) => t.paint.kind === 'line' && t.paint.dark)).toBe(true);
    expect(line.some((t) => t.paint.kind === 'line' && !t.paint.dark)).toBe(true);
    for (const v of vertices(line)) expect(v.y).toBeGreaterThan(5 * HEIGHT_UNIT * UNIT_METERS);
  });

  it('raises a hazard as one level top and four walls down to the ground', () => {
    const hazard: Obstacle = { kind: 'hazard', size: 'large', at: 0.5, offset: 0 };
    const triangles = triangulator.build({ sweep, skirtBase, obstacles: [hazard] });
    const top = obstacleFaces(triangles, 'top');
    const side = obstacleFaces(triangles, 'side');
    expect(top).toHaveLength(2);
    expect(side).toHaveLength(8);
    const ground = 5 * HEIGHT_UNIT * UNIT_METERS;
    for (const v of vertices(top)) expect(v.y).toBeCloseTo(ground + UNIT_METERS, 9);
    expect(top[0]?.paint).toEqual({
      kind: 'obstacle',
      obstacle: 'hazard',
      road: undefined,
      face: 'top',
    });
    expect(side[0]?.paint).toEqual({
      kind: 'obstacle',
      obstacle: 'hazard',
      road: undefined,
      face: 'side',
    });
    const sideYs = vertices(side).map((v) => v.y);
    expect(Math.min(...sideYs)).toBeCloseTo(ground, 9);
    expect(Math.max(...sideYs)).toBeCloseTo(ground + UNIT_METERS, 9);
  });

  it('raises a barrier as a band cut into quads with its walls, lower than a hazard', () => {
    const barrier: Obstacle = { kind: 'barrier', side: 'right', from: 0, to: 1 };
    const triangles = triangulator.build({ sweep, skirtBase, obstacles: [barrier] });
    const top = obstacleFaces(triangles, 'top');
    const side = obstacleFaces(triangles, 'side');
    expect(top).toHaveLength(12 * 2);
    expect(side.length).toBeGreaterThan(0);
    const ground = 5 * HEIGHT_UNIT * UNIT_METERS;
    for (const v of vertices(top)) expect(v.y).toBeCloseTo(ground + 0.8 * UNIT_METERS, 9);
  });

  it('lays ramp, bump and patch flat as one lifted face, the patch carrying its road type', () => {
    const obstacles: Obstacle[] = [
      { kind: 'ramp', from: 0.1, to: 0.3 },
      { kind: 'bump', from: 0.4, to: 0.5 },
      { kind: 'patch', from: 0.6, to: 0.8, offset: 0.5, width: 1, road: 3 },
    ];
    const triangles = triangulator.build({ sweep, skirtBase, obstacles });
    expect(obstacleFaces(triangles, 'side')).toHaveLength(0);
    const top = obstacleFaces(triangles, 'top');
    expect(top).toHaveLength(3 * 12 * 2);
    const ground = 5 * HEIGHT_UNIT * UNIT_METERS;
    for (const v of vertices(top)) {
      expect(v.y).toBeGreaterThan(ground);
      expect(v.y).toBeLessThan(ground + 0.1 * UNIT_METERS);
    }
    const patch = top.find((t) => t.paint.kind === 'obstacle' && t.paint.obstacle === 'patch');
    expect(patch?.paint).toEqual({ kind: 'obstacle', obstacle: 'patch', road: 3, face: 'top' });
  });

  it('follows the height knobs for hazards, barriers and flat faces', () => {
    triangulator.hazardHeight = 2;
    triangulator.barrierHeight = 0.5;
    triangulator.flatLift = 0.1;
    const ground = 5 * HEIGHT_UNIT * UNIT_METERS;
    const hazard = triangulator.build({
      sweep,
      skirtBase,
      obstacles: [{ kind: 'hazard', size: 'small', at: 0.5, offset: 0 }],
    });
    for (const v of vertices(obstacleFaces(hazard, 'top'))) {
      expect(v.y).toBeCloseTo(ground + 2 * UNIT_METERS, 9);
    }
    const barrier = triangulator.build({
      sweep,
      skirtBase,
      obstacles: [{ kind: 'barrier', side: 'left', from: 0, to: 1 }],
    });
    for (const v of vertices(obstacleFaces(barrier, 'top'))) {
      expect(v.y).toBeCloseTo(ground + 0.5 * UNIT_METERS, 9);
    }
    const ramp = triangulator.build({
      sweep,
      skirtBase,
      obstacles: [{ kind: 'ramp', from: 0.1, to: 0.3 }],
    });
    for (const v of vertices(obstacleFaces(ramp, 'top'))) {
      expect(v.y).toBeCloseTo(ground + 0.1 * UNIT_METERS, 9);
    }
  });

  it('skips a footprint that degenerates to fewer than three distinct points', () => {
    const point: Obstacle = { kind: 'patch', from: 0.5, to: 0.5, offset: 0, width: 0, road: 1 };
    const triangles = triangulator.build({ sweep, skirtBase, obstacles: [point] });
    expect(ofKind(triangles, 'obstacle')).toHaveLength(0);
  });

  it('drops a closing point equal to the first before fanning', () => {
    const closed: Obstacle = { kind: 'patch', from: 0.3, to: 0.3, offset: 0, width: 2, road: 1 };
    const triangles = triangulator.build({ sweep, skirtBase, obstacles: [closed] });
    expect(ofKind(triangles, 'obstacle')).toHaveLength(0);
  });
});
