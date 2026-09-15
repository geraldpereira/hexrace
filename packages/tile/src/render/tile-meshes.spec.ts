import { TestBed } from '@angular/core/testing';
import { Vec3 } from '@hexrace/commons';
import * as THREE from 'three';

import { type Environment } from '@tile/entity/environment';
import { PALE_SHOULDER } from '@tile/entity/profile.mock';
import { sweepOf } from '@tile/entity/sweep.mock';
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
      const geometry = meshes.geometry(two, europe, true);
      expect(geometry.getAttribute('position').count).toBe(4);
      expect(geometry.index?.count).toBe(6);
    });

    it('paints by vertex colour, flat or smooth, on both sides', () => {
      expect(meshes.material().flatShading).toBe(true);
      expect(meshes.material(true).flatShading).toBe(false);
      expect(meshes.material().side).toBe(THREE.DoubleSide);
      expect(meshes.material().vertexColors).toBe(true);
    });
  });

  describe('mesh and outline', () => {
    it('builds a mesh over freshly built triangles, receiving shadows, flat or smooth', () => {
      const build = { sweep, skirtBase: -2, line: 0.5 };
      const flat = meshes.mesh(build, europe);
      expect(flat.receiveShadow).toBe(true);
      expect(flat.material.flatShading).toBe(true);
      const count = TestBed.inject(TileTriangles).build(build).length * 3;
      expect(flat.geometry.getAttribute('position').count).toBe(count);
      expect(meshes.mesh(build, europe, true).material.flatShading).toBe(false);
    });

    it('reuses the triangles it is given', () => {
      const mesh = meshes.mesh({ sweep, skirtBase: -2 }, europe, false, two);
      expect(mesh.geometry.getAttribute('position').count).toBe(6);
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
