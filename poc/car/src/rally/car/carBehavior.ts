import type * as THREE from 'three';
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

type JoltAPI = Awaited<ReturnType<typeof initJolt>>;
type JoltBody = InstanceType<JoltAPI['Body']>;
type JoltConstraint = InstanceType<JoltAPI['VehicleConstraint']>;
type JoltWheeledController = InstanceType<JoltAPI['WheeledVehicleController']>;
type JoltLinearCurve = InstanceType<JoltAPI['LinearCurve']>;
type JoltWheelWV = InstanceType<JoltAPI['WheelWV']>;
type JoltVec3 = InstanceType<JoltAPI['Vec3']>;

export const WHEEL_COUNT = 4;
const WHEEL_NAMES = ['Front left', 'Front right', 'Back left', 'Back right'] as const;
const REAR_WHEELS = [2, 3] as const;

const GRAVITY = 9.81;
const STEER_SPEED = 5;
const RAD_TO_DEG = 180 / Math.PI;
// Pressing "back" while rolling forward brakes; once (nearly) stopped it
// engages reverse. Mirrors the Jolt vehicle example.
const REVERSE_SPEED_THRESHOLD = 0.5;
// Auto-brake when the player isn't touching anything and the car is nearly
// stopped — keeps it from rolling down slopes on its own.
const IDLE_BRAKE = 0.2;
const IDLE_BRAKE_SPEED_KMH = 5;

// Jolt keys lateral friction on the slip angle alone, so a locked rear
// wheel keeps most of its side grip and the car just slows down instead of
// rotating. Scaling the rear lateral curve down while the hand brake is
// held gives the arcade "pull and flick" slide.
const HAND_BRAKE_LATERAL_GRIP = 0.3;

// Procedural surface grain: vertical and sideways force noise applied at
// each wheel contact, sampled along the distance travelled (in surface
// wavelengths) so a parked car is still. The amplitude ramps up with speed
// and caps at twice the surface value. The two components read the noise
// field far apart so they aren't correlated.
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

interface WheelReadout {
    long: number;
    lat: number;
    surface: string;
}

export class CarBehavior extends Component {
    speedKmh = 0;
    rpm = 0;
    gear = 0;
    handBrakeLateralGrip = HAND_BRAKE_LATERAL_GRIP;
    roughnessEnabled = true;
    readonly readouts: WheelReadout[] = WHEEL_NAMES.map(() => ({ long: 0, lat: 0, surface: '' }));

    private input!: GameInput;
    private currentRight = 0;
    private rearLateralScale = 1;
    private travelled = 0;
    private readonly mass: number;
    private readonly wheelSurface: number[] = WHEEL_NAMES.map(() => -1);
    private readonly wheels: JoltWheelWV[] = [];
    private readonly wheelRight: JoltVec3;
    private readonly wheelUp: JoltVec3;
    private readonly tmpForce: JoltVec3;
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
        this.mass = 1 / body.GetMotionProperties().GetInverseMass();
        for (let i = 0; i < WHEEL_COUNT; i++) {
            this.wheels.push(Jolt.castObject(this.constraint.GetWheel(i), Jolt.WheelWV));
        }
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
        // stopped), left bumper = hand brake. Either stick steers.
        const throttle = merged.rightTrigger;
        const back = merged.leftTrigger;
        const handBrake = merged.leftBumper;

        const forwardSpeed = this.localForwardSpeed();
        let forward = throttle;
        let brake = 0;
        if (back > 0) {
            if (forwardSpeed > REVERSE_SPEED_THRESHOLD) brake = back;
            else forward = -back;
        }
        const idle =
            forward === 0 && brake === 0 && handBrake === 0 && this.speedKmh < IDLE_BRAKE_SPEED_KMH;
        if (idle) brake = IDLE_BRAKE;

        // Smooth the raw stick so keyboard steering isn't a step function.
        const inputRight = Math.max(-1, Math.min(1, merged.leftStickX + merged.rightStickX));
        if (inputRight > this.currentRight) {
            this.currentRight = Math.min(
                this.currentRight + STEER_SPEED * PHYSICS_TIMESTEP,
                inputRight,
            );
        } else if (inputRight < this.currentRight) {
            this.currentRight = Math.max(
                this.currentRight - STEER_SPEED * PHYSICS_TIMESTEP,
                inputRight,
            );
        }
        const right = this.currentRight;

        this.updateSurfaces();
        this.applyRearLateralScale(handBrake > 0 ? this.handBrakeLateralGrip : 1);
        const surfaceForces = this.applySurfaceForces(Math.abs(forwardSpeed));
        this.controller.SetDriverInput(forward, right, brake, handBrake);
        if (surfaceForces || forward !== 0 || right !== 0 || brake !== 0 || handBrake !== 0) {
            this.physics.bodyInterface.ActivateBody(this.body.GetID());
        }

        this.speedKmh = Math.abs(forwardSpeed) * 3.6;
        this.rpm = this.controller.GetEngine().GetCurrentRPM();
        this.gear = this.controller.GetTransmission().GetCurrentGear();
        // Slips are stale by one tick (Physics.step() runs after fixedUpdate)
        // but that's invisible at 60 Hz for a debug readout.
        for (const [i, wheel] of this.wheels.entries()) {
            const readout = this.readouts[i];
            if (!readout) continue;
            readout.long = wheel.get_mLongitudinalSlip();
            readout.lat = wheel.get_mLateralSlip() * RAD_TO_DEG;
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

    /** Drag and grain forces at each wheel contact. Returns true if anything was applied. */
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
            let fy = 0;
            let fx = -drag * vx;
            let fz = -drag * vz;
            if (this.roughnessEnabled) {
                const grain = loadPerWheel * speedFactor;
                const phase = this.travelled / surface.wavelength;
                const wheelOffset = i * ROUGHNESS_WHEEL_OFFSET;
                fy = surface.roughness * grain * this.noise(wheelOffset, phase);
                const side =
                    surface.lateralRoughness *
                    grain *
                    this.noise(wheelOffset + ROUGHNESS_LATERAL_OFFSET, phase);
                if (side !== 0) {
                    // Horizontal part of the wheel's sideways axis: ruts pull
                    // across the rolling direction, never along it.
                    const lat = wheel.GetContactLateral();
                    fx += side * lat.GetX();
                    fz += side * lat.GetZ();
                }
            }
            if (fx === 0 && fy === 0 && fz === 0) continue;
            this.tmpForce.Set(fx, fy, fz);
            this.body.AddForce(this.tmpForce, wheel.GetContactPosition());
            applied = true;
        }
        return applied;
    }

    /** Signed speed along the chassis' local +Z (m/s). */
    private localForwardSpeed(): number {
        const rot = this.body.GetRotation();
        const qx = rot.GetX();
        const qy = rot.GetY();
        const qz = rot.GetZ();
        const qw = rot.GetW();
        // Local +Z column of the rotation matrix.
        const fx = 2 * (qx * qz + qw * qy);
        const fy = 2 * (qy * qz - qw * qx);
        const fz = 1 - 2 * (qx * qx + qy * qy);
        const lv = this.body.GetLinearVelocity();
        return fx * lv.GetX() + fy * lv.GetY() + fz * lv.GetZ();
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
        mesh.position.set(translation.GetX(), translation.GetY(), translation.GetZ());
        mesh.quaternion.set(rotation.GetX(), rotation.GetY(), rotation.GetZ(), rotation.GetW());
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

        this.registerChassisDebug(folder);
        this.registerEngineDebug(folder);
        this.registerTransmissionDebug(folder);
        this.registerDifferentialDebug(folder);
        for (const [i, name] of WHEEL_NAMES.entries()) {
            this.registerWheelDebug(folder, name, i, i < 2);
        }

        const surfaces = gui.addFolder('Surfaces');
        for (const [id, surface] of SURFACES.entries()) {
            this.registerSurfaceDebug(surfaces, surface, id);
        }
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
    }

    private registerTransmissionDebug(parent: GUI): void {
        const f = parent.addFolder('Transmission');
        const tr = this.controller.GetTransmission();
        const cfg = {
            shiftUpRPM: tr.get_mShiftUpRPM(),
            shiftDownRPM: tr.get_mShiftDownRPM(),
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
        f.add(cfg, 'clutchStrength', 0.5, 20, 0.5)
            .name('Clutch strength')
            .onChange((v: number) => {
                tr.set_mClutchStrength(v);
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

    private registerWheelDebug(parent: GUI, name: string, index: number, withSteer: boolean): void {
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
            maxSteerAngle: settings.mMaxSteerAngle,
            brakeTorque: settings.mMaxBrakeTorque,
            handBrakeTorque: settings.mMaxHandBrakeTorque,
            suspensionMin: settings.mSuspensionMinLength,
            suspensionMax: settings.mSuspensionMaxLength,
            suspensionFreq: spring.mFrequency,
            suspensionDamping: spring.mDamping,
        };
        if (withSteer) {
            f.add(cfg, 'maxSteerAngle', 0, Math.PI / 2, 0.02)
                .name('Max steer (rad)')
                .onChange((v: number) => {
                    settings.mMaxSteerAngle = v;
                });
        }
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
        f.add(surface, 'roughness', 0, 2, 0.05).name('Roughness');
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
