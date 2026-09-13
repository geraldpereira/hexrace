import { inject } from '@angular/core';
import type * as THREE from 'three';

import { ThreeRenderer } from '@engine/render/three-renderer';
import { Component } from '@engine/scene/game-object';

/** Puts an Object3D in the renderer's scene while its GameObject lives; set `object` before adding. */
export class MeshComponent extends Component {
  object!: THREE.Object3D;

  private readonly renderer = inject(ThreeRenderer);

  override awake(): void {
    this.renderer.scene.add(this.object);
  }

  override onDestroy(): void {
    this.renderer.scene.remove(this.object);
  }
}
