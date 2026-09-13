import { inject } from '@angular/core';
import { CameraComponent, Component } from '@hexrace/engine';
import * as THREE from 'three';

import { type CameraTarget } from '@camera/entity/camera-target';
import { CameraTuning } from '@camera/entity/camera-tuning';
import { solveRig } from '@camera/entity/rig';

/**
 * Drives the sibling CameraComponent after a `target` (functional spec 3.9): every frame the rig is
 * solved from the target and the tuning, then eye and aim ease towards it at `smoothing` per
 * second, so a spin of the car does not whip the view. The first frame, and `snap`, jump at once.
 * Set `target` before the scene starts.
 */
export class FollowCamera extends Component {
  target!: CameraTarget;

  private readonly tuning = inject(CameraTuning);
  private readonly eye = new THREE.Vector3();
  private readonly aim = new THREE.Vector3();
  private camera!: THREE.PerspectiveCamera;
  private settled = false;

  override start(): void {
    this.camera = this.gameObject.getOrThrow(CameraComponent).camera;
  }

  /** Jumps to the solved pose: spawn, reset, teleport. */
  snap(): void {
    const pose = solveRig(this.target, this.tuning);
    this.eye.copy(pose.eye);
    this.aim.copy(pose.aim);
    this.settled = true;
    this.apply();
  }

  override render(dt: number): void {
    if (!this.settled) {
      this.snap();
      return;
    }
    const pose = solveRig(this.target, this.tuning);
    const k = 1 - Math.exp(-this.tuning.smoothing * dt);
    this.eye.lerp(pose.eye, k);
    this.aim.lerp(pose.aim, k);
    this.apply();
  }

  private apply(): void {
    this.camera.position.copy(this.eye);
    this.camera.lookAt(this.aim);
  }
}
