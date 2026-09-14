import { Injectable, inject } from '@angular/core';
import {
  type Environment,
  type TileBuild,
  type Triangle3,
  TileMeshes,
  TileTriangles,
} from '@hexrace/tile';
import * as THREE from 'three';

/** How one tile is drawn: smooth or faceted, outlined, and in red when the validation refuses it. */
export interface TileGroupOptions {
  readonly smooth?: boolean;
  readonly outline?: boolean;
  readonly faulty?: boolean;
  readonly triangles?: readonly Triangle3[];
}

/** How a whole track is drawn; `faulty` holds the indices the validation refused. */
export interface TrackGroupOptions {
  readonly smooth?: boolean;
  readonly outline?: boolean;
  readonly faulty?: ReadonlySet<number>;
}

/**
 * The three.js side of a track: one group per tile, so the tile window can add and drop them one
 * by one, each holding the tile's mesh and the hexagon's edge, drawn red when the tile is faulty.
 * The skirt of every tile goes down to the same floor, which `TrackSweeps` put in the build.
 */
@Injectable({ providedIn: 'root' })
export class TrackMeshes {
  /** The colour of the edge of a tile the validation refused. */
  faultyColor = '#ef4444';

  private readonly meshes = inject(TileMeshes);
  private readonly triangles = inject(TileTriangles);

  tile(build: TileBuild, environment: Environment, options: TileGroupOptions = {}): THREE.Group {
    const triangles = options.triangles ?? this.triangles.build(build);
    const group = new THREE.Group();
    group.add(this.meshes.mesh(build, environment, options.smooth ?? false, triangles));
    if (options.outline ?? true) {
      group.add(
        options.faulty
          ? this.meshes.outline(build.sweep, this.faultyColor)
          : this.meshes.outline(build.sweep),
      );
    }
    return group;
  }

  /** The whole track in one group, a child per tile in the order of travel. */
  group(
    builds: readonly TileBuild[],
    environment: Environment,
    options: TrackGroupOptions = {},
  ): THREE.Group {
    const group = new THREE.Group();
    builds.forEach((build: TileBuild, index: number) => {
      const child = this.tile(build, environment, {
        ...options,
        faulty: options.faulty?.has(index) ?? false,
      });
      child.name = `tile-${String(index)}`;
      group.add(child);
    });
    return group;
  }
}
