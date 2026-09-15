import { Injectable, inject } from '@angular/core';
import { JoltPhysics } from '@hexrace/engine';
import { type Swell } from '@hexrace/tile';
import type Jolt from 'jolt-physics';

import { type WheelContact } from '@car/entity/car-readout';
import { type SurfaceFeel } from '@car/entity/surface-feel';
import { type Vec3Mut } from '@car/entity/vectors';
import { type CarRig } from '@car/physics/car-rig';

const RAD_TO_DEG = 180 / Math.PI;

/**
 * What each wheel reports after a step: slips, contact frame, suspension speed. Jolt's own cast
 * gives it all, one step stale, which is invisible at 60 Hz for marks, dust and sound. The slip
 * speed is the tyre's surface against the ground along the rolling direction, in m/s: unlike the
 * slip ratio it does not flap at a standstill, so it is what the marks key on.
 */
@Injectable({ providedIn: 'root' })
export class WheelContacts {
  private readonly physics = inject(JoltPhysics);

  /** One contact per wheel, resting on `feel` and its `swell` until the ground says otherwise. */
  create(wheels: number, feel: SurfaceFeel, swell: Swell): WheelContact[] {
    return Array.from({ length: wheels }, () => ({
      contact: false,
      surface: feel,
      swell,
      longitudinalSlip: 0,
      lateralSlipDeg: 0,
      slipSpeed: 0,
      suspensionVelocity: 0,
      hardHit: false,
      width: 0,
      bump: 0,
      point: { x: 0, y: 0, z: 0 },
      normal: { x: 0, y: 1, z: 0 },
      lateral: { x: 1, y: 0, z: 0 },
      longitudinal: { x: 0, y: 0, z: 1 },
    }));
  }

  read(rig: CarRig, into: readonly WheelContact[], lengths: number[], dt: number): void {
    for (const [i, wheel] of rig.wheels.entries()) {
      const contact = into[i];
      if (!contact) continue;
      contact.longitudinalSlip = wheel.get_mLongitudinalSlip();
      contact.lateralSlipDeg = wheel.get_mLateralSlip() * RAD_TO_DEG;
      contact.width = wheel.GetSettings().mWidth;
      const length = wheel.GetSuspensionLength();
      const previous = lengths[i];
      contact.suspensionVelocity = previous === undefined ? 0 : (length - previous) / dt;
      lengths[i] = length;
      contact.hardHit = wheel.HasHitHardPoint();
      contact.contact = wheel.HasContact();
      contact.slipSpeed = contact.contact ? this.frame(rig, wheel, contact) : 0;
    }
  }

  private frame(rig: CarRig, wheel: Jolt.WheelWV, into: WheelContact): number {
    const point = wheel.GetContactPosition();
    this.copy(into.point, point.GetX(), point.GetY(), point.GetZ());
    const normal = wheel.GetContactNormal();
    this.copy(into.normal, normal.GetX(), normal.GetY(), normal.GetZ());
    const lateral = wheel.GetContactLateral();
    this.copy(into.lateral, lateral.GetX(), lateral.GetY(), lateral.GetZ());
    const along = wheel.GetContactLongitudinal();
    this.copy(into.longitudinal, along.GetX(), along.GetY(), along.GetZ());
    const car = this.physics.bodyInterface.GetPointVelocity(rig.body.GetID(), point);
    const ground = wheel.GetContactPointVelocity();
    const relative =
      (car.GetX() - ground.GetX()) * along.GetX() +
      (car.GetY() - ground.GetY()) * along.GetY() +
      (car.GetZ() - ground.GetZ()) * along.GetZ();
    return Math.abs(wheel.GetAngularVelocity() * wheel.GetSettings().mRadius - relative);
  }

  private copy(target: Vec3Mut, x: number, y: number, z: number): void {
    target.x = x;
    target.y = y;
    target.z = z;
  }
}
