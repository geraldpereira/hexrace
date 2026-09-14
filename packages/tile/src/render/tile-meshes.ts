import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

import { type Vec2 } from '@hexrace/commons';

import { type Environment } from '@tile/entity/environment';
import { type Obstacle } from '@tile/entity/obstacle';
import { type TileSweep } from '@tile/entity/sweep';
import { type Paint, type TileBuild, type Triangle3 } from '@tile/entity/triangle';
import { Environments } from '@tile/geometry/environments';
import { Layout } from '@tile/geometry/layout';
import { TileSweeper } from '@tile/geometry/tile-sweeper';
import { TileTriangles } from '@tile/geometry/tile-triangles';
import { Units } from '@tile/geometry/units';

/** One colour per obstacle kind; a patch takes its road type's colour instead. */
export const OBSTACLE_COLORS: Readonly<Record<Obstacle['kind'], string>> = {
  hazard: '#f97316',
  barrier: '#ef4444',
  ramp: '#facc15',
  bump: '#a3a3a3',
  patch: '#60a5fa',
};

const SKIRT_COLOR = '#292524';
const LINE_DARK = '#111111';
const LINE_LIGHT = '#f5f5f4';
const SIDE_SHADE = 0.7;
const OUTLINE_LIFT = 0.02;

export type TileMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;

/**
 * Builds the three.js side of a tile from its triangles: one colour per vertex from the
 * environment's palette, flat shading by default or smooth, which merges coincident vertices and
 * averages their normals to hide the facets of twisted quads; and the hexagon's edge on the
 * ground for the lab and the editor.
 */
@Injectable({ providedIn: 'root' })
export class TileMeshes {
  private readonly environments = inject(Environments);
  private readonly layout = inject(Layout);
  private readonly sweeper = inject(TileSweeper);
  private readonly triangles = inject(TileTriangles);
  private readonly units = inject(Units);

  /** The colour of a paint in an environment, obstacle sides darkened. */
  paintColor(paint: Paint, environment: Environment): THREE.Color {
    switch (paint.kind) {
      case 'zone':
        return new THREE.Color(this.environments.zoneColor(environment, paint.zone, paint.type));
      case 'skirt':
        return new THREE.Color(SKIRT_COLOR);
      case 'line':
        return new THREE.Color(paint.dark ? LINE_DARK : LINE_LIGHT);
      case 'obstacle': {
        const fill = paint.road
          ? this.environments.zoneColor(environment, 'road', paint.road)
          : OBSTACLE_COLORS[paint.obstacle];
        const color = new THREE.Color(fill);
        return paint.face === 'side' ? color.multiplyScalar(SIDE_SHADE) : color;
      }
    }
  }

  geometry(
    triangles: readonly Triangle3[],
    environment: Environment,
    smooth = false,
  ): THREE.BufferGeometry {
    const positions: number[] = [];
    const colors: number[] = [];
    for (const t of triangles) {
      const color = this.paintColor(t.paint, environment);
      for (const v of [t.a, t.b, t.c]) {
        positions.push(v.x, v.y, v.z);
        colors.push(color.r, color.g, color.b);
      }
    }
    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    if (smooth) geometry = mergeVertices(geometry, 1e-4);
    geometry.computeVertexNormals();
    return geometry;
  }

  material(smooth = false): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: !smooth,
      side: THREE.DoubleSide,
    });
  }

  /** The mesh of a tile, shadows received, over freshly built triangles or the ones given. */
  mesh(
    build: TileBuild,
    environment: Environment,
    smooth = false,
    triangles?: readonly Triangle3[],
  ): TileMesh {
    const mesh = new THREE.Mesh(
      this.geometry(triangles ?? this.triangles.build(build), environment, smooth),
      this.material(smooth),
    );
    mesh.receiveShadow = true;
    return mesh;
  }

  /** The hexagon's edge drawn on the ground. */
  outline(sweep: TileSweep, color = '#0c0a09'): THREE.LineLoop {
    const points = this.layout.corners(sweep.center).map((p: Vec2) => {
      const v = this.units.toWorld(p, this.sweeper.heightAt(sweep, p) + OUTLINE_LIFT);
      return new THREE.Vector3(v.x, v.y, v.z);
    });
    return new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color }),
    );
  }
}
