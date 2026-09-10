import type * as THREE from 'three';
import type initJolt from 'jolt-physics';
import type GUI from 'lil-gui';
import { Component } from '../../engine/gameObject';
import { PHYSICS_TIMESTEP, type Physics } from '../../engine/physics';
import { InputBehavior, type GameInput } from '../../engine/input/input';
import { addCurveEditor, type CurvePoint } from '../../engine/debug/curveEditor';
import type { TerrainData } from '../terrain/terrain';

type JoltAPI = Awaited<ReturnType<typeof initJolt>>;
type JoltBody = InstanceType<JoltAPI['Body']>;
type JoltConstraint = InstanceType<JoltAPI['VehicleConstraint']>;
type JoltWheeledController = InstanceType<JoltAPI['WheeledVehicleController']>;
type JoltLinearCurve = InstanceType<JoltAPI['LinearCurve']>;
type JoltWheelWV = InstanceType<JoltAPI['WheelWV']>;

export const WHEEL_COUNT = 4;
const WHEEL_NAMES = ['Front left', 'Front right', 'Back left', 'Back right'] as const;

// Grippy tarmac-like tyre friction. Effective μ is sqrt(curve * ground
// friction), so with the terrain at 1.5 these peak around 1.55. The rise
// from μ=0 stays gradual enough that the wheel settles on an equilibrium
// slip instead of chattering between 0 and 1+ each physics step.
const LONGITUDINAL_DEFAULT: readonly CurvePoint[] = [
    { x: 0, y: 0 },
    { x: 0.08, y: 1.6 },
    { x: 0.5, y: 1.4 },
    { x: 1.0, y: 1.2 },
];
const LATERAL_DEFAULT: readonly CurvePoint[] = [
    { x: 0, y: 0 },
    { x: 3, y: 1.6 },
    { x: 20, y: 1.3 },
    { x: 30, y: 1.2 },
];

function applyCurve(target: JoltLinearCurve, points: readonly CurvePoint[]): void {
    target.Clear();
    for (const p of points) target.AddPoint(p.x, p.y);
    target.Sort();
}

const STEER_SPEED = 5;
const RAD_TO_DEG = 180 / Math.PI;
// Pressing "back" while rolling forward brakes; once (nearly) stopped it
// engages reverse. Mirrors the Jolt vehicle example.
const REVERSE_SPEED_THRESHOLD = 0.5;
// Auto-brake when the player isn't touching anything and the car is nearly
// stopped — keeps it from rolling down slopes on its own.
const IDLE_BRAKE = 0.2;
const IDLE_BRAKE_SPEED_KMH = 5;

// Jolt combines tyre and ground friction as sqrt(curve * body_friction) and
// the JS binding doesn't expose the per-wheel combine callback, so surface
// grip is emulated by scaling each wheel's curves. Body friction is 1, so
// scaling a curve by s² yields an effective μ of curve * s.
const SURFACE_EPSILON = 0.01;

// Jolt keys lateral friction on the slip angle alone, so a locked rear
// wheel keeps most of its side grip and the car just slows down instead of
// rotating. Scaling the rear lateral curve down while the hand brake is
// held gives the arcade "pull and flick" slide.
const HAND_BRAKE_LATERAL_GRIP = 0.3;
const REAR_WHEELS = [2, 3] as const;

function scaleCurve(points: readonly CurvePoint[], scale: number): CurvePoint[] {
    return points.map((p) => ({ x: p.x, y: p.y * scale }));
}

interface SlipReadout {
    long: number;
    lat: number;
    surface: number;
}

export class CarBehavior extends Component {
    speedKmh = 0;
    rpm = 0;
    gear = 0;
    readonly slip: SlipReadout[] = WHEEL_NAMES.map(() => ({ long: 0, lat: 0, surface: 1 }));
    handBrakeLateralGrip = HAND_BRAKE_LATERAL_GRIP;
    private readonly longitudinalPoints: CurvePoint[][] = WHEEL_NAMES.map(() => [
        ...LONGITUDINAL_DEFAULT,
    ]);
    private readonly lateralPoints: CurvePoint[][] = WHEEL_NAMES.map(() => [...LATERAL_DEFAULT]);
    private readonly surfaceScale: number[] = WHEEL_NAMES.map(() => 1);
    private rearLateralScale = 1;
    private input!: GameInput;
    private currentRight = 0;
    private readonly wheelRight: InstanceType<JoltAPI['Vec3']>;
    private readonly wheelUp: InstanceType<JoltAPI['Vec3']>;
    private readonly wheels: JoltWheelWV[] = [];

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
        // Seed the friction curves here, before registerDebug runs, so the
        // debug editors start from the same values the constraint uses.
        for (let i = 0; i < WHEEL_COUNT; i++) {
            const wheel = Jolt.castObject(this.constraint.GetWheel(i), Jolt.WheelWV);
            applyCurve(wheel.GetSettings().mLongitudinalFriction, LONGITUDINAL_DEFAULT);
            applyCurve(wheel.GetSettings().mLateralFriction, LATERAL_DEFAULT);
            this.wheels.push(wheel);
        }
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
        this.controller.SetDriverInput(forward, right, brake, handBrake);
        if (forward !== 0 || right !== 0 || brake !== 0 || handBrake !== 0) {
            this.physics.bodyInterface.ActivateBody(this.body.GetID());
        }

        this.speedKmh = Math.abs(forwardSpeed) * 3.6;
        this.rpm = this.controller.GetEngine().GetCurrentRPM();
        this.gear = this.controller.GetTransmission().GetCurrentGear();
        // Slips are stale by one tick (Physics.step() runs after fixedUpdate)
        // but that's invisible at 60 Hz for a debug readout.
        for (const [i, wheel] of this.wheels.entries()) {
            const readout = this.slip[i];
            if (!readout) continue;
            readout.long = wheel.get_mLongitudinalSlip();
            readout.lat = wheel.get_mLateralSlip() * RAD_TO_DEG;
        }
    }

    /** Sample the terrain surface under each wheel and rescale its curves when it changes. */
    private updateSurfaces(): void {
        for (const [i, wheel] of this.wheels.entries()) {
            // Contact data is one step stale (see slip readouts); a wheel in
            // the air keeps its last surface, which is what it lands on anyway.
            if (!wheel.HasContact()) continue;
            const p = wheel.GetContactPosition();
            const s = this.terrain.frictionAt(p.GetX(), p.GetZ());
            const readout = this.slip[i];
            if (readout) readout.surface = s;
            if (Math.abs(s - (this.surfaceScale[i] ?? 1)) < SURFACE_EPSILON) continue;
            this.surfaceScale[i] = s;
            this.applyLongitudinal(i);
            this.applyLateral(i);
        }
    }

    private applyRearLateralScale(scale: number): void {
        if (scale === this.rearLateralScale) return;
        this.rearLateralScale = scale;
        for (const i of REAR_WHEELS) this.applyLateral(i);
    }

    private applyLongitudinal(index: number): void {
        const wheel = this.wheels[index];
        const points = this.longitudinalPoints[index];
        if (!wheel || !points) return;
        const s = this.surfaceScale[index] ?? 1;
        applyCurve(wheel.GetSettings().mLongitudinalFriction, scaleCurve(points, s * s));
    }

    private applyLateral(index: number): void {
        const wheel = this.wheels[index];
        const points = this.lateralPoints[index];
        if (!wheel || !points) return;
        const isRear = (REAR_WHEELS as readonly number[]).includes(index);
        const s = this.surfaceScale[index] ?? 1;
        const scale = s * s * (isRear ? this.rearLateralScale : 1);
        applyCurve(wheel.GetSettings().mLateralFriction, scaleCurve(points, scale));
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

        this.registerChassisDebug(folder);
        this.registerEngineDebug(folder);
        this.registerTransmissionDebug(folder);
        this.registerDifferentialDebug(folder);
        for (const [i, name] of WHEEL_NAMES.entries()) {
            this.registerWheelDebug(folder, name, i, i < 2);
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
        const Jolt = this.physics.Jolt;
        const wheel = Jolt.castObject(this.constraint.GetWheel(index), Jolt.WheelWV);
        const settings = wheel.GetSettings();
        const spring = settings.mSuspensionSpring;
        const f = parent.addFolder(name);
        f.close();
        const readout = this.slip[index];
        if (readout) {
            f.add(readout, 'long', -1, 1, 0.01).name('Long. slip').listen().disable();
            f.add(readout, 'lat', 0, 90, 0.5).name('Lat. slip (°)').listen().disable();
            f.add(readout, 'surface', 0, 2, 0.01).name('Surface grip').listen().disable();
        }
        const cfg = {
            maxSteerAngle: settings.mMaxSteerAngle,
            brakeTorque: settings.mMaxBrakeTorque,
            handBrakeTorque: settings.mMaxHandBrakeTorque,
            suspensionMin: settings.mSuspensionMinLength,
            suspensionMax: settings.mSuspensionMaxLength,
            suspensionFreq: spring.mFrequency,
            suspensionDamping: spring.mDamping,
            angularDamping: settings.mAngularDamping,
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
        f.add(cfg, 'angularDamping', 0, 5, 0.05)
            .name('Wheel angular damping')
            .onChange((v: number) => {
                settings.mAngularDamping = v;
            });

        const fri = f.addFolder('Friction');
        addCurveEditor(fri, {
            xRange: [0, 1],
            yRange: [0, 2.5],
            xLabel: 'slip',
            yLabel: 'long. μ',
            initialPoints: LONGITUDINAL_DEFAULT,
            onChange: (pts) => {
                this.longitudinalPoints[index] = [...pts];
                this.applyLongitudinal(index);
            },
        });
        addCurveEditor(fri, {
            xRange: [0, 30],
            yRange: [0, 2.5],
            xLabel: 'slip°',
            yLabel: 'lat. μ',
            initialPoints: LATERAL_DEFAULT,
            onChange: (pts) => {
                this.lateralPoints[index] = [...pts];
                this.applyLateral(index);
            },
        });
    }
}
