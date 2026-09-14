import { Injectable, inject } from '@angular/core';

import {
  type JoltQuat,
  type JoltRVec3,
  type JoltVec3,
  JoltPhysics,
} from '@engine/physics/jolt-physics';

/** Three numbers, whatever the class that carries them: a three.js vector, a commons one, a literal. */
export interface Vec3Like {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface QuatLike extends Vec3Like {
  readonly w: number;
}

/**
 * The one place the game turns its vectors into Jolt's and back. What `vec3`, `rvec3` and
 * `identity` allocate lives on the wasm heap: the caller hands it to `Jolt.destroy` once Jolt has
 * copied it, as Jolt's shape and body settings do.
 */
@Injectable({ providedIn: 'root' })
export class JoltConversions {
  private readonly physics = inject(JoltPhysics);

  vec3(v: Vec3Like): JoltVec3 {
    return new this.physics.Jolt.Vec3(v.x, v.y, v.z);
  }

  rvec3(v: Vec3Like): JoltRVec3 {
    return new this.physics.Jolt.RVec3(v.x, v.y, v.z);
  }

  identity(): JoltQuat {
    return this.physics.Jolt.Quat.prototype.sIdentity();
  }

  read(v: JoltVec3 | JoltRVec3): Vec3Like {
    return { x: v.GetX(), y: v.GetY(), z: v.GetZ() };
  }

  readQuat(q: JoltQuat): QuatLike {
    return { x: q.GetX(), y: q.GetY(), z: q.GetZ(), w: q.GetW() };
  }
}
