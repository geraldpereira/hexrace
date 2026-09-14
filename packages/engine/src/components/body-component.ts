import { inject } from '@angular/core';
import * as THREE from 'three';

import { MeshComponent } from '@engine/components/mesh-component';
import { GameLoop } from '@engine/loop/game-loop';
import { JoltConversions } from '@engine/physics/jolt-conversions';
import { JoltPhysics, type JoltBody } from '@engine/physics/jolt-physics';
import { GameComponent } from '@engine/scene/game-component';

interface Pose {
  readonly position: THREE.Vector3;
  readonly rotation: THREE.Quaternion;
}

/**
 * Binds a Jolt body to its GameObject: contacts reach the components, the body is freed with the
 * object, and a sibling MeshComponent follows the body, interpolated between the last two steps
 * (technical spec 2.4). The scene's fixed update must run before the physics step, so that
 * `fixedUpdate` records the pose the step starts from. Set `body` before adding.
 */
export class BodyComponent extends GameComponent {
  body!: JoltBody;

  private readonly physics = inject(JoltPhysics);
  private readonly conversions = inject(JoltConversions);
  private readonly loop = inject(GameLoop);
  private readonly previous: Pose = {
    position: new THREE.Vector3(),
    rotation: new THREE.Quaternion(),
  };
  private readonly current: Pose = {
    position: new THREE.Vector3(),
    rotation: new THREE.Quaternion(),
  };

  override awake(): void {
    this.physics.register(this.body, this.gameObject);
    this.readPose(this.current);
    this.readPose(this.previous);
  }

  override fixedUpdate(): void {
    this.readPose(this.previous);
  }

  override render(): void {
    const mesh = this.gameObject.get(MeshComponent);
    if (!mesh) return;
    this.readPose(this.current);
    mesh.object.position.lerpVectors(
      this.previous.position,
      this.current.position,
      this.loop.alpha,
    );
    mesh.object.quaternion.slerpQuaternions(
      this.previous.rotation,
      this.current.rotation,
      this.loop.alpha,
    );
  }

  override onDestroy(): void {
    this.physics.unregister(this.body);
  }

  private readPose(into: Pose): void {
    const p = this.conversions.read(this.body.GetPosition());
    const q = this.conversions.readQuat(this.body.GetRotation());
    into.position.set(p.x, p.y, p.z);
    into.rotation.set(q.x, q.y, q.z, q.w);
  }
}
