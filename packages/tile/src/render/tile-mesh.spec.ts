import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';

import { type Environment, Environments } from '@tile/entity/environment';
import { type Profile } from '@tile/entity/profile';
import { type TileSweep } from '@tile/entity/sweep';
import { type Paint, type Triangle3, TileTriangles } from '@tile/entity/triangles';
import { OBSTACLE_COLORS, TileMeshes } from '@tile/render/tile-mesh';

const profile: Profile = {
  position: 2,
  roadWidth: 3,
  leftShoulder: 1,
  rightShoulder: 1,
  height: 5,
  road: 1,
  shoulder: 2,
  landscape: 1,
};
const sweep: TileSweep = {
  center: { x: 0, y: 0 },
  heading: 0,
  exit: 12,
  entry: profile,
  exitProfile: profile,
};
let europe: Environment;
let meshes: TileMeshes;
let triangulator: TileTriangles;

beforeEach(() => {
  TestBed.configureTestingModule({});
  europe = TestBed.inject(Environments).of('europe');
  meshes = TestBed.inject(TileMeshes);
  triangulator = TestBed.inject(TileTriangles);
});

describe('TileMeshes.paintColor', () => {
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
    const side = meshes.paintColor({ kind: 'obstacle', obstacle: 'hazard', face: 'side' }, europe);
    expect(side.r).toBeCloseTo(top.r * 0.7);
  });
});

describe('TileMeshes.geometry', () => {
  const triangles: Triangle3[] = [
    {
      a: { x: 0, y: 0, z: 0 },
      b: { x: 1, y: 0, z: 0 },
      c: { x: 0, y: 0, z: 1 },
      paint: { kind: 'skirt' },
    },
    {
      a: { x: 1, y: 0, z: 0 },
      b: { x: 1, y: 0, z: 1 },
      c: { x: 0, y: 0, z: 1 },
      paint: { kind: 'skirt' },
    },
  ];

  it('gives one coloured vertex per triangle corner when flat', () => {
    const geometry = meshes.geometry(triangles, europe);
    expect(geometry.getAttribute('position').count).toBe(6);
    expect(geometry.getAttribute('color').count).toBe(6);
    expect(geometry.getAttribute('normal')).toBeDefined();
    expect(geometry.index).toBeNull();
  });

  it('merges coincident vertices when smooth', () => {
    const geometry = meshes.geometry(triangles, europe, true);
    expect(geometry.getAttribute('position').count).toBe(4);
    expect(geometry.index?.count).toBe(6);
  });
});

describe('TileMeshes.mesh and outline', () => {
  it('builds a mesh over the tile triangles, receiving shadows, flat or smooth', () => {
    const build = { sweep, skirtBase: -2, line: 0.5 };
    const flat = meshes.mesh(build, europe);
    expect(flat.receiveShadow).toBe(true);
    expect(flat.material.flatShading).toBe(true);
    expect(flat.geometry.getAttribute('position').count).toBe(triangulator.build(build).length * 3);
    expect(meshes.mesh(build, europe, true).material.flatShading).toBe(false);
    expect(meshes.material().side).toBe(THREE.DoubleSide);
  });

  it('reuses the triangles it is given instead of building them again', () => {
    const build = { sweep, skirtBase: -2 };
    const two = triangulator.build(build).slice(0, 2);
    const mesh = meshes.mesh(build, europe, false, two);
    expect(mesh.geometry.getAttribute('position').count).toBe(6);
  });

  it('draws the six corners at ground height, in metres', () => {
    const outline = meshes.outline(sweep);
    const points = outline.geometry.getAttribute('position');
    expect(points.count).toBe(6);
    expect(points.getY(0)).toBeCloseTo(5 * 0.2 + 0.02 * 1.7, 5);
    expect(Math.hypot(points.getX(0), points.getZ(0))).toBeCloseTo(8 * 1.7, 5);
    expect(
      (meshes.outline(sweep, '#ff0000').material as THREE.LineBasicMaterial).color.getHexString(),
    ).toBe('ff0000');
  });
});
