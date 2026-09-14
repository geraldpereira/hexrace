import { Injectable } from '@angular/core';
import { type JoltBody } from '@hexrace/engine';

import { type Point3, type QuatMut } from '@car/entity/vectors';

/**
 * The chassis' own axes in world space, read from its rotation quaternion: the columns of the
 * rotation matrix, without going through a matrix. +Z is the nose, +Y the roof. Every force the
 * car applies to itself, and its heading for the camera, is expressed along one of them.
 */
@Injectable({ providedIn: 'root' })
export class ChassisAxes {
  up(body: JoltBody): Point3 {
    const { x, y, z, w } = this.rotation(body);
    return { x: 2 * (x * y - w * z), y: 1 - 2 * (x * x + z * z), z: 2 * (y * z + w * x) };
  }

  forward(body: JoltBody): Point3 {
    const { x, y, z, w } = this.rotation(body);
    return { x: 2 * (x * z + w * y), y: 2 * (y * z - w * x), z: 1 - 2 * (x * x + y * y) };
  }

  /** Signed speed along the nose, in m/s: negative means the car is going backwards. */
  forwardSpeed(body: JoltBody): number {
    const f = this.forward(body);
    const v = body.GetLinearVelocity();
    return f.x * v.GetX() + f.y * v.GetY() + f.z * v.GetZ();
  }

  private rotation(body: JoltBody): QuatMut {
    const q = body.GetRotation();
    return { x: q.GetX(), y: q.GetY(), z: q.GetZ(), w: q.GetW() };
  }

  /** Yaw in radians, 0 along +Z and growing towards +X: what a `CameraTarget` calls heading. */
  heading(body: JoltBody): number {
    const f = this.forward(body);
    return Math.atan2(f.x, f.z);
  }
}
