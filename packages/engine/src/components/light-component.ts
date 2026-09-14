import { inject } from '@angular/core';
import * as THREE from 'three';

import { ThreeRenderer } from '@engine/render/three-renderer';
import { Component } from '@engine/scene/component';

/**
 * A sun: one directional light casting shadows, with its target in the scene so three keeps the
 * shadow camera oriented, plus a soft ambient fill.
 */
export class LightComponent extends Component {
  readonly sun = new THREE.DirectionalLight(0xffffff, 2.5);
  readonly ambient = new THREE.AmbientLight(0xffffff, 0.4);

  private readonly renderer = inject(ThreeRenderer);

  override awake(): void {
    this.sun.castShadow = true;
    this.sun.position.set(20, 40, 10);
    this.renderer.scene.add(this.sun, this.sun.target, this.ambient);
  }

  override onDestroy(): void {
    this.renderer.scene.remove(this.sun, this.sun.target, this.ambient);
  }
}
