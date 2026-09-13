import * as THREE from 'three';

import { Component } from '@engine/scene/game-object';

const FOV = 60;
const NEAR = 0.1;
const FAR = 500;

/** The camera the scene renders through; the camera module will drive its transform. */
export class CameraComponent extends Component {
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, NEAR, FAR);

  /** Keeps the projection right when the canvas changes shape. */
  setAspect(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }
}
