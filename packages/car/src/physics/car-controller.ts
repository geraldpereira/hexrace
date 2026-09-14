import { inject } from '@angular/core';
import { type CameraTarget } from '@hexrace/camera';
import { EventBus } from '@hexrace/commons';
import { FIXED_TIMESTEP, GameComponent, type GameObject, JoltPhysics } from '@hexrace/engine';
import { Inputs } from '@hexrace/inputs';
import { clamp } from 'lodash-es';

import { Assists } from '@car/drive/assists';
import { Steering } from '@car/drive/steering';
import { Surfaces } from '@car/drive/surfaces';
import { DEFAULT_CAR_OPTIONS, DEFAULT_CAR_SPEC } from '@car/entity/car-defaults';
import { type CarOptions } from '@car/entity/car-options';
import { type CarPose, type CarReadout, type WheelContact } from '@car/entity/car-readout';
import { type CarSpec } from '@car/entity/car-spec';
import { type CarState, IDLE_CAR_STATE } from '@car/entity/car-state';
import { type GearboxState, IDLE_GEARBOX } from '@car/entity/gearbox-state';
import { type SurfaceProbe, type SurfaceQuery } from '@car/entity/surface-feel';
import { type Point3 } from '@car/entity/vectors';
import { CarBodies } from '@car/physics/car-bodies';
import { CarForces } from '@car/physics/car-forces';
import { CarPoses } from '@car/physics/car-poses';
import { CarTelemetry, type DriverInput } from '@car/physics/car-telemetry';
import { type CarRig } from '@car/physics/car-rig';
import { ChassisAxes } from '@car/physics/chassis-axes';
import { ManualGearbox } from '@car/physics/manual-gearbox';
import { WheelContacts } from '@car/physics/wheel-contacts';
import { WheelSurfaces } from '@car/physics/wheel-surfaces';

const WHEELS = 4;
const REAR = [2, 3];
const FRONT = [0, 1];
const DEG_TO_RAD = Math.PI / 180;
const REVERSE_SPEED = 0.5;
const IDLE_BRAKE = 0.2;
const IDLE_BRAKE_KMH = 5;
const RESET_SECONDS = 3;
const SPAWN_CLEARANCE = 1;

/**
 * The car, one fixed step at a time (POC 1): it reads the merged inputs, runs the assists, tells
 * Jolt's wheeled controller what the driver wants, keeps every wheel's friction on the surface a
 * `SurfaceProbe` finds under it, and adds the drag, the grain, the yaw damping and the wing.
 * Afterwards it fills the readout the HUD, the marks, the dust and the four sound layers follow,
 * and it is its own `CameraTarget`. Set `spec`, `options`, `probe` and `home` before adding it.
 */
export class CarController extends GameComponent implements CarReadout, CameraTarget {
  spec: CarSpec = structuredClone(DEFAULT_CAR_SPEC);
  options: CarOptions = structuredClone(DEFAULT_CAR_OPTIONS);
  /** Where the ground is read; without one the car drives on `defaultSurface` everywhere. */
  probe: SurfaceProbe | null = null;
  defaultSurface: SurfaceQuery = { environment: 'europe', zone: 'road', rank: 1 };
  home: Point3 = { x: 0, y: 0, z: 0 };
  homeHeading = 0;
  /** Held still by the countdown: the pedals and the wheel are ignored, the brakes stay full on. */
  frozen = false;
  /** The debug option of the POC: the game itself stays automatic (functional spec 3.3). */
  manualGearbox = false;
  grain = true;
  nextTile: Point3 | null = null;

  readonly state: CarState = { ...IDLE_CAR_STATE };
  readonly velocity = { x: 0, y: 0, z: 0 };

  private readonly inputs = inject(Inputs);
  private readonly bus = inject(EventBus);
  private readonly physics = inject(JoltPhysics);
  private readonly bodies = inject(CarBodies);
  private readonly forces = inject(CarForces);
  private readonly poses = inject(CarPoses);
  private readonly axes = inject(ChassisAxes);
  private readonly wheelContacts = inject(WheelContacts);
  private readonly wheelSurfaces = inject(WheelSurfaces);
  private readonly surfaces = inject(Surfaces);
  private readonly assists = inject(Assists);
  private readonly steering = inject(Steering);
  private readonly telemetry = inject(CarTelemetry);
  private readonly gearbox = inject(ManualGearbox);
  private readonly absState = { cut: 0 };
  private readonly tractionState = { cut: 0 };
  private readonly lengths: number[] = [];
  private readonly queries: (SurfaceQuery | null)[] = [];
  private dead = false;
  private rig!: CarRig;
  private contactList: WheelContact[] = [];
  private poseData: CarPose = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    wheels: [],
  };
  private travelled = 0;
  private rearScale = 1;
  private readonly gearboxState: GearboxState = { ...IDLE_GEARBOX };

  get contacts(): readonly WheelContact[] {
    return this.contactList;
  }

  get pose(): CarPose {
    return this.poseData;
  }

  get position(): Point3 {
    return this.poseData.position;
  }

  get heading(): number {
    return this.dead ? this.homeHeading : this.axes.heading(this.rig.body);
  }

  get speed(): number {
    return this.state.speedKmh / 3.6;
  }

  override awake(): void {
    const half = Math.sin(this.homeHeading / 2);
    const rotation = { x: 0, y: half, z: 0, w: Math.cos(this.homeHeading / 2) };
    const start = { x: this.home.x, y: this.home.y + SPAWN_CLEARANCE, z: this.home.z };
    const rig = this.bodies.create(this.spec, start, rotation);
    this.rig = rig;
    this.physics.register(rig.body, this.gameObject);
    this.contactList = this.wheelContacts.create(WHEELS, this.surfaces.feel(this.defaultSurface));
    this.poseData = this.poses.create(WHEELS);
    for (let i = 0; i < WHEELS; i++) this.applySurface(rig, i);
    this.poses.read(rig, this.contactList, this.poseData);
  }

  override fixedUpdate(): void {
    if (this.dead) return;
    const rig = this.rig;
    const dt = FIXED_TIMESTEP;
    const actions = this.inputs.actions;
    const forwardSpeed = this.axes.forwardSpeed(rig.body);
    const speedKmh = Math.abs(forwardSpeed) * 3.6;
    const drive = this.pedals(actions.throttle, actions.brake, forwardSpeed, speedKmh);
    const handBrake = actions.handBrake;
    this.gearbox.step(
      rig,
      this.gearboxState,
      this.spec.gearbox,
      this.manualGearbox,
      actions.gearUp > 0,
      actions.gearDown > 0,
    );
    this.limit(drive, speedKmh, dt);
    if (this.frozen) this.freeze(drive);
    const steer = this.frozen
      ? 0
      : this.steering.shape(actions.steer, this.spec.steering.steerResponse);
    this.applySteerAngle(rig, speedKmh);
    this.readGround(rig);
    this.applyRearScale(rig, handBrake > 0 ? this.spec.handBrakeLateralGrip : 1);
    this.travelled += Math.abs(forwardSpeed) * dt;
    const pushed = this.forces.surface(
      rig,
      this.contactList,
      this.travelled,
      this.grain,
      this.spec.chassis.mass,
      Math.abs(forwardSpeed),
    );
    this.aerodynamics(rig, forwardSpeed);
    rig.controller.SetDriverInput(drive.forward, steer, drive.brake, handBrake);
    if (pushed || drive.forward !== 0 || steer !== 0 || drive.brake !== 0 || handBrake !== 0) {
      this.physics.bodyInterface.ActivateBody(rig.body.GetID());
    }
    this.readState(rig, { ...drive, steer, handBrake }, forwardSpeed);
    this.wheelContacts.read(rig, this.contactList, this.lengths, dt);
    this.hold(actions.reset, dt);
  }

  override render(): void {
    if (!this.dead) this.poses.read(this.rig, this.contactList, this.poseData);
  }

  override onCollisionEnter(other: GameObject): void {
    this.bus.publish('car/collision', { speedKmh: this.state.speedKmh, other: other.name });
  }

  override onDestroy(): void {
    this.dead = true;
    this.bodies.destroy(this.rig);
  }

  /** Puts the car back at `home`, upright, facing `homeHeading` and stopped (functional spec 3.8). */
  reset(): void {
    if (this.dead) return;
    const rig = this.rig;
    const Jolt = this.physics.Jolt;
    const half = this.homeHeading / 2;
    const position = new Jolt.RVec3(this.home.x, this.home.y + SPAWN_CLEARANCE, this.home.z);
    const rotation = new Jolt.Quat(0, Math.sin(half), 0, Math.cos(half));
    const zero = new Jolt.Vec3(0, 0, 0);
    this.physics.bodyInterface.SetPositionAndRotation(
      rig.body.GetID(),
      position,
      rotation,
      Jolt.EActivation_Activate,
    );
    this.physics.bodyInterface.SetLinearAndAngularVelocity(rig.body.GetID(), zero, zero);
    Jolt.destroy(position);
    Jolt.destroy(rotation);
    Jolt.destroy(zero);
    this.poses.read(rig, this.contactList, this.poseData);
    this.state.resetHeld = 0;
    this.bus.publish('car/reset', { held: RESET_SECONDS });
  }

  private aerodynamics(rig: CarRig, forwardSpeed: number): void {
    const mass = this.spec.chassis.mass;
    const options = this.options;
    this.state.yawRateDeg = this.forces.yawDamping(rig, options.yawDamping, this.yawInertia(rig));
    this.state.downforcePercent = this.forces.downforce(
      rig,
      this.spec,
      options.wing,
      forwardSpeed,
      mass,
    );
  }

  private pedals(
    throttle: number,
    back: number,
    forwardSpeed: number,
    speedKmh: number,
  ): { forward: number; brake: number } {
    const s = this.spec.steering;
    const gas = this.steering.shape(throttle, s.throttleResponse);
    const pedal = this.steering.shape(back, s.brakeResponse);
    let forward = gas;
    let brake = 0;
    if (pedal > 0) {
      if (this.manualGearbox || forwardSpeed > REVERSE_SPEED) brake = pedal;
      else if (gas === 0) forward = -pedal;
    }
    const idle = forward === 0 && brake === 0 && speedKmh < IDLE_BRAKE_KMH;
    if (idle && this.inputs.actions.handBrake === 0) brake = IDLE_BRAKE;
    return { forward, brake };
  }

  private limit(drive: { forward: number; brake: number }, speedKmh: number, dt: number): void {
    const slip = this.maxSlip();
    const options = this.options;
    drive.forward *= this.assists.limit(
      this.tractionState,
      options.tractionControl,
      slip,
      speedKmh,
      drive.forward !== 0 && drive.brake === 0,
      dt,
    );
    drive.brake *= this.assists.limit(
      this.absState,
      options.abs,
      slip,
      speedKmh,
      drive.brake > IDLE_BRAKE,
      dt,
    );
  }

  private freeze(drive: { forward: number; brake: number }): void {
    drive.forward = 0;
    drive.brake = 1;
  }

  private maxSlip(): number {
    let max = 0;
    for (const contact of this.contactList) {
      if (contact.contact) max = Math.max(max, contact.longitudinalSlip);
    }
    return max;
  }

  private applySteerAngle(rig: CarRig, speedKmh: number): void {
    const deg = this.steering.maxAngleDeg(this.spec.steering, speedKmh);
    this.state.steerMaxDeg = deg;
    for (const i of FRONT) rig.wheels[i]!.GetSettings().mMaxSteerAngle = deg * DEG_TO_RAD;
  }

  private readGround(rig: CarRig): void {
    for (const [i, contact] of this.contactList.entries()) {
      if (!contact.contact) continue;
      const found = this.probe?.at(contact.point) ?? this.defaultSurface;
      const previous = this.queries[i];
      if (previous && this.sameQuery(previous, found)) continue;
      this.queries[i] = found;
      this.applySurface(rig, i);
    }
  }

  private sameQuery(a: SurfaceQuery, b: SurfaceQuery): boolean {
    return a.environment === b.environment && a.zone === b.zone && a.rank === b.rank;
  }

  private applySurface(rig: CarRig, index: number): void {
    const contact = this.contactList[index]!;
    contact.surface = this.surfaces.feel(this.queries[index] ?? this.defaultSurface);
    const rear = REAR.includes(index);
    this.wheelSurfaces.apply(rig.wheels[index]!, contact.surface, rear ? this.rearScale : 1);
  }

  private applyRearScale(rig: CarRig, scale: number): void {
    if (scale === this.rearScale) return;
    this.rearScale = scale;
    for (const i of REAR) this.applySurface(rig, i);
  }

  private yawInertia(rig: CarRig): number {
    return 1 / rig.body.GetMotionProperties().GetInverseInertiaDiagonal().GetY();
  }

  private readState(rig: CarRig, input: DriverInput, forwardSpeed: number): void {
    const velocity = rig.body.GetLinearVelocity();
    this.velocity.x = velocity.GetX();
    this.velocity.y = velocity.GetY();
    this.velocity.z = velocity.GetZ();
    this.state.speedKmh = Math.abs(forwardSpeed) * 3.6;
    const before = this.state.gear;
    this.telemetry.read(rig, this.state, this.spec, input, this.gearboxState, this.manualGearbox);
    if (this.state.gear !== before) {
      this.bus.publish('car/shift', { from: before, to: this.state.gear });
    }
    this.state.absCut = this.absState.cut;
    this.state.tractionCut = this.tractionState.cut;
  }

  private hold(reset: number, dt: number): void {
    if (reset <= 0) {
      this.state.resetHeld = 0;
      return;
    }
    this.state.resetHeld = clamp(this.state.resetHeld + dt, 0, RESET_SECONDS);
    if (this.state.resetHeld >= RESET_SECONDS) this.reset();
  }
}
