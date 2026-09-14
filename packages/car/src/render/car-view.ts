import { inject } from '@angular/core';
import { GameComponent, ThreeRenderer } from '@hexrace/engine';

import { type CarReadout } from '@car/entity/car-readout';
import { type CarSpec } from '@car/entity/car-spec';
import { DEFAULT_CAR_SPEC } from '@car/entity/car-defaults';
import { type CarMeshSet, CarMeshes } from '@car/render/car-meshes';

/**
 * The car on screen: it builds the meshes from the spec, hangs them in the renderer's scene and,
 * every frame, copies the pose the physics wrote. It reads a `CarReadout` and nothing else, which
 * is why `render/` never has to know `physics/` (technical spec 2.1). The centre of mass marker
 * is hidden until the panel asks for it. Set `readout` and `spec` before adding.
 */
export class CarView extends GameComponent {
  readout!: CarReadout;
  spec: CarSpec = DEFAULT_CAR_SPEC;

  private readonly renderer = inject(ThreeRenderer);
  private readonly meshes = inject(CarMeshes);
  private set: CarMeshSet | null = null;

  /** The centre of mass marker, red, off by default; the mass and balance folder shows it. */
  get showCentreOfMass(): boolean {
    return this.set?.marker.visible ?? false;
  }

  set showCentreOfMass(visible: boolean) {
    if (this.set) this.set.marker.visible = visible;
  }

  override awake(): void {
    this.set = this.meshes.build(this.spec, this.readout.pose.wheels.length);
    this.renderer.scene.add(this.set.group);
  }

  override render(): void {
    const set = this.set;
    if (!set) return;
    const pose = this.readout.pose;
    set.group.position.set(pose.position.x, pose.position.y, pose.position.z);
    set.group.quaternion.set(pose.rotation.x, pose.rotation.y, pose.rotation.z, pose.rotation.w);
    for (const [i, wheel] of set.wheels.entries()) {
      const at = pose.wheels[i];
      if (!at) continue;
      wheel.position.set(at.position.x, at.position.y, at.position.z);
      wheel.quaternion.set(at.rotation.x, at.rotation.y, at.rotation.z, at.rotation.w);
    }
  }

  override onDestroy(): void {
    if (!this.set) return;
    this.renderer.scene.remove(this.set.group);
    this.meshes.dispose(this.set);
    this.set = null;
  }
}
