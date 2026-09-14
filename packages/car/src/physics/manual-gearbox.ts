import { Injectable, inject } from '@angular/core';
import { FIXED_TIMESTEP, JoltPhysics } from '@hexrace/engine';

import { Drivetrain } from '@car/drive/drivetrain';
import { type GearboxSpec } from '@car/entity/car-spec';
import { type GearboxState } from '@car/entity/gearbox-state';
import { type CarRig } from '@car/physics/car-rig';

/**
 * The manual gearbox of the POC's debug option, the game itself staying automatic (3.3). Jolt
 * does nothing on its own in manual mode, so the gear and the clutch are driven from here: the
 * bumpers step from reverse through neutral to the top gear, and the clutch opens for the switch
 * time then comes back linearly. Switching the mode back hands the box to Jolt again.
 */
@Injectable({ providedIn: 'root' })
export class ManualGearbox {
  private readonly physics = inject(JoltPhysics);
  private readonly drivetrain = inject(Drivetrain);

  /** Runs one step of the box; `manual` off only puts Jolt back in charge. */
  step(
    rig: CarRig,
    state: GearboxState,
    spec: GearboxSpec,
    manual: boolean,
    up: boolean,
    down: boolean,
  ): void {
    const transmission = rig.controller.GetTransmission();
    const upEdge = up && !state.wasUp;
    const downEdge = down && !state.wasDown;
    state.wasUp = up;
    state.wasDown = down;
    const Jolt = this.physics.Jolt;
    if (!manual) {
      transmission.set_mMode(Jolt.ETransmissionMode_Auto);
      state.age = Number.POSITIVE_INFINITY;
      return;
    }
    transmission.set_mMode(Jolt.ETransmissionMode_Manual);
    const top = this.drivetrain.topGear(spec.ratios);
    const wanted = this.drivetrain.stepGear(state.gear, upEdge, downEdge, top);
    if (wanted === state.gear) state.age += FIXED_TIMESTEP;
    else {
      state.gear = wanted;
      state.age = 0;
    }
    const clutch = this.drivetrain.manualClutch(
      state.gear,
      state.age,
      spec.switchTime,
      spec.clutchReleaseTime,
    );
    transmission.Set(state.gear, clutch);
  }
}
