import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

import { type Vec2, type Vec3, Noise } from '@hexrace/commons';

import { type Environment } from '@tile/entity/environment';
import { type Obstacle } from '@tile/entity/obstacles/obstacle';
import { type TileSweep } from '@tile/entity/sweep';
import { type Swell, type SwellProbe } from '@tile/entity/swell';
import { type Paint, type TileBuild, type Triangle3 } from '@tile/entity/triangle';
import { EnvironmentCatalog } from '@tile/geometry/environment-catalog';
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
const REST = 'rest';
const MAP_PERIODS = 8;
const MAP_SIZE = 256;
const MAP_ANISOTROPY = 8;

export type TileMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;

/** How a tile is painted: faceted or smooth, and the swell that roughens it, none for a flat look. */
export interface TilePaint {
  readonly smooth?: boolean;
  readonly swells?: SwellProbe | null;
}

/**
 * Builds the three.js side of a tile from its triangles: a colour per vertex from the environment's
 * palette, flat shading or smooth, which merges coincident vertices to hide the facets of twisted
 * quads, and the hexagon's edge for the lab. A caller that knows a zone's swell gets it back in the
 * light: one mesh per zone rank, a generated normal map on planar UVs read at the very world place
 * and wavelength the wheel feels, and a vertex colour lightening the crests. No vertex moves.
 */
@Injectable({ providedIn: 'root' })
export class TileMeshes {
  /** How far a crest lightens a vertex and a hollow darkens it, at `swellReference` of swell. */
  shading = 0.55;
  /** How deep the swell's normal map bites into the light, at `swellReference` of swell. */
  relief = 2.6;
  /** The swell height, in metres, that earns the whole of `shading` and of `relief`. */
  swellReference = 0.15;

  private readonly environments = inject(EnvironmentCatalog);
  private readonly noise = inject(Noise);
  private readonly layout = inject(Layout);
  private readonly sweeper = inject(TileSweeper);
  private readonly triangles = inject(TileTriangles);
  private readonly units = inject(Units);
  private map: THREE.DataTexture | null = null;

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
    paint: TilePaint = {},
  ): THREE.BufferGeometry {
    const positions: number[] = [];
    const colors: number[] = [];
    const uvs: number[] = [];
    for (const t of triangles) {
      const color = this.paintColor(t.paint, environment);
      const swell = this.swellOf(t.paint, paint.swells);
      for (const v of [t.a, t.b, t.c]) {
        positions.push(v.x, v.y, v.z);
        this.pushColor(colors, color, swell ? this.shade(swell, v) : 1);
        const span = swell ? swell.length * MAP_PERIODS : 1;
        uvs.push(v.x / span, v.z / span);
      }
    }
    return this.buffer(positions, colors, uvs, paint.smooth ?? false);
  }

  /** The material of one part: vertex colours, and the swell's normal map when it has one. */
  material(smooth = false, swell: Swell | null = null): THREE.MeshLambertMaterial {
    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: !smooth,
      side: THREE.DoubleSide,
    });
    if (!swell) return material;
    const bite = this.relief * Math.min(swell.height / this.swellReference, 1);
    material.normalMap = this.reliefMap();
    material.normalScale = new THREE.Vector2(bite, bite);
    return material;
  }

  /** The meshes of a tile, one per zone rank so each carries its own relief, the rest in one. */
  parts(
    build: TileBuild,
    environment: Environment,
    paint: TilePaint = {},
    triangles?: readonly Triangle3[],
  ): TileMesh[] {
    const all = triangles ?? this.triangles.build(build);
    return this.split(all, paint.swells).map(([swell, part]: [Swell | null, Triangle3[]]) => {
      const mesh = new THREE.Mesh(
        this.geometry(part, environment, paint),
        this.material(paint.smooth ?? false, swell),
      );
      mesh.receiveShadow = true;
      return mesh;
    });
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

  private buffer(
    positions: number[],
    colors: number[],
    uvs: number[],
    smooth: boolean,
  ): THREE.BufferGeometry {
    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    if (smooth) geometry = mergeVertices(geometry, 1e-4);
    geometry.computeVertexNormals();
    return geometry;
  }

  private pushColor(colors: number[], color: THREE.Color, shade: number): void {
    colors.push(
      this.channel(color.r * shade),
      this.channel(color.g * shade),
      this.channel(color.b * shade),
    );
  }

  private split(
    triangles: readonly Triangle3[],
    probe: SwellProbe | null | undefined,
  ): [Swell | null, Triangle3[]][] {
    if (!probe) return [[null, [...triangles]]];
    const parts = new Map<string, [Swell | null, Triangle3[]]>();
    for (const t of triangles) {
      const key = t.paint.kind === 'zone' ? `${t.paint.zone}/${String(t.paint.type)}` : REST;
      const part = parts.get(key) ?? [this.swellOf(t.paint, probe), []];
      part[1].push(t);
      parts.set(key, part);
    }
    return [...parts.values()];
  }

  private swellOf(paint: Paint, probe: SwellProbe | null | undefined): Swell | null {
    if (!probe || paint.kind !== 'zone') return null;
    const swell = probe.of(paint.zone, paint.type);
    return swell && swell.height > 0 && swell.length > 0 ? swell : null;
  }

  private shade(swell: Swell, v: Vec3): number {
    const strength = Math.min(swell.height / this.swellReference, 1) * this.shading;
    return 1 + strength * this.noise.at(v.x / swell.length, v.z / swell.length);
  }

  private channel(value: number): number {
    return Math.min(1, Math.max(0, value));
  }

  private reliefMap(): THREE.DataTexture {
    this.map ??= this.buildMap();
    return this.map;
  }

  private buildMap(): THREE.DataTexture {
    const data = new Uint8Array(MAP_SIZE * MAP_SIZE * 4);
    const step = MAP_PERIODS / MAP_SIZE;
    for (let j = 0; j < MAP_SIZE; j++) {
      for (let i = 0; i < MAP_SIZE; i++) {
        this.writeNormal(data, (j * MAP_SIZE + i) * 4, i * step, j * step, step);
      }
    }
    const texture = new THREE.DataTexture(data, MAP_SIZE, MAP_SIZE, THREE.RGBAFormat);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = MAP_ANISOTROPY;
    texture.needsUpdate = true;
    return texture;
  }

  private writeNormal(data: Uint8Array, at: number, x: number, y: number, step: number): void {
    const dx = (this.cell(x + step, y) - this.cell(x - step, y)) / (2 * step);
    const dy = (this.cell(x, y + step) - this.cell(x, y - step)) / (2 * step);
    const length = Math.sqrt(dx * dx + dy * dy + 1);
    data[at] = this.byte(-dx / length);
    data[at + 1] = this.byte(-dy / length);
    data[at + 2] = this.byte(1 / length);
    data[at + 3] = 255;
  }

  private cell(x: number, y: number): number {
    return this.noise.tiled(x, y, MAP_PERIODS);
  }

  private byte(value: number): number {
    return Math.round(this.channel(value * 0.5 + 0.5) * 255);
  }
}
