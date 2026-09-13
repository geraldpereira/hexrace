import type * as THREE from 'three';

import { LAYER_MOVING, LAYER_NON_MOVING, type JoltBody, type JoltPhysics } from '@hexrace/engine';

/** A box body: half extents and centre in metres, static ground or moving crate. */
export interface BoxSpec {
  readonly half: THREE.Vector3;
  readonly position: THREE.Vector3;
  readonly moving: boolean;
}

/** Creates the body and adds it to the world, active; the showcase's only shape. */
export function boxBody(physics: JoltPhysics, spec: BoxSpec): JoltBody {
  const Jolt = physics.Jolt;
  const shape = new Jolt.BoxShape(new Jolt.Vec3(spec.half.x, spec.half.y, spec.half.z));
  const settings = new Jolt.BodyCreationSettings(
    shape,
    new Jolt.RVec3(spec.position.x, spec.position.y, spec.position.z),
    Jolt.Quat.prototype.sIdentity(),
    spec.moving ? Jolt.EMotionType_Dynamic : Jolt.EMotionType_Static,
    spec.moving ? LAYER_MOVING : LAYER_NON_MOVING,
  );
  const body = physics.bodyInterface.CreateBody(settings);
  Jolt.destroy(settings);
  physics.bodyInterface.AddBody(body.GetID(), Jolt.EActivation_Activate);
  return body;
}
