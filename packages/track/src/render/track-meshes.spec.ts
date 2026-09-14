import { TestBed } from '@angular/core/testing';
import { type Environment, type TileBuild, EnvironmentCatalog, TileTriangles } from '@hexrace/tile';
import * as THREE from 'three';

import { climbOf } from '@track/entity/track.mock';
import { TrackPlacement } from '@track/geometry/track-placement';
import { TrackSweeps } from '@track/geometry/track-sweeps';
import { TrackMeshes } from '@track/render/track-meshes';

describe('TrackMeshes', () => {
  let meshes: TrackMeshes;
  let builds: TileBuild[];
  let europe: Environment;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    meshes = TestBed.inject(TrackMeshes);
    europe = TestBed.inject(EnvironmentCatalog).of('europe');
    const track = climbOf([10, 12, 14]);
    builds = TestBed.inject(TrackSweeps).builds(track, TestBed.inject(TrackPlacement).place(track));
  });

  it('makes one group per tile, mesh and outline, named by its index', () => {
    const group = meshes.group(builds, europe);
    expect(group.children).toHaveLength(3);
    expect(group.children.map((child: THREE.Object3D) => child.name)).toEqual([
      'tile-0',
      'tile-1',
      'tile-2',
    ]);
    const first = group.children[0];
    expect(first?.children).toHaveLength(2);
    expect(first?.children[0]).toBeInstanceOf(THREE.Mesh);
    expect(first?.children[1]).toBeInstanceOf(THREE.LineLoop);
  });

  it('outlines a faulty tile in red and leaves the others alone', () => {
    const group = meshes.group(builds, europe, { faulty: new Set([1]) });
    const colorOf = (index: number): string => {
      const loop = group.children[index]?.children[1] as THREE.LineLoop;
      return `#${(loop.material as THREE.LineBasicMaterial).color.getHexString()}`;
    };
    expect(colorOf(1)).toBe(meshes.faultyColor);
    expect(colorOf(0)).not.toBe(meshes.faultyColor);
  });

  it('drops the outline and takes triangles already built', () => {
    const build = builds[0];
    expect(build).toBeDefined();
    if (!build) return;
    const triangles = TestBed.inject(TileTriangles).build(build);
    const group = meshes.tile(build, europe, { outline: false, smooth: true, triangles });
    expect(group.children).toHaveLength(1);
    const mesh = group.children[0] as THREE.Mesh;
    expect((mesh.material as THREE.MeshLambertMaterial).flatShading).toBe(false);
  });
});
