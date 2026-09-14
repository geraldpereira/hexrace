import { Injectable } from '@angular/core';
import * as THREE from 'three';

const VERTEX = `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  uniform float uScale;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uScale / max(-mv.z, 0.1);
    vAlpha = aAlpha;
    vColor = aColor;
  }
`;
const FRAGMENT = `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d) * 2.0;
    if (r > 1.0) discard;
    float a = vAlpha * (1.0 - r * r);
    gl_FragColor = vec4(vColor, a);
  }
`;
const DEFAULT_SCALE = 500;
const MAX_PIXEL_RATIO = 2;

/** One particle of the cloud: dust when `kind` is 0, a stone or a clod when it is 1. */
export interface Puff {
  alive: boolean;
  kind: 0 | 1;
  age: number;
  life: number;
  size: number;
  alpha: number;
  readonly pos: THREE.Vector3;
  readonly vel: THREE.Vector3;
  readonly color: THREE.Color;
}

/** The buffers behind a cloud: the points to hang in the scene and the particles to move. */
export interface PuffCloud {
  readonly points: THREE.Points;
  readonly particles: readonly Puff[];
  readonly positions: THREE.BufferAttribute;
  readonly colors: THREE.BufferAttribute;
  readonly sizes: THREE.BufferAttribute;
  readonly alphas: THREE.BufferAttribute;
  readonly material: THREE.ShaderMaterial;
  readonly scale: THREE.IUniform<number>;
}

/**
 * The three.js side of the dust: a `THREE.Points` whose sprite shader draws a soft disc, dense in
 * the middle and feathered at the edge, at a pixel size that follows the distance so a metre is a
 * metre. Building, uploading and freeing live here; who spawns and moves the particles does not
 * touch a buffer. Puffs grow and fade out, solid bits keep their size and vanish at the end.
 */
@Injectable({ providedIn: 'root' })
export class Puffs {
  build(count: number): PuffCloud {
    const geometry = new THREE.BufferGeometry();
    const positions = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
    const colors = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
    const sizes = new THREE.BufferAttribute(new Float32Array(count), 1);
    const alphas = new THREE.BufferAttribute(new Float32Array(count), 1);
    for (const attribute of [positions, colors, sizes, alphas]) {
      attribute.setUsage(THREE.DynamicDrawUsage);
    }
    geometry.setAttribute('position', positions);
    geometry.setAttribute('aColor', colors);
    geometry.setAttribute('aSize', sizes);
    geometry.setAttribute('aAlpha', alphas);
    const scale: THREE.IUniform<number> = { value: DEFAULT_SCALE };
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: { uScale: scale },
      transparent: true,
      depthWrite: false,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.renderOrder = 2;
    const particles = Array.from({ length: count }, () => ({
      alive: false,
      kind: 0 as const,
      age: 0,
      life: 1,
      size: 0,
      alpha: 0,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      color: new THREE.Color(),
    }));
    return { points, particles, positions, colors, sizes, alphas, material, scale };
  }

  /** Writes every particle into the buffers and returns how many are alive. */
  upload(cloud: PuffCloud, camera: THREE.PerspectiveCamera | null): number {
    let alive = 0;
    for (const [i, p] of cloud.particles.entries()) {
      if (!p.alive) {
        cloud.alphas.setX(i, 0);
        cloud.sizes.setX(i, 0);
        continue;
      }
      alive++;
      const u = p.age / p.life;
      const dust = p.kind === 0;
      cloud.positions.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
      cloud.colors.setXYZ(i, p.color.r, p.color.g, p.color.b);
      cloud.sizes.setX(i, dust ? p.size * (1 + u * 1.2) : p.size);
      cloud.alphas.setX(i, dust ? p.alpha * (1 - u) * (1 - u) : this.fadeOut(u));
    }
    for (const attribute of [cloud.positions, cloud.colors, cloud.sizes, cloud.alphas]) {
      attribute.needsUpdate = true;
    }
    if (camera) cloud.scale.value = this.pixelsPerMetre(camera);
    return alive;
  }

  dispose(cloud: PuffCloud): void {
    cloud.points.geometry.dispose();
    cloud.material.dispose();
  }

  private fadeOut(u: number): number {
    return u > 0.8 ? (1 - u) * 5 : 1;
  }

  private pixelsPerMetre(camera: THREE.PerspectiveCamera): number {
    const height = window.innerHeight * Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
    const fov = (camera.fov * Math.PI) / 180;
    return height / (2 * Math.tan(fov / 2));
  }
}
