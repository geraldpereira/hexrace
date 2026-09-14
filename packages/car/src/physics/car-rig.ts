import type Jolt from 'jolt-physics';
import { type JoltBody } from '@hexrace/engine';

/**
 * The Jolt side of one car: the chassis body, the vehicle constraint and its wheeled controller,
 * the four wheels kept at hand because every step reads and writes their settings, and the step
 * listener the constraint needs, held so it can be taken out again. Built and freed by
 * `CarBodies`; nothing else creates one.
 */
export interface CarRig {
  readonly body: JoltBody;
  readonly constraint: Jolt.VehicleConstraint;
  readonly controller: Jolt.WheeledVehicleController;
  readonly wheels: readonly Jolt.WheelWV[];
  readonly listener: Jolt.PhysicsStepListener;
}
