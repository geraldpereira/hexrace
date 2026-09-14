import { Injectable, inject } from '@angular/core';
import { JoltConversions, JoltPhysics, LAYER_MOVING } from '@hexrace/engine';
import type Jolt from 'jolt-physics';

import { type CarSpec, type Transmission } from '@car/entity/car-spec';
import { type CarRig } from '@car/physics/car-rig';
import { type Point3, type QuatMut } from '@car/entity/vectors';

const AXLES: readonly (readonly [number, number])[] = [
  [0, 1],
  [2, 3],
];
const FRONT_SHARE: Readonly<Record<Transmission, number>> = { front: 1, rear: 0, all: 0.5 };

/**
 * Builds the car Jolt runs: a box body with an offset centre of mass, a `VehicleConstraint` with
 * four `WheelSettingsWV`, two anti-roll bars and a `WheeledVehicleController` whose engine and
 * gearbox come straight from the spec (technical spec 4.1). The transmission picks the torque
 * share of each axle; an axle at zero gets no differential at all, so the engine never sees it.
 */
@Injectable({ providedIn: 'root' })
export class CarBodies {
  private readonly physics = inject(JoltPhysics);
  private readonly conversions = inject(JoltConversions);

  create(spec: CarSpec, position: Point3, rotation: QuatMut): CarRig {
    const Jolt = this.physics.Jolt;
    const body = this.chassis(spec, position, rotation);
    const settings = new Jolt.VehicleConstraintSettings();
    settings.mWheels.clear();
    for (const wheel of this.wheelSettings(spec)) settings.mWheels.push_back(wheel);
    settings.mAntiRollBars.clear();
    for (const [left, right] of AXLES) {
      const bar = new Jolt.VehicleAntiRollBar();
      bar.mLeftWheel = left;
      bar.mRightWheel = right;
      bar.mStiffness = spec.wheels.antiRollStiffness;
      settings.mAntiRollBars.push_back(bar);
    }
    settings.mController = this.controllerSettings(spec);
    const constraint = new Jolt.VehicleConstraint(body, settings);
    constraint.SetVehicleCollisionTester(
      new Jolt.VehicleCollisionTesterCastCylinder(LAYER_MOVING, 1),
    );
    this.physics.physicsSystem.AddConstraint(constraint);
    const listener = new Jolt.VehicleConstraintStepListener(constraint);
    this.physics.physicsSystem.AddStepListener(listener);
    const controller = Jolt.castObject(constraint.GetController(), Jolt.WheeledVehicleController);
    const wheels = [0, 1, 2, 3].map((i: number) =>
      Jolt.castObject(constraint.GetWheel(i), Jolt.WheelWV),
    );
    return { body, constraint, controller, wheels, listener };
  }

  /** Takes the constraint out of the world and frees the body; the rig is dead after this. */
  destroy(rig: CarRig): void {
    this.physics.physicsSystem.RemoveStepListener(rig.listener);
    this.physics.physicsSystem.RemoveConstraint(rig.constraint);
    this.physics.unregister(rig.body);
  }

  private chassis(spec: CarSpec, position: Point3, rotation: QuatMut): Jolt.Body {
    const Jolt = this.physics.Jolt;
    const c = spec.chassis;
    const box = new Jolt.BoxShapeSettings(
      this.conversions.vec3({ x: c.halfWidth, y: c.halfHeight, z: c.halfLength }),
    );
    const offset = new Jolt.OffsetCenterOfMassShapeSettings(
      this.conversions.vec3({ x: c.comX, y: c.comY, z: c.comZ }),
      box,
    );
    const settings = new Jolt.BodyCreationSettings(
      offset.Create().Get(),
      this.conversions.rvec3(position),
      new Jolt.Quat(rotation.x, rotation.y, rotation.z, rotation.w),
      Jolt.EMotionType_Dynamic,
      LAYER_MOVING,
    );
    settings.mOverrideMassProperties = Jolt.EOverrideMassProperties_CalculateInertia;
    settings.mMassPropertiesOverride.mMass = c.mass;
    const body = this.physics.bodyInterface.CreateBody(settings);
    this.physics.bodyInterface.AddBody(body.GetID(), Jolt.EActivation_Activate);
    Jolt.destroy(settings);
    return body;
  }

  private wheelSettings(spec: CarSpec): Jolt.WheelSettingsWV[] {
    const Jolt = this.physics.Jolt;
    const w = spec.wheels;
    const x = spec.chassis.halfWidth + w.width / 2;
    const places = [
      { x: -x, z: w.frontZ, steer: true },
      { x, z: w.frontZ, steer: true },
      { x: -x, z: w.backZ, steer: false },
      { x, z: w.backZ, steer: false },
    ];
    return places.map((place: { x: number; z: number; steer: boolean }) => {
      const wheel = new Jolt.WheelSettingsWV();
      wheel.mPosition = this.conversions.vec3({ x: place.x, y: w.attachY, z: place.z });
      wheel.mMaxSteerAngle = place.steer ? (spec.steering.maxAtRestDeg * Math.PI) / 180 : 0;
      wheel.mRadius = w.radius;
      wheel.mWidth = w.width;
      wheel.mSuspensionMinLength = w.suspensionMin;
      wheel.mSuspensionMaxLength = w.suspensionMax;
      wheel.mSuspensionSpring.mFrequency = w.suspensionFrequency;
      wheel.mSuspensionSpring.mDamping = w.suspensionDamping;
      wheel.mMaxBrakeTorque = place.steer ? w.frontBrakeTorque : w.backBrakeTorque;
      wheel.mMaxHandBrakeTorque = place.steer ? 0 : w.handBrakeTorque;
      return wheel;
    });
  }

  private controllerSettings(spec: CarSpec): Jolt.WheeledVehicleControllerSettings {
    const Jolt = this.physics.Jolt;
    const settings = new Jolt.WheeledVehicleControllerSettings();
    const engine = settings.mEngine;
    engine.mMaxTorque = spec.engine.maxTorque;
    engine.mMinRPM = spec.engine.minRpm;
    engine.mMaxRPM = spec.engine.maxRpm;
    engine.mInertia = spec.engine.inertia;
    engine.mAngularDamping = spec.engine.angularDamping;
    engine.mNormalizedTorque.Clear();
    for (const p of spec.engine.torqueCurve) engine.mNormalizedTorque.AddPoint(p.x, p.y);
    engine.mNormalizedTorque.Sort();
    this.gearbox(settings.mTransmission, spec);
    settings.mDifferentialLimitedSlipRatio = spec.limitedSlipRatio;
    settings.mDifferentials.clear();
    const front = FRONT_SHARE[spec.transmission];
    for (const [axle, [left, right]] of AXLES.entries()) {
      const share = axle === 0 ? front : 1 - front;
      if (share === 0) continue;
      const diff = new Jolt.VehicleDifferentialSettings();
      diff.mLeftWheel = left;
      diff.mRightWheel = right;
      diff.mEngineTorqueRatio = share;
      diff.mLimitedSlipRatio = spec.limitedSlipRatio;
      settings.mDifferentials.push_back(diff);
    }
    return settings;
  }

  private gearbox(transmission: Jolt.VehicleTransmissionSettings, spec: CarSpec): void {
    const Jolt = this.physics.Jolt;
    const box = spec.gearbox;
    transmission.mMode = Jolt.ETransmissionMode_Auto;
    const gears = new Jolt.ArrayFloat();
    for (const ratio of box.ratios) gears.push_back(ratio);
    transmission.mGearRatios = gears;
    const reverse = new Jolt.ArrayFloat();
    reverse.push_back(box.reverseRatio);
    transmission.mReverseGearRatios = reverse;
    transmission.mShiftDownRPM = box.shiftDownRpm;
    transmission.mShiftUpRPM = box.shiftUpRpm;
    transmission.mSwitchTime = box.switchTime;
    transmission.mClutchReleaseTime = box.clutchReleaseTime;
    transmission.mSwitchLatency = box.switchLatency;
    transmission.mClutchStrength = box.clutchStrength;
  }
}
