import { Injectable, inject } from '@angular/core';
import { JoltPhysics, type JoltVec3 } from '@hexrace/engine';

import { type CarPose, type WheelContact } from '@car/entity/car-readout';
import { type CarRig } from '@car/physics/car-rig';

/**
 * Where the car's meshes go: the chassis in world space, each wheel in the chassis' frame as the
 * constraint places it, lifted by the grain bump so a wheel visibly rides over ground the
 * collider does not carry. The two reference vectors Jolt wants match a cylinder on its +Y axis,
 * three.js's own, so the wheel mesh needs no rotation of its own.
 */
@Injectable({ providedIn: 'root' })
export class CarPoses {
  private readonly physics = inject(JoltPhysics);
  private right: JoltVec3 | null = null;
  private up: JoltVec3 | null = null;

  /** An empty pose with one slot per wheel, for a controller to fill each frame. */
  create(wheels: number): CarPose {
    return {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      wheels: Array.from({ length: wheels }, () => ({
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      })),
    };
  }

  read(rig: CarRig, contacts: readonly WheelContact[], into: CarPose): void {
    const p = rig.body.GetPosition();
    into.position.x = p.GetX();
    into.position.y = p.GetY();
    into.position.z = p.GetZ();
    const q = rig.body.GetRotation();
    into.rotation.x = q.GetX();
    into.rotation.y = q.GetY();
    into.rotation.z = q.GetZ();
    into.rotation.w = q.GetW();
    this.right ??= new this.physics.Jolt.Vec3(0, 1, 0);
    this.up ??= new this.physics.Jolt.Vec3(1, 0, 0);
    for (const [i, wheel] of into.wheels.entries()) {
      const transform = rig.constraint.GetWheelLocalTransform(i, this.right, this.up);
      const t = transform.GetTranslation();
      wheel.position.x = t.GetX();
      wheel.position.y = t.GetY() + (contacts[i]?.bump ?? 0);
      wheel.position.z = t.GetZ();
      const r = transform.GetRotation().GetQuaternion();
      wheel.rotation.x = r.GetX();
      wheel.rotation.y = r.GetY();
      wheel.rotation.z = r.GetZ();
      wheel.rotation.w = r.GetW();
    }
  }
}
