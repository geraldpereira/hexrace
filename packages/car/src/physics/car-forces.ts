import { Injectable, inject } from '@angular/core';
import type Jolt from 'jolt-physics';
import { JoltPhysics, type JoltRVec3, type JoltVec3 } from '@hexrace/engine';

import { Grain } from '@car/drive/grain';
import { type WheelContact } from '@car/entity/car-readout';
import { type CarSpec } from '@car/entity/car-spec';
import { type WingOption, type YawDampingOption } from '@car/entity/car-options';
import { ChassisAxes } from '@car/physics/chassis-axes';
import { type CarRig } from '@car/physics/car-rig';

const GRAVITY = 9.81;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Everything the car pushes on itself beyond the tyres (POC 1): the surface drag and the grain,
 * the yaw damping that opposes a spin without touching pitch and roll, and the wing's downforce
 * along the chassis' own down axis, applied between the axles so a rear wing loads the rear. The
 * grain and the swell are read at each wheel's own contact point, and their bump goes into the
 * suspension preload, where a force of that frequency would do nothing.
 */
@Injectable({ providedIn: 'root' })
export class CarForces {
  private readonly physics = inject(JoltPhysics);
  private readonly axes = inject(ChassisAxes);
  private readonly grain = inject(Grain);
  private force: JoltVec3 | null = null;
  private point: JoltRVec3 | null = null;

  /** Drag and grain at every wheel in contact; true when anything was applied. */
  surface(
    rig: CarRig,
    contacts: readonly WheelContact[],
    grain: boolean,
    mass: number,
    speed: number,
  ): boolean {
    const velocity = rig.body.GetLinearVelocity();
    const load = (mass * GRAVITY) / rig.wheels.length;
    let applied = false;
    for (const [i, wheel] of rig.wheels.entries()) {
      const contact = contacts[i];
      if (!contact?.contact) continue;
      const feel = contact.surface;
      let fx = -feel.drag * velocity.GetX();
      let fz = -feel.drag * velocity.GetZ();
      const where = wheel.GetContactPosition();
      const x = where.GetX();
      const z = where.GetZ();
      const bump = grain ? this.grain.bump(feel, contact.swell, x, z) : 0;
      if (grain) {
        const side = this.grain.lateral(feel, x, z, load, speed);
        const lateral = wheel.GetContactLateral();
        fx += side * lateral.GetX();
        fz += side * lateral.GetZ();
      }
      if (bump !== contact.bump) {
        contact.bump = bump;
        wheel.GetSettings().mSuspensionPreloadLength = bump;
        applied = true;
      }
      if (fx === 0 && fz === 0) continue;
      this.scratch().Set(fx, 0, fz);
      rig.body.AddForce(this.scratch(), wheel.GetContactPosition());
      applied = true;
    }
    return applied;
  }

  /** Damps the yaw rate while a wheel touches; returns the rate in °/s, damped or not. */
  yawDamping(rig: CarRig, option: YawDampingOption, inertia: number): number {
    const up = this.axes.up(rig.body);
    const w = rig.body.GetAngularVelocity();
    const rate = up.x * w.GetX() + up.y * w.GetY() + up.z * w.GetZ();
    const grounded = rig.wheels.some((wheel: Jolt.WheelWV) => wheel.HasContact());
    if (option.enabled && option.damping !== 0 && rate !== 0 && grounded) {
      const torque = -option.damping * inertia * rate;
      this.scratch().Set(up.x * torque, up.y * torque, up.z * torque);
      rig.body.AddTorque(this.scratch());
    }
    return rate * RAD_TO_DEG;
  }

  /** The wing's push, growing with the square of the speed; returns it as a % of the weight. */
  downforce(rig: CarRig, spec: CarSpec, wing: WingOption, speed: number, mass: number): number {
    const force = wing.enabled ? wing.coefficient * speed * speed : 0;
    if (force !== 0) {
      const up = this.axes.up(rig.body);
      const forward = this.axes.forward(rig.body);
      const t = (wing.balance + 1) / 2;
      const z = spec.wheels.backZ + (spec.wheels.frontZ - spec.wheels.backZ) * t;
      const position = rig.body.GetPosition();
      this.at().Set(
        position.GetX() + forward.x * z,
        position.GetY() + forward.y * z,
        position.GetZ() + forward.z * z,
      );
      this.scratch().Set(-up.x * force, -up.y * force, -up.z * force);
      rig.body.AddForce(this.scratch(), this.at());
    }
    return (100 * force) / (mass * GRAVITY);
  }

  private scratch(): JoltVec3 {
    this.force ??= new this.physics.Jolt.Vec3(0, 0, 0);
    return this.force;
  }

  private at(): JoltRVec3 {
    this.point ??= new this.physics.Jolt.RVec3(0, 0, 0);
    return this.point;
  }
}
