import { TestBed } from '@angular/core/testing';
import { Vec3 } from '@hexrace/commons';
import * as THREE from 'three';

import { type Environment } from '@tile/entity/environment';
import { PALE_SHOULDER } from '@tile/entity/profile.mock';
import { sweepOf } from '@tile/entity/sweep.mock';
import { ROLLING, swellProbe } from '@tile/entity/swell.mock';
import { type Paint, type Triangle3 } from '@tile/entity/triangle';
import { UNIT_METERS } from '@tile/entity/units';
import { EnvironmentCatalog } from '@tile/geometry/environment-catalog';
import { TileTriangles } from '@tile/geometry/tile-triangles';
import { OBSTACLE_COLORS, TileMeshes } from '@tile/render/tile-meshes';

const sweep = sweepOf({ entry: PALE_SHOULDER });
const two: Triangle3[] = [
  { a: new Vec3(0, 0, 0), b: new Vec3(1, 0, 0), c: new Vec3(0, 0, 1), paint: { kind: 'skirt' } },
  { a: new Vec3(1, 0, 0), b: new Vec3(1, 0, 1), c: new Vec3(0, 0, 1), paint: { kind: 'skirt' } },
];

describe('TileMeshes', () => {
  let meshes: TileMeshes;
  let europe: Environment;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    meshes = TestBed.inject(TileMeshes);
    europe = TestBed.inject(EnvironmentCatalog).of('europe');
  });

  describe('paintColor', () => {
    it.each<[string, Paint, (env: Environment) => string]>([
      [
        'a zone by its rank',
        { kind: 'zone', zone: 'shoulder', type: 2 },
        (env) => env.colors.shoulder[1],
      ],
      ['the skirt', { kind: 'skirt' }, () => '#292524'],
      ['a dark line square', { kind: 'line', dark: true }, () => '#111111'],
      ['a light line square', { kind: 'line', dark: false }, () => '#f5f5f4'],
      [
        'an obstacle top',
        { kind: 'obstacle', obstacle: 'ramp', face: 'top' },
        () => OBSTACLE_COLORS.ramp,
      ],
      [
        'a patch by its road type',
        { kind: 'obstacle', obstacle: 'patch', road: 3, face: 'top' },
        (env) => env.colors.road[2],
      ],
    ])('colours %s', (_name, paint, expected) => {
      expect(meshes.paintColor(paint, europe).getHexString()).toBe(
        new THREE.Color(expected(europe)).getHexString(),
      );
    });

    it('darkens an obstacle side', () => {
      const top = meshes.paintColor({ kind: 'obstacle', obstacle: 'hazard', face: 'top' }, europe);
      const side = meshes.paintColor(
        { kind: 'obstacle', obstacle: 'hazard', face: 'side' },
        europe,
      );
      expect(side.r).toBeCloseTo(top.r * 0.7);
    });
  });

  describe('geometry and material', () => {
    it('gives one coloured vertex per triangle corner when flat', () => {
      const geometry = meshes.geometry(two, europe);
      expect(geometry.getAttribute('position').count).toBe(6);
      expect(geometry.getAttribute('color').count).toBe(6);
      expect(geometry.getAttribute('normal')).toBeDefined();
      expect(geometry.index).toBeNull();
    });

    it('merges coincident vertices when smooth', () => {
      const geometry = meshes.geometry(two, europe, { smooth: true });
      expect(geometry.getAttribute('position').count).toBe(4);
      expect(geometry.index?.count).toBe(6);
    });

    it('paints by vertex colour, flat or smooth, on both sides', () => {
      expect(meshes.material().flatShading).toBe(true);
      expect(meshes.material(true).flatShading).toBe(false);
      expect(meshes.material().side).toBe(THREE.DoubleSide);
      expect(meshes.material().vertexColors).toBe(true);
      expect(meshes.material().normalMap).toBeNull();
    });

    it('hangs the swell on the material, deeper the higher the swell, and shares one map', () => {
      const soft = meshes.material(false, { height: 0.05, length: 6 });
      const hard = meshes.material(false, ROLLING);
      expect(soft.normalMap).toBe(hard.normalMap);
      expect(soft.normalMap?.source.data).toBeDefined();
      expect(hard.normalScale.x).toBeGreaterThan(soft.normalScale.x);
      expect(meshes.material(false, { height: 10, length: 6 }).normalScale.x).toBeCloseTo(
        meshes.relief,
      );
    });
  });

  describe('the swell in the paint', () => {
    it('leaves a tile without a probe in one flat mesh, unlit by any map', () => {
      const parts = meshes.parts({ sweep, skirtBase: -2 }, europe);
      expect(parts).toHaveLength(1);
      expect(parts[0]?.material.normalMap).toBeNull();
    });

    it('cuts a tile into one mesh per zone rank, and only the rough ones carry a map', () => {
      const parts = meshes.parts({ sweep, skirtBase: -2 }, europe, { swells: swellProbe });
      expect(parts.length).toBeGreaterThan(1);
      const mapped = parts.filter((part) => part.material.normalMap !== null);
      expect(mapped.length).toBeGreaterThan(0);
      expect(mapped.length).toBeLessThan(parts.length);
      const corners = parts.reduce((n, part) => n + part.geometry.getAttribute('position').count, 0);
      expect(corners).toBe(TestBed.inject(TileTriangles).build({ sweep, skirtBase: -2 }).length * 3);
    });

    it('lights the crests and darkens the hollows of a rough zone, and leaves a flat one alone', () => {
      const rough: Triangle3[] = [
        {
          a: new Vec3(0, 0, 0),
          b: new Vec3(20, 0, 0),
          c: new Vec3(0, 0, 20),
          paint: { kind: 'zone', zone: 'landscape', type: 1 },
        },
      ];
      const shaded = meshes.geometry(rough, europe, { swells: swellProbe });
      const colors = shaded.getAttribute('color');
      expect(colors.getX(0)).not.toBeCloseTo(colors.getX(1));
      const uv = shaded.getAttribute('uv');
      expect(uv.getX(1)).toBeCloseTo(20 / (ROLLING.length * 8));
      const plain = meshes.geometry(rough, europe).getAttribute('color');
      expect(plain.getX(0)).toBeCloseTo(plain.getX(1));
    });
  });

  describe('parts and outline', () => {
    it('builds the meshes over freshly built triangles, receiving shadows, flat or smooth', () => {
      const build = { sweep, skirtBase: -2, line: 0.5 };
      const flat = meshes.parts(build, europe)[0]!;
      expect(flat.receiveShadow).toBe(true);
      expect(flat.material.flatShading).toBe(true);
      const count = TestBed.inject(TileTriangles).build(build).length * 3;
      expect(flat.geometry.getAttribute('position').count).toBe(count);
      expect(meshes.parts(build, europe, { smooth: true })[0]?.material.flatShading).toBe(false);
    });

    it('reuses the triangles it is given', () => {
      const part = meshes.parts({ sweep, skirtBase: -2 }, europe, {}, two)[0]!;
      expect(part.geometry.getAttribute('position').count).toBe(6);
    });

    it('draws the six corners at ground height, in metres, in the colour asked', () => {
      const outline = meshes.outline(sweep);
      const points = outline.geometry.getAttribute('position');
      expect(points.count).toBe(6);
      expect(points.getY(0)).toBeCloseTo(5 * 0.2 + 0.02 * UNIT_METERS, 5);
      expect(Math.hypot(points.getX(0), points.getZ(0))).toBeCloseTo(8 * UNIT_METERS, 5);
      expect((outline.material as THREE.LineBasicMaterial).color.getHexString()).toBe('0c0a09');
      expect(
        (meshes.outline(sweep, '#ff0000').material as THREE.LineBasicMaterial).color.getHexString(),
      ).toBe('ff0000');
    });
  });
});
