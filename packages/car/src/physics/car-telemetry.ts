import { Injectable, inject } from '@angular/core';
import type Jolt from 'jolt-physics';

import { EngineModel } from '@car/drive/engine-model';
import { Drivetrain } from '@car/drive/drivetrain';
import { type CarSpec } from '@car/entity/car-spec';
import { type CarState } from '@car/entity/car-state';
import { type GearboxState } from '@car/entity/gearbox-state';
import { type CarRig } from '@car/physics/car-rig';

/** What the driver asked for this step, after the response curves and the assists. */
export interface DriverInput {
  forward: number;
  brake: number;
  steer: number;
  handBrake: number;
}

/**
 * Reads the car back out of Jolt into the snapshot everything else follows: revs and their
 * limits, gear and clutch, whether the box is between two ratios and whether the ignition is
 * being chopped, and whether any wheel still touches. It writes the state and nothing else; the
 * controller compares the gear before and after to know a change happened.
 */
@Injectable({ providedIn: 'root' })
export class CarTelemetry {
  private readonly engine = inject(EngineModel);
  private readonly drivetrain = inject(Drivetrain);

  read(
    rig: CarRig,
    state: CarState,
    spec: CarSpec,
    input: DriverInput,
    gearbox: GearboxState,
    manual: boolean,
  ): void {
    state.throttle = Math.abs(input.forward);
    state.brake = input.brake;
    state.steer = input.steer;
    state.handBrake = input.handBrake;
    const engine = rig.controller.GetEngine();
    state.rpm = engine.GetCurrentRPM();
    state.maxRpm = engine.get_mMaxRPM();
    state.minRpm = engine.get_mMinRPM();
    const transmission = rig.controller.GetTransmission();
    state.shiftUpRpm = transmission.get_mShiftUpRPM();
    state.gear = transmission.GetCurrentGear();
    state.clutch = transmission.GetClutchFriction();
    state.shifting = manual
      ? gearbox.age < transmission.get_mSwitchTime()
      : transmission.IsSwitchingGear();
    const share = this.engine.revShare(state.rpm, state.maxRpm);
    state.limiter = this.engine.onLimiter(share, state.throttle, state.shifting);
    const top = this.drivetrain.topGear(spec.gearbox.ratios);
    state.shiftHint = manual && this.engine.shiftHint(state.rpm, state.shiftUpRpm, state.gear, top);
    state.airborne = !rig.wheels.some((wheel: Jolt.WheelWV) => wheel.HasContact());
  }
}
