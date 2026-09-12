import * as THREE from 'three';
import type initJolt from 'jolt-physics';
import type GUI from 'lil-gui';
import { createNoise2D } from 'simplex-noise';
import { Component } from '../../engine/gameObject';
import { PHYSICS_TIMESTEP, type Physics } from '../../engine/physics';
import { InputBehavior, type GameInput } from '../../engine/input/input';
import { addCurveEditor, type CurvePoint } from '../../engine/debug/curveEditor';
import { mulberry32 } from '../../engine/tools/math';
import type { TerrainData } from '../terrain/terrain';
import { SURFACES, type Surface } from '../terrain/surfaces';
import { DRIVETRAIN } from './drivetrain';

type JoltAPI = Awaited<ReturnType<typeof initJolt>>;
type JoltBody = InstanceType<JoltAPI['Body']>;
type JoltConstraint = InstanceType<JoltAPI['VehicleConstraint']>;
type JoltWheeledController = InstanceType<JoltAPI['WheeledVehicleController']>;
type JoltLinearCurve = InstanceType<JoltAPI['LinearCurve']>;
type JoltWheelWV = InstanceType<JoltAPI['WheelWV']>;
type JoltVec3 = InstanceType<JoltAPI['Vec3']>;
type JoltRVec3 = InstanceType<JoltAPI['RVec3']>;

interface Axis {
    x: number;
    y: number;
    z: number;
}

export const WHEEL_COUNT = 4;
const WHEEL_NAMES = ['Front left', 'Front right', 'Back left', 'Back right'] as const;
const REAR_WHEELS = [2, 3] as const;
const FRONT_WHEELS = [0, 1] as const;

const GRAVITY = 9.81;
// Stick response: blend between linear and cubic. The centre gets softer
// while full deflection still reaches 1. 0 = linear, 1 = pure cube.
const STEER_RESPONSE = 0.6;
const THROTTLE_RESPONSE = 0.3;
const BRAKE_RESPONSE = 0.3;
// Speed-sensitive steering: the maximum steer angle shrinks linearly from
// the wheel's own value at rest down to this at (and above) this speed.
const STEER_AT_SPEED_DEG = 12;
const STEER_FULL_EFFECT_KMH = 100;
// Yaw damping: a torque opposing the yaw rate, scaled by the yaw inertia
// so the value is a decay rate in 1/s (1 = the spin halves in ~0.7 s).
// A pure yaw torque, unlike Jolt's angular damping, leaves pitch and roll
// alone. Only applied with a wheel on the ground: nothing damps a jump.
// Off by default: with a gamepad the raw slide feels better; meant for
// touch controls where steering is less precise.
const YAW_DAMPING = 1;
const YAW_DAMPING_ENABLED = false;

// Traction control and ABS both watch Jolt's longitudinal slip ratio (the
// quantity the friction curves key on, so a threshold sits naturally just
// past the μ peak) and scale the driver input down. The cut rises at once
// and releases over a short time so it modulates rather than chatters.
// Both off by default: meant as garage upgrades bought per car.
const TRACTION_CONTROL: SlipLimiterSettings = {
    enabled: false,
    slipThreshold: 0.3,
    slipRange: 0.25,
    strength: 0.5,
    minSpeedKmh: 5,
    releaseTime: 0.1,
};
// Aerodynamic downforce: a force along the chassis' local down axis,
// proportional to speed squared, applied at a point between the axles so
// a rear wing loads the rear. 5 N/(m/s)² is ~30 % of the weight at 100 km/h.
// Off by default: a spoiler bought at the garage, with a real effect.
const AERO_ENABLED = false;
const AERO_COEFFICIENT = 5;
const AERO_BALANCE = -0.6;

const ABS: SlipLimiterSettings = {
    enabled: false,
    slipThreshold: 0.3,
    slipRange: 0.5,
    strength: 0.5,
    minSpeedKmh: 5,
    releaseTime: 0.1,
};

interface SlipLimiterSettings {
    enabled: boolean;
    /** Slip ratio where the cut starts. */
    slipThreshold: number;
    /** Slip ratio span over which the cut goes from 0 to full. */
    slipRange: number;
    /** Fraction of the input removed at full cut. */
    strength: number;
    /** Below this speed the slip ratio is meaningless (v ≈ 0), so the limiter stays out. */
    minSpeedKmh: number;
    /** Time (s) for the cut to fall back from 1 to 0 once the slip is gone. */
    releaseTime: number;
}

/** Scales an input down as the wheels' longitudinal slip rises past a threshold. */
class SlipLimiter {
    enabled: boolean;
    slipThreshold: number;
    slipRange: number;
    strength: number;
    minSpeedKmh: number;
    releaseTime: number;
    /** Current cut, 0 (untouched) to 1 (full), debug readout. */
    cut = 0;

    constructor(s: SlipLimiterSettings) {
        this.enabled = s.enabled;
        this.slipThreshold = s.slipThreshold;
        this.slipRange = s.slipRange;
        this.strength = s.strength;
        this.minSpeedKmh = s.minSpeedKmh;
        this.releaseTime = s.releaseTime;
    }

    /** Returns the multiplier to apply to the input this tick. */
    update(slip: number, speedKmh: number, active: boolean): number {
        let target = 0;
        if (this.enabled && active && speedKmh >= this.minSpeedKmh && this.slipRange > 0) {
            target = Math.min(Math.max((slip - this.slipThreshold) / this.slipRange, 0), 1);
        }
        const release = this.releaseTime > 0 ? PHYSICS_TIMESTEP / this.releaseTime : 1;
        this.cut = Math.max(target, this.cut - release);
        return 1 - this.strength * this.cut;
    }

    registerDebug(parent: GUI, title: string): void {
        const f = parent.addFolder(title);
        f.add(this, 'enabled').name('Enabled');
        f.add(this, 'slipThreshold', 0.05, 1, 0.01).name('Slip threshold');
        f.add(this, 'slipRange', 0.05, 1, 0.01).name('Slip range');
        f.add(this, 'strength', 0, 1, 0.05).name('Strength');
        f.add(this, 'minSpeedKmh', 0, 30, 1).name('Active above (km/h)');
        f.add(this, 'releaseTime', 0, 0.5, 0.01).name('Release time (s)');
        f.add(this, 'cut', 0, 1, 0.01).name('Cut').listen().disable();
    }
}
const RAD_TO_DEG = 180 / Math.PI;
// Pressing "back" while rolling forward brakes; once (nearly) stopped it
// engages reverse. Mirrors the Jolt vehicle example.
const REVERSE_SPEED_THRESHOLD = 0.5;
// Manual gearbox (debug option, the game stays automatic): LB / RB step the
// gear down / up, from R through N to the last gear. Jolt does nothing on
// its own in manual mode, so the clutch is driven here: open for the
// switch time, then released linearly over the clutch release time.
const MANUAL_GEARBOX = false;
// Auto-brake when the player isn't touching anything and the car is nearly
// stopped — keeps it from rolling down slopes on its own.
const IDLE_BRAKE = 0.2;
const IDLE_BRAKE_SPEED_KMH = 5;

// Jolt keys lateral friction on the slip angle alone, so a locked rear
// wheel keeps most of its side grip and the car just slows down instead of
// rotating. Scaling the rear lateral curve down while the hand brake is
// held gives the arcade "pull and flick" slide.
const HAND_BRAKE_LATERAL_GRIP = 0.3;

// Procedural surface grain, sampled along the distance travelled (in
// surface wavelengths) so a parked car is still. Vertical: a virtual bump
// height pushed into the suspension preload (the spring acts as if the
// ground had risen) and mirrored on the wheel mesh. A force couldn't do
// this — at 5+ Hz even a full-load force moves a 1300 kg chassis by
// millimetres. Lateral: a sideways force that ramps up with speed and caps
// at twice the surface value. The two read the noise field far apart so
// they aren't correlated.
const ROUGHNESS_REF_SPEED = 10;
const ROUGHNESS_MAX_SPEED_FACTOR = 2;
const ROUGHNESS_WHEEL_OFFSET = 7.31;
const ROUGHNESS_LATERAL_OFFSET = 100;

/**
 * Curves in `Surface` are effective μ. The ground body friction is 1 and
 * Jolt combines as sqrt(tyre * ground), so squaring here makes the tyre
 * see exactly the curve value.
 */
function applyCurve(target: JoltLinearCurve, points: readonly CurvePoint[], scale: number): void {
    target.Clear();
    for (const p of points) {
        const mu = p.y * scale;
        target.AddPoint(p.x, mu * mu);
    }
    target.Sort();
}

function shapeInput(x: number, cubic: number): number {
    const a = Math.abs(x);
    return Math.sign(x) * ((1 - cubic) * a + cubic * a * a * a);
}

export interface WheelReadout {
    long: number;
    lat: number;
    surface: string;
    /** Surface id under the wheel (index into SURFACES). */
    surfaceId: number;
    contact: boolean;
    /** Contact point, normal and lateral direction, world space, one tick stale. */
    readonly point: THREE.Vector3;
    readonly normal: THREE.Vector3;
    readonly lateral: THREE.Vector3;
    /** Tyre width (m). */
    width: number;
    /**
     * Speed of the tyre surface against the ground along the rolling
     * direction (m/s). Zero when rolling clean, the ground speed when locked,
     * and, unlike the slip ratio, meaningless-noise-free at a standstill.
     */
    slipSpeed: number;
}

export class CarBehavior extends Component {
    speedKmh = 0;
    rpm = 0;
    /** Current gear: negative reverse, 0 neutral, 1+ forward. */
    gear = 0;
    /** Throttle sent to Jolt this tick (0..1), after response curve and traction control. */
    throttle = 0;
    /** Clutch friction (0 open, 1 locked), debug readout. */
    clutch = 0;
    /** True while the gearbox is between two gears. */
    shifting = false;
    manualGearbox = MANUAL_GEARBOX;
    /** Engine limits, mirrored from Jolt each tick so the HUD and sound follow debug edits. */
    maxRpm = DRIVETRAIN.maxRPM;
    minRpm = DRIVETRAIN.minRPM;
    shiftUpRpm = DRIVETRAIN.shiftUpRPM;
    handBrakeLateralGrip = HAND_BRAKE_LATERAL_GRIP;
    roughnessEnabled = true;
    steerResponse = STEER_RESPONSE;
    throttleResponse = THROTTLE_RESPONSE;
    brakeResponse = BRAKE_RESPONSE;
    speedSteerEnabled = true;
    /** Max steer angle at rest (°); seeded from the front wheel settings. */
    steerAtRestDeg = 0;
    steerAtSpeedDeg = STEER_AT_SPEED_DEG;
    steerFullEffectKmh = STEER_FULL_EFFECT_KMH;
    /** Current max steer angle (°), debug readout. */
    steerMaxDeg = 0;
    yawDampingEnabled = YAW_DAMPING_ENABLED;
    yawDamping = YAW_DAMPING;
    /** Yaw rate (°/s), debug readout. */
    yawRateDeg = 0;
    readonly tractionControl = new SlipLimiter(TRACTION_CONTROL);
    readonly abs = new SlipLimiter(ABS);
    aeroEnabled = AERO_ENABLED;
    /** Downforce per (m/s)², in N. */
    aeroCoefficient = AERO_COEFFICIENT;
    /** Where the downforce pushes: -1 rear axle, 0 midway, +1 front axle. */
    aeroBalance = AERO_BALANCE;
    /** Current downforce as a percentage of the weight, debug readout. */
    aeroPercent = 0;
    readonly readouts: WheelReadout[] = WHEEL_NAMES.map(() => ({
        long: 0,
        lat: 0,
        surface: '',
        surfaceId: 0,
        contact: false,
        point: new THREE.Vector3(),
        normal: new THREE.Vector3(0, 1, 0),
        lateral: new THREE.Vector3(1, 0, 0),
        width: 0,
        slipSpeed: 0,
    }));

    private input!: GameInput;
    private rearLateralScale = 1;
    private prevShiftUp = false;
    private prevShiftDown = false;
    /** Gear selected in manual mode; Jolt's current gear lags during a switch. */
    private manualGear = 0;
    /** Time (s) since the last manual shift, drives the clutch ramp. */
    private manualShiftAge = Number.POSITIVE_INFINITY;
    private travelled = 0;
    private readonly mass: number;
    private readonly wheelSurface: number[] = WHEEL_NAMES.map(() => -1);
    /** Current virtual bump height under each wheel (m), applied to the wheel mesh. */
    private readonly bump: number[] = WHEEL_NAMES.map(() => 0);
    private readonly wheels: JoltWheelWV[] = [];
    private readonly wheelRight: JoltVec3;
    private readonly wheelUp: JoltVec3;
    private readonly tmpForce: JoltVec3;
    /** Chassis inertia around its local up axis (kg·m²). */
    private readonly yawInertia: number;
    /** Axle positions along the chassis' local Z, from the wheel settings. */
    private readonly frontAxleZ: number;
    private readonly rearAxleZ: number;
    private readonly tmpPoint: JoltRVec3;
    private readonly noise = createNoise2D(mulberry32(7));

    constructor(
        private readonly physics: Physics,
        private readonly body: JoltBody,
        private readonly constraint: JoltConstraint,
        private readonly controller: JoltWheeledController,
        private readonly chassisGroup: THREE.Object3D,
        private readonly wheelMeshes: readonly THREE.Object3D[],
        private readonly terrain: TerrainData,
    ) {
        super();
        // Wheel cylinders sit on +Y axis (Three's default), so wheelRight =
        // (0,1,0) / wheelUp = (1,0,0) — matches the Jolt vehicle example.
        const Jolt = physics.Jolt;
        this.wheelRight = new Jolt.Vec3(0, 1, 0);
        this.wheelUp = new Jolt.Vec3(1, 0, 0);
        this.tmpForce = new Jolt.Vec3(0, 0, 0);
        this.tmpPoint = new Jolt.RVec3(0, 0, 0);
        const motion = body.GetMotionProperties();
        this.mass = 1 / motion.GetInverseMass();
        this.yawInertia = 1 / motion.GetInverseInertiaDiagonal().GetY();
        for (let i = 0; i < WHEEL_COUNT; i++) {
            this.wheels.push(Jolt.castObject(this.constraint.GetWheel(i), Jolt.WheelWV));
        }
        this.steerAtRestDeg = (this.wheels[0]?.GetSettings().mMaxSteerAngle ?? 0) * RAD_TO_DEG;
        this.frontAxleZ = this.wheels[FRONT_WHEELS[0]]?.GetSettings().mPosition.GetZ() ?? 0;
        this.rearAxleZ = this.wheels[REAR_WHEELS[0]]?.GetSettings().mPosition.GetZ() ?? 0;
        // Start every wheel on the track surface so the first tick has valid curves.
        for (let i = 0; i < WHEEL_COUNT; i++)
            this.setWheelSurface(i, terrain.surfaceMap.options.track);
    }

    override start(): void {
        const inputBehavior = this.gameObject.findInScene(InputBehavior);
        if (!inputBehavior) throw new Error('CarBehavior: no InputBehavior in scene');
        this.input = inputBehavior.merged;
    }

    override fixedUpdate(): void {
        const merged = this.input;
        // Right trigger = throttle, left trigger = brake (reverse once
        // stopped), left bumper = hand brake. Either stick steers. Analog
        // axes go through their response curve first.
        const throttle = shapeInput(merged.rightTrigger, this.throttleResponse);
        const back = shapeInput(merged.leftTrigger, this.brakeResponse);
        const handBrake = merged.buttonA;

        const forwardSpeed = this.localForwardSpeed();
        let forward = throttle;
        let brake = 0;
        if (back > 0) {
            // Manual: the brake only brakes, reverse is a gear (LB down to R).
            if (this.manualGearbox || forwardSpeed > REVERSE_SPEED_THRESHOLD) brake = back;
            else forward = -back;
        }
        this.updateManualGearbox(merged.rightBumper > 0, merged.leftBumper > 0);
        const idle =
            forward === 0 && brake === 0 && handBrake === 0 && this.speedKmh < IDLE_BRAKE_SPEED_KMH;
        if (idle) brake = IDLE_BRAKE;

        // Slip is one step stale (see readouts), fine for a limiter. The
        // hand brake is left alone: locking the rears is the point of it.
        const slip = this.maxLongitudinalSlip();
        const speedKmh = Math.abs(forwardSpeed) * 3.6;
        forward *= this.tractionControl.update(slip, speedKmh, forward !== 0 && brake === 0);
        brake *= this.abs.update(slip, speedKmh, brake > 0 && !idle);

        // No extra smoothing here: the keyboard source already filters its
        // 0/1 keys (Input > Keyboard smoothing), the gamepad is analog.
        const right = shapeInput(
            Math.max(-1, Math.min(1, merged.leftStickX + merged.rightStickX)),
            this.steerResponse,
        );

        this.applySpeedSteer(speedKmh);
        this.updateSurfaces();
        this.applyRearLateralScale(handBrake > 0 ? this.handBrakeLateralGrip : 1);
        const surfaceForces = this.applySurfaceForces(Math.abs(forwardSpeed));
        this.applyYawDamping();
        this.applyDownforce(forwardSpeed);
        this.controller.SetDriverInput(forward, right, brake, handBrake);
        if (surfaceForces || forward !== 0 || right !== 0 || brake !== 0 || handBrake !== 0) {
            this.physics.bodyInterface.ActivateBody(this.body.GetID());
        }

        this.speedKmh = Math.abs(forwardSpeed) * 3.6;
        this.throttle = Math.abs(forward);
        const engine = this.controller.GetEngine();
        this.rpm = engine.GetCurrentRPM();
        this.maxRpm = engine.get_mMaxRPM();
        this.minRpm = engine.get_mMinRPM();
        const transmission = this.controller.GetTransmission();
        this.shiftUpRpm = transmission.get_mShiftUpRPM();
        this.gear = transmission.GetCurrentGear();
        this.clutch = transmission.GetClutchFriction();
        this.shifting = this.manualGearbox
            ? this.manualShiftAge < transmission.get_mSwitchTime()
            : transmission.IsSwitchingGear();
        // Slips are stale by one tick (Physics.step() runs after fixedUpdate)
        // but that's invisible at 60 Hz for a debug readout.
        for (const [i, wheel] of this.wheels.entries()) {
            const readout = this.readouts[i];
            if (!readout) continue;
            readout.long = wheel.get_mLongitudinalSlip();
            readout.lat = wheel.get_mLateralSlip() * RAD_TO_DEG;
            readout.surfaceId = this.wheelSurface[i] ?? 0;
            readout.width = wheel.GetSettings().mWidth;
            readout.contact = wheel.HasContact();
            if (readout.contact) {
                const p = wheel.GetContactPosition();
                readout.point.set(p.GetX(), p.GetY(), p.GetZ());
                const n = wheel.GetContactNormal();
                readout.normal.set(n.GetX(), n.GetY(), n.GetZ());
                const l = wheel.GetContactLateral();
                readout.lateral.set(l.GetX(), l.GetY(), l.GetZ());
                // Same quantities Jolt's slip ratio is built from, kept in m/s.
                // GetContactPointVelocity is the ground's velocity at the
                // contact (zero on static terrain), so the car's own velocity
                // at that point has to come from the body.
                const along = wheel.GetContactLongitudinal();
                const carVel = this.physics.bodyInterface.GetPointVelocity(this.body.GetID(), p);
                const groundVel = wheel.GetContactPointVelocity();
                const relative =
                    (carVel.GetX() - groundVel.GetX()) * along.GetX() +
                    (carVel.GetY() - groundVel.GetY()) * along.GetY() +
                    (carVel.GetZ() - groundVel.GetZ()) * along.GetZ();
                const tyre = wheel.GetAngularVelocity() * wheel.GetSettings().mRadius;
                readout.slipSpeed = Math.abs(tyre - relative);
            } else {
                readout.slipSpeed = 0;
            }
        }
    }

    /** Largest longitudinal slip ratio among the wheels touching the ground. */
    private maxLongitudinalSlip(): number {
        let max = 0;
        for (const wheel of this.wheels) {
            if (wheel.HasContact()) max = Math.max(max, wheel.get_mLongitudinalSlip());
        }
        return max;
    }

    /** Shrink the front wheels' max steer angle with speed so the car is calmer when fast. */
    private applySpeedSteer(speedKmh: number): void {
        let deg = this.steerAtRestDeg;
        if (this.speedSteerEnabled && this.steerFullEffectKmh > 0) {
            const t = Math.min(speedKmh / this.steerFullEffectKmh, 1);
            deg = this.steerAtRestDeg + (this.steerAtSpeedDeg - this.steerAtRestDeg) * t;
        }
        this.steerMaxDeg = deg;
        const rad = deg / RAD_TO_DEG;
        for (const i of FRONT_WHEELS) {
            const wheel = this.wheels[i];
            if (wheel) wheel.GetSettings().mMaxSteerAngle = rad;
        }
    }

    /** Look up the surface under each wheel contact and re-seed its curves when it changes. */
    private updateSurfaces(): void {
        for (const [i, wheel] of this.wheels.entries()) {
            // Contact data is one step stale (see slip readouts); a wheel in
            // the air keeps its last surface, which is what it lands on anyway.
            if (!wheel.HasContact()) continue;
            const p = wheel.GetContactPosition();
            const id = this.terrain.surfaceAt(p.GetX(), p.GetZ());
            if (id !== this.wheelSurface[i]) this.setWheelSurface(i, id);
        }
    }

    private setWheelSurface(index: number, id: number): void {
        this.wheelSurface[index] = id;
        const readout = this.readouts[index];
        if (readout) readout.surface = SURFACES[id]?.name ?? '?';
        this.applySurface(index);
    }

    /** Push the wheel's current surface (and hand brake state) into its Jolt settings. */
    private applySurface(index: number): void {
        const wheel = this.wheels[index];
        const surface = SURFACES[this.wheelSurface[index] ?? 0];
        if (!wheel || !surface) return;
        const settings = wheel.GetSettings();
        const isRear = (REAR_WHEELS as readonly number[]).includes(index);
        applyCurve(settings.mLongitudinalFriction, surface.longitudinal, 1);
        applyCurve(settings.mLateralFriction, surface.lateral, isRear ? this.rearLateralScale : 1);
        settings.mAngularDamping = surface.rollingDamping;
    }

    /** Re-apply every wheel currently sitting on `id`; called when a surface is edited live. */
    private reapplySurface(id: number): void {
        for (const [i, current] of this.wheelSurface.entries()) {
            if (current === id) this.applySurface(i);
        }
    }

    private applyRearLateralScale(scale: number): void {
        if (scale === this.rearLateralScale) return;
        this.rearLateralScale = scale;
        for (const i of REAR_WHEELS) this.applySurface(i);
    }

    /** Drag, grain bumps and grain forces at each wheel contact. Returns true if anything was applied. */
    private applySurfaceForces(speed: number): boolean {
        this.travelled += speed * PHYSICS_TIMESTEP;
        const lv = this.body.GetLinearVelocity();
        const vx = lv.GetX();
        const vz = lv.GetZ();
        const loadPerWheel = (this.mass * GRAVITY) / WHEEL_COUNT;
        const speedFactor = Math.min(speed / ROUGHNESS_REF_SPEED, ROUGHNESS_MAX_SPEED_FACTOR);
        let applied = false;
        for (const [i, wheel] of this.wheels.entries()) {
            if (!wheel.HasContact()) continue;
            const surface = SURFACES[this.wheelSurface[i] ?? 0];
            if (!surface) continue;
            const drag = surface.drag;
            let fx = -drag * vx;
            let fz = -drag * vz;
            let bump = 0;
            if (this.roughnessEnabled) {
                const phase = this.travelled / surface.wavelength;
                const wheelOffset = i * ROUGHNESS_WHEEL_OFFSET;
                bump = surface.bumpHeight * this.noise(wheelOffset, phase);
                const side =
                    surface.lateralRoughness *
                    loadPerWheel *
                    speedFactor *
                    this.noise(wheelOffset + ROUGHNESS_LATERAL_OFFSET, phase);
                if (side !== 0) {
                    // Horizontal part of the wheel's sideways axis: ruts pull
                    // across the rolling direction, never along it.
                    const lat = wheel.GetContactLateral();
                    fx += side * lat.GetX();
                    fz += side * lat.GetZ();
                }
            }
            if (bump !== (this.bump[i] ?? 0)) {
                this.bump[i] = bump;
                wheel.GetSettings().mSuspensionPreloadLength = bump;
                applied = true;
            }
            if (fx === 0 && fz === 0) continue;
            this.tmpForce.Set(fx, 0, fz);
            this.body.AddForce(this.tmpForce, wheel.GetContactPosition());
            applied = true;
        }
        return applied;
    }

    /** Torque against the yaw rate around the chassis' local up axis. */
    private applyYawDamping(): void {
        const up = this.localUp();
        const w = this.body.GetAngularVelocity();
        const yawRate = up.x * w.GetX() + up.y * w.GetY() + up.z * w.GetZ();
        this.yawRateDeg = yawRate * RAD_TO_DEG;
        if (!this.yawDampingEnabled || this.yawDamping === 0 || yawRate === 0) return;
        if (!this.wheels.some((wheel) => wheel.HasContact())) return;
        const torque = -this.yawDamping * this.yawInertia * yawRate;
        this.tmpForce.Set(up.x * torque, up.y * torque, up.z * torque);
        this.body.AddTorque(this.tmpForce);
    }

    /** Downforce along the chassis' local down axis, growing with speed squared. */
    private applyDownforce(forwardSpeed: number): void {
        const force = this.aeroEnabled ? this.aeroCoefficient * forwardSpeed * forwardSpeed : 0;
        this.aeroPercent = (100 * force) / (this.mass * GRAVITY);
        if (force === 0) return;
        const up = this.localUp();
        const fwd = this.localForward();
        // Application point between the axles, along the body origin's forward axis.
        const t = (this.aeroBalance + 1) / 2;
        const z = this.rearAxleZ + (this.frontAxleZ - this.rearAxleZ) * t;
        const pos = this.body.GetPosition();
        this.tmpPoint.Set(pos.GetX() + fwd.x * z, pos.GetY() + fwd.y * z, pos.GetZ() + fwd.z * z);
        this.tmpForce.Set(-up.x * force, -up.y * force, -up.z * force);
        this.body.AddForce(this.tmpForce, this.tmpPoint);
    }

    /** Chassis' local +Y axis in world space. */
    private localUp(): Axis {
        const rot = this.body.GetRotation();
        const qx = rot.GetX();
        const qy = rot.GetY();
        const qz = rot.GetZ();
        const qw = rot.GetW();
        // Local +Y column of the rotation matrix.
        return {
            x: 2 * (qx * qy - qw * qz),
            y: 1 - 2 * (qx * qx + qz * qz),
            z: 2 * (qy * qz + qw * qx),
        };
    }

    /** Chassis' local +Z axis in world space. */
    private localForward(): Axis {
        const rot = this.body.GetRotation();
        const qx = rot.GetX();
        const qy = rot.GetY();
        const qz = rot.GetZ();
        const qw = rot.GetW();
        // Local +Z column of the rotation matrix.
        return {
            x: 2 * (qx * qz + qw * qy),
            y: 2 * (qy * qz - qw * qx),
            z: 1 - 2 * (qx * qx + qy * qy),
        };
    }

    /** Signed speed along the chassis' local +Z (m/s). */
    private localForwardSpeed(): number {
        const f = this.localForward();
        const lv = this.body.GetLinearVelocity();
        return f.x * lv.GetX() + f.y * lv.GetY() + f.z * lv.GetZ();
    }

    override render(): void {
        const pos = this.body.GetPosition();
        const rot = this.body.GetRotation();
        this.chassisGroup.position.set(pos.GetX(), pos.GetY(), pos.GetZ());
        this.chassisGroup.quaternion.set(rot.GetX(), rot.GetY(), rot.GetZ(), rot.GetW());

        for (const [i, mesh] of this.wheelMeshes.entries()) this.applyWheel(i, mesh);
    }

    private applyWheel(index: number, mesh: THREE.Object3D): void {
        const t = this.constraint.GetWheelLocalTransform(index, this.wheelRight, this.wheelUp);
        const translation = t.GetTranslation();
        const rotation = t.GetRotation().GetQuaternion();
        // Lift the wheel by the virtual bump so it rides over ground the
        // heightmap doesn't have; the suspension preload does the same physically.
        const lift = this.bump[index] ?? 0;
        mesh.position.set(translation.GetX(), translation.GetY() + lift, translation.GetZ());
        mesh.quaternion.set(rotation.GetX(), rotation.GetY(), rotation.GetZ(), rotation.GetW());
    }

    private updateManualGearbox(shiftUp: boolean, shiftDown: boolean): void {
        const tr = this.controller.GetTransmission();
        const upEdge = shiftUp && !this.prevShiftUp;
        const downEdge = shiftDown && !this.prevShiftDown;
        this.prevShiftUp = shiftUp;
        this.prevShiftDown = shiftDown;
        if (!this.manualGearbox) return;

        const topGear = tr.get_mGearRatios().size();
        const wanted = Math.max(
            -1,
            Math.min(topGear, this.manualGear + (upEdge ? 1 : 0) - (downEdge ? 1 : 0)),
        );
        if (wanted !== this.manualGear) {
            this.manualGear = wanted;
            this.manualShiftAge = 0;
        } else {
            this.manualShiftAge += PHYSICS_TIMESTEP;
        }

        const switchTime = tr.get_mSwitchTime();
        const releaseTime = tr.get_mClutchReleaseTime();
        let clutch = 1;
        if (this.manualShiftAge < switchTime) clutch = 0;
        else if (releaseTime > 0)
            clutch = Math.min((this.manualShiftAge - switchTime) / releaseTime, 1);
        // Neutral: clutch open, so the engine revs free.
        if (this.manualGear === 0) clutch = 0;
        tr.Set(this.manualGear, clutch);
    }

    private setGearboxMode(manual: boolean): void {
        const Jolt = this.physics.Jolt;
        const tr = this.controller.GetTransmission();
        this.manualGearbox = manual;
        if (manual) {
            // Pick up whatever gear the automatic was in so nothing jolts.
            this.manualGear = tr.GetCurrentGear();
            this.manualShiftAge = Number.POSITIVE_INFINITY;
            tr.set_mMode(Jolt.ETransmissionMode_Manual);
        } else {
            tr.set_mMode(Jolt.ETransmissionMode_Auto);
        }
    }

    override registerDebug(gui: GUI): void {
        const folder = gui.addFolder('Car');
        folder.add(this, 'speedKmh').name('Speed (km/h)').listen().disable();
        folder.add(this, 'rpm').name('Engine (RPM)').listen().disable();
        folder.add(this, 'gear').name('Gear').listen().disable();
        folder
            .add(this, 'handBrakeLateralGrip', 0, 1, 0.05)
            .name('Hand brake lat. grip')
            .onChange(() => {
                this.rearLateralScale = -1;
            });
        folder.add(this, 'roughnessEnabled').name('Surface grain');

        this.registerInputDebug(folder);
        this.registerSteeringDebug(folder);
        this.registerYawDebug(folder);
        this.tractionControl.registerDebug(folder, 'Traction control');
        this.abs.registerDebug(folder, 'ABS');
        this.registerAeroDebug(folder);
        this.registerChassisDebug(folder);
        this.registerEngineDebug(folder);
        this.registerTransmissionDebug(folder);
        this.registerDifferentialDebug(folder);
        for (const [i, name] of WHEEL_NAMES.entries()) {
            this.registerWheelDebug(folder, name, i);
        }

        const surfaces = gui.addFolder('Surfaces');
        for (const [id, surface] of SURFACES.entries()) {
            this.registerSurfaceDebug(surfaces, surface, id);
        }
    }

    private registerInputDebug(parent: GUI): void {
        const f = parent.addFolder('Input response');
        f.add(this, 'steerResponse', 0, 1, 0.05).name('Steering (0 lin → 1 cubic)');
        f.add(this, 'throttleResponse', 0, 1, 0.05).name('Throttle (0 lin → 1 cubic)');
        f.add(this, 'brakeResponse', 0, 1, 0.05).name('Brake (0 lin → 1 cubic)');
    }

    private registerAeroDebug(parent: GUI): void {
        const f = parent.addFolder('Downforce');
        f.add(this, 'aeroEnabled').name('Enabled');
        f.add(this, 'aeroCoefficient', 0, 20, 0.5).name('Coefficient (N/(m/s)²)');
        f.add(this, 'aeroBalance', -1, 1, 0.1).name('Balance (-1 rear → 1 front)');
        f.add(this, 'aeroPercent', 0, 200, 1).name('Downforce (% weight)').listen().disable();
    }

    private registerYawDebug(parent: GUI): void {
        const f = parent.addFolder('Yaw damping');
        f.add(this, 'yawDampingEnabled').name('Enabled');
        f.add(this, 'yawDamping', 0, 10, 0.1).name('Damping (1/s)');
        f.add(this, 'yawRateDeg', -360, 360, 1).name('Yaw rate (°/s)').listen().disable();
    }

    private registerSteeringDebug(parent: GUI): void {
        const f = parent.addFolder('Steering');
        f.add(this, 'speedSteerEnabled').name('Speed-sensitive');
        f.add(this, 'steerAtRestDeg', 5, 45, 0.5).name('Max at rest (°)');
        f.add(this, 'steerAtSpeedDeg', 2, 45, 0.5).name('Max at speed (°)');
        f.add(this, 'steerFullEffectKmh', 20, 200, 5).name('Full effect at (km/h)');
        f.add(this, 'steerMaxDeg', 0, 45, 0.1).name('Current max (°)').listen().disable();
    }

    private registerChassisDebug(parent: GUI): void {
        const f = parent.addFolder('Chassis');
        const motion = this.body.GetMotionProperties();
        const cfg = {
            friction: this.body.GetFriction(),
            restitution: this.body.GetRestitution(),
            linearDamping: motion.GetLinearDamping(),
            angularDamping: motion.GetAngularDamping(),
            gravityFactor: motion.GetGravityFactor(),
        };
        f.add(cfg, 'gravityFactor', 0.5, 4, 0.1)
            .name('Gravity factor')
            .onChange((v: number) => {
                motion.SetGravityFactor(v);
            });
        f.add(cfg, 'friction', 0, 2, 0.05)
            .name('Friction')
            .onChange((v: number) => {
                this.body.SetFriction(v);
            });
        f.add(cfg, 'restitution', 0, 1, 0.05)
            .name('Restitution')
            .onChange((v: number) => {
                this.body.SetRestitution(v);
            });
        f.add(cfg, 'linearDamping', 0, 5, 0.05)
            .name('Linear damping')
            .onChange((v: number) => {
                motion.SetLinearDamping(v);
            });
        f.add(cfg, 'angularDamping', 0, 5, 0.05)
            .name('Angular damping')
            .onChange((v: number) => {
                motion.SetAngularDamping(v);
            });
    }

    private registerEngineDebug(parent: GUI): void {
        const f = parent.addFolder('Engine');
        const engine = this.controller.GetEngine();
        const cfg = {
            maxTorque: engine.get_mMaxTorque(),
            minRPM: engine.get_mMinRPM(),
            maxRPM: engine.get_mMaxRPM(),
            inertia: engine.get_mInertia(),
            angularDamping: engine.get_mAngularDamping(),
        };
        f.add(cfg, 'maxTorque', 50, 2000, 10)
            .name('Max torque (Nm)')
            .onChange((v: number) => {
                engine.set_mMaxTorque(v);
            });
        f.add(cfg, 'minRPM', 500, 3000, 50)
            .name('Min RPM')
            .onChange((v: number) => {
                engine.set_mMinRPM(v);
            });
        f.add(cfg, 'maxRPM', 3000, 12000, 100)
            .name('Max RPM')
            .onChange((v: number) => {
                engine.set_mMaxRPM(v);
            });
        f.add(cfg, 'inertia', 0.05, 5, 0.05)
            .name('Inertia (kg·m²)')
            .onChange((v: number) => {
                engine.set_mInertia(v);
            });
        f.add(cfg, 'angularDamping', 0, 2, 0.05)
            .name('Angular damping')
            .onChange((v: number) => {
                engine.set_mAngularDamping(v);
            });
        // Jolt reads the curve at RPM / maxRPM and multiplies by maxTorque.
        addCurveEditor(f, {
            xRange: [0, 1],
            yRange: [0, 1.2],
            xLabel: 'RPM / max',
            yLabel: 'torque',
            initialPoints: DRIVETRAIN.torqueCurve,
            onChange: (pts) => {
                const curve = engine.get_mNormalizedTorque();
                curve.Clear();
                for (const p of pts) curve.AddPoint(p.x, p.y);
                curve.Sort();
            },
        });
    }

    private registerTransmissionDebug(parent: GUI): void {
        const f = parent.addFolder('Transmission');
        const Jolt = this.physics.Jolt;
        const tr = this.controller.GetTransmission();
        f.add(this, 'manualGearbox')
            .name('Manual (LB/RB)')
            .onChange((v: boolean) => {
                this.setGearboxMode(v);
            });
        f.add(this, 'clutch', 0, 1, 0.01).name('Clutch friction').listen().disable();
        f.add(this, 'shifting').name('Shifting').listen().disable();
        const cfg = {
            shiftUpRPM: tr.get_mShiftUpRPM(),
            shiftDownRPM: tr.get_mShiftDownRPM(),
            switchTime: tr.get_mSwitchTime(),
            clutchReleaseTime: tr.get_mClutchReleaseTime(),
            switchLatency: tr.get_mSwitchLatency(),
            clutchStrength: tr.get_mClutchStrength(),
        };
        f.add(cfg, 'shiftUpRPM', 2000, 12000, 100)
            .name('Shift up (RPM)')
            .onChange((v: number) => {
                tr.set_mShiftUpRPM(v);
            });
        f.add(cfg, 'shiftDownRPM', 500, 6000, 100)
            .name('Shift down (RPM)')
            .onChange((v: number) => {
                tr.set_mShiftDownRPM(v);
            });
        f.add(cfg, 'switchTime', 0, 1.5, 0.05)
            .name('Switch time (s)')
            .onChange((v: number) => {
                tr.set_mSwitchTime(v);
            });
        f.add(cfg, 'clutchReleaseTime', 0, 1.5, 0.05)
            .name('Clutch release (s)')
            .onChange((v: number) => {
                tr.set_mClutchReleaseTime(v);
            });
        f.add(cfg, 'switchLatency', 0, 2, 0.05)
            .name('Switch latency (s)')
            .onChange((v: number) => {
                tr.set_mSwitchLatency(v);
            });
        f.add(cfg, 'clutchStrength', 0.5, 20, 0.5)
            .name('Clutch strength')
            .onChange((v: number) => {
                tr.set_mClutchStrength(v);
            });

        // Gear ratios: one slider per gear, the whole array is rewritten on
        // each change (Jolt copies it, so the temporary is freed right away).
        const gears = f.addFolder('Gear ratios');
        const ratios = [...DRIVETRAIN.gearRatios];
        const gearCfg: Record<string, number> = { reverse: DRIVETRAIN.reverseRatio };
        ratios.forEach((r, i) => {
            gearCfg[`gear${String(i + 1)}`] = r;
        });
        const applyForward = (): void => {
            const arr = new Jolt.ArrayFloat();
            for (const r of ratios) arr.push_back(r);
            tr.set_mGearRatios(arr);
            Jolt.destroy(arr);
        };
        ratios.forEach((_, i) => {
            gears
                .add(gearCfg, `gear${String(i + 1)}`, 0.3, 5, 0.05)
                .name(`Gear ${String(i + 1)}`)
                .onChange((v: number) => {
                    ratios[i] = v;
                    applyForward();
                });
        });
        gears
            .add(gearCfg, 'reverse', -5, -0.3, 0.05)
            .name('Reverse')
            .onChange((v: number) => {
                const arr = new Jolt.ArrayFloat();
                arr.push_back(v);
                tr.set_mReverseGearRatios(arr);
                Jolt.destroy(arr);
            });
    }

    private registerDifferentialDebug(parent: GUI): void {
        const diffs = this.controller.GetDifferentials();
        const f = parent.addFolder('Differentials');
        const cfg = { limitedSlip: this.controller.GetDifferentialLimitedSlipRatio() };
        f.add(cfg, 'limitedSlip', 1, 5, 0.1)
            .name('Front/back limited slip')
            .onChange((v: number) => {
                this.controller.SetDifferentialLimitedSlipRatio(v);
            });
        for (let i = 0; i < diffs.size(); i++) {
            const diff = diffs.at(i);
            const df = f.addFolder(diff.get_mLeftWheel() < 2 ? 'Front axle' : 'Back axle');
            const dcfg = {
                ratio: diff.get_mDifferentialRatio(),
                torqueRatio: diff.get_mEngineTorqueRatio(),
                limitedSlip: diff.get_mLimitedSlipRatio(),
            };
            df.add(dcfg, 'ratio', 1, 10, 0.1)
                .name('Gear ratio')
                .onChange((v: number) => {
                    diff.set_mDifferentialRatio(v);
                });
            df.add(dcfg, 'torqueRatio', 0, 1, 0.05)
                .name('Engine torque share')
                .onChange((v: number) => {
                    diff.set_mEngineTorqueRatio(v);
                });
            df.add(dcfg, 'limitedSlip', 1, 5, 0.1)
                .name('Left/right limited slip')
                .onChange((v: number) => {
                    diff.set_mLimitedSlipRatio(v);
                });
        }
    }

    private registerWheelDebug(parent: GUI, name: string, index: number): void {
        const wheel = this.wheels[index];
        const readout = this.readouts[index];
        if (!wheel || !readout) return;
        const settings = wheel.GetSettings();
        const spring = settings.mSuspensionSpring;
        const f = parent.addFolder(name);
        f.close();
        f.add(readout, 'surface').name('Surface').listen().disable();
        f.add(readout, 'long', -1, 1, 0.01).name('Long. slip').listen().disable();
        f.add(readout, 'lat', 0, 90, 0.5).name('Lat. slip (°)').listen().disable();
        const cfg = {
            brakeTorque: settings.mMaxBrakeTorque,
            handBrakeTorque: settings.mMaxHandBrakeTorque,
            suspensionMin: settings.mSuspensionMinLength,
            suspensionMax: settings.mSuspensionMaxLength,
            suspensionFreq: spring.mFrequency,
            suspensionDamping: spring.mDamping,
        };
        f.add(cfg, 'brakeTorque', 0, 8000, 50)
            .name('Brake torque')
            .onChange((v: number) => {
                settings.mMaxBrakeTorque = v;
            });
        f.add(cfg, 'handBrakeTorque', 0, 10000, 50)
            .name('Hand brake torque')
            .onChange((v: number) => {
                settings.mMaxHandBrakeTorque = v;
            });
        f.add(cfg, 'suspensionMin', 0, 1, 0.02)
            .name('Suspension min (m)')
            .onChange((v: number) => {
                settings.mSuspensionMinLength = v;
            });
        f.add(cfg, 'suspensionMax', 0, 1.5, 0.02)
            .name('Suspension max (m)')
            .onChange((v: number) => {
                settings.mSuspensionMaxLength = v;
            });
        f.add(cfg, 'suspensionFreq', 0.1, 10, 0.1)
            .name('Suspension freq (Hz)')
            .onChange((v: number) => {
                spring.mFrequency = v;
            });
        f.add(cfg, 'suspensionDamping', 0, 5, 0.05)
            .name('Suspension damping')
            .onChange((v: number) => {
                spring.mDamping = v;
            });
    }

    private registerSurfaceDebug(parent: GUI, surface: Surface, id: number): void {
        const f = parent.addFolder(surface.name);
        f.close();
        f.add(surface, 'rollingDamping', 0, 10, 0.05)
            .name('Rolling damping')
            .onChange(() => {
                this.reapplySurface(id);
            });
        f.add(surface, 'drag', 0, 500, 5).name('Drag (N per m/s)');
        f.add(surface, 'bumpHeight', 0, 0.15, 0.005).name('Bump height (m)');
        f.add(surface, 'lateralRoughness', 0, 2, 0.05).name('Lateral roughness');
        f.add(surface, 'wavelength', 0.1, 5, 0.1).name('Grain wavelength (m)');
        addCurveEditor(f, {
            xRange: [0, 1],
            yRange: [0, 2],
            xLabel: 'slip',
            yLabel: 'long. μ',
            initialPoints: surface.longitudinal,
            onChange: (pts) => {
                surface.longitudinal = [...pts];
                this.reapplySurface(id);
            },
        });
        addCurveEditor(f, {
            xRange: [0, 30],
            yRange: [0, 2],
            xLabel: 'slip°',
            yLabel: 'lat. μ',
            initialPoints: surface.lateral,
            onChange: (pts) => {
                surface.lateral = [...pts];
                this.reapplySurface(id);
            },
        });
    }
}
