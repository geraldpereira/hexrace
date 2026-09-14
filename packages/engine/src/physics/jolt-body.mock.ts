import {
  type JoltBody,
  type JoltPhysics,
  LAYER_MOVING,
  LAYER_NON_MOVING,
} from '@engine/physics/jolt-physics';

export interface BoxBodyOptions {
  readonly half: { readonly x: number; readonly y: number; readonly z: number };
  readonly y: number;
  readonly moving: boolean;
  readonly activate?: boolean;
}

export function boxBodyAt(physics: JoltPhysics, options: BoxBodyOptions): JoltBody {
  const Jolt = physics.Jolt;
  const { half } = options;
  const settings = new Jolt.BodyCreationSettings(
    new Jolt.BoxShape(new Jolt.Vec3(half.x, half.y, half.z)),
    new Jolt.RVec3(0, options.y, 0),
    Jolt.Quat.prototype.sIdentity(),
    options.moving ? Jolt.EMotionType_Dynamic : Jolt.EMotionType_Static,
    options.moving ? LAYER_MOVING : LAYER_NON_MOVING,
  );
  const body = physics.bodyInterface.CreateBody(settings);
  Jolt.destroy(settings);
  const activation =
    options.activate === false ? Jolt.EActivation_DontActivate : Jolt.EActivation_Activate;
  physics.bodyInterface.AddBody(body.GetID(), activation);
  return body;
}
