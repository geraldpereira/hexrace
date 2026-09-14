import { DestroyRef, inject } from '@angular/core';
import { CameraComponent } from '@hexrace/engine';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { PhysicsLab } from '@ui/lab/lab-scene';

/**
 * A showcase looked at from a free camera: the eye of the scene, the orbit controls over the
 * canvas and a frame that turns the controls and renders. A page built on this places the camera,
 * calls `load` from its own `ngOnInit` and builds its scene in `start`.
 */
export abstract class OrbitLab extends PhysicsLab {
  protected readonly eye = this.scene.spawn('camera', CameraComponent).getOrThrow(CameraComponent);
  protected readonly controls = new OrbitControls(this.eye.camera, this.canvas);

  constructor() {
    super();
    this.camera = this.eye;
    inject(DestroyRef).onDestroy(() => {
      this.controls.dispose();
    });
  }

  protected render(dt: number): void {
    this.frame(dt);
    this.controls.update();
    this.renderer.render(this.eye.camera);
  }
}
