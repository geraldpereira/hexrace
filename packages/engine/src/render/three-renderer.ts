import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';

const SKY = 0x87ceeb;
const MAX_PIXEL_RATIO = 2;

/**
 * The renderer, and it is three.js: one scene graph, one persistent canvas the screens move around
 * (functional spec 7.5), and a WebGL2 renderer with shadows created on the first render, so that a
 * test without WebGL can build scenes and only has to mock `WebGLRenderer` or spy on `render`.
 * Sky blue background and fog as in the POC; pixel ratio capped at 2, the phone's battery being
 * the budget (functional spec 9.2).
 */
@Injectable({ providedIn: 'root' })
export class ThreeRenderer {
  readonly canvas = inject(DOCUMENT).createElement('canvas');
  readonly scene = new THREE.Scene();
  /** The last size given to `resize`, in CSS pixels, for whoever sets a camera's aspect. */
  width = 1;
  height = 1;

  private readonly window = inject(DOCUMENT).defaultView as Window;
  private renderer: THREE.WebGLRenderer | null = null;

  constructor() {
    this.scene.background = new THREE.Color(SKY);
    this.scene.fog = new THREE.Fog(SKY, 30, 120);
  }

  /** CSS pixels; the device pixel ratio is applied here. */
  resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer?.setSize(this.width, this.height, false);
  }

  render(camera: THREE.Camera): void {
    this.ensure().render(this.scene, camera);
  }

  dispose(): void {
    this.renderer?.dispose();
    this.renderer = null;
  }

  private ensure(): THREE.WebGLRenderer {
    if (this.renderer) return this.renderer;
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    renderer.setPixelRatio(Math.min(this.window.devicePixelRatio, MAX_PIXEL_RATIO));
    renderer.setSize(this.width, this.height, false);
    renderer.shadowMap.enabled = true;
    this.renderer = renderer;
    return renderer;
  }
}
