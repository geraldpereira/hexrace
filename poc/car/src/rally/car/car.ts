import * as THREE from 'three';
import { GameObject } from '../../engine/gameObject';
import { BodyComponent, MeshComponent } from '../../engine/components';
import { LAYER_MOVING, type Physics } from '../../engine/physics';
import type { TerrainData } from '../terrain/terrain';
import { CarBehavior, WHEEL_COUNT } from './carBehavior';
import { DRIVETRAIN } from './drivetrain';

// Compact rally car, half-extents. The wheels hang outside the box on X so
// the chassis collider never clips into the tyres.
const HALF_W = 0.8;
const HALF_H = 0.3;
const HALF_L = 1.9;
const VEHICLE_MASS = 1300;

const WHEEL_RADIUS = 0.34;
const WHEEL_WIDTH = 0.22;
const WHEEL_X = HALF_W + WHEEL_WIDTH / 2;
// Suspension attach point at the bottom of the chassis box. With the short
// suspension below, the box sits about a wheel radius above the ground.
const WHEEL_Y = -HALF_H;
const FRONT_WHEEL_Z = 1.3;
const BACK_WHEEL_Z = -1.3;

// Short, stiff suspension: low ride height and little body roll.
const SUSPENSION_MIN = 0.05;
const SUSPENSION_MAX = 0.25;
const SUSPENSION_FREQ = 2.5;
const SUSPENSION_DAMPING = 0.7;
const ANTI_ROLL_STIFFNESS = 1000;

const MAX_STEER_ANGLE = (32 * Math.PI) / 180;
const FRONT_BRAKE_TORQUE = 3000;
const BACK_BRAKE_TORQUE = 2000;
const BACK_HANDBRAKE_TORQUE = 6000;

// Four-wheel drive with an even split. Set to 0 for rear-wheel drive: an
// axle with a zero share gets no differential at all so the engine never
// sees its wheels. Each driven axle has a limited-slip differential so one
// spinning wheel doesn't eat all the torque on loose ground.
const FRONT_TORQUE_RATIO = 0.5;
const LIMITED_SLIP_RATIO = 1.4;

const SPAWN_CLEARANCE = 1.0;

interface WheelSpec {
    x: number;
    z: number;
    steer: boolean;
}

// Order matters: the differentials and anti-roll bars below index into it.
const WHEELS: readonly WheelSpec[] = [
    { x: -WHEEL_X, z: FRONT_WHEEL_Z, steer: true },
    { x: WHEEL_X, z: FRONT_WHEEL_Z, steer: true },
    { x: -WHEEL_X, z: BACK_WHEEL_Z, steer: false },
    { x: WHEEL_X, z: BACK_WHEEL_Z, steer: false },
];

/**
 * Build the player car: Jolt body + VehicleConstraint with the
 * WheeledVehicleController (4WD, anti-roll bars), plus the matching
 * Three.js chassis group and wheel cylinders.
 */
export function createCar(physics: Physics, scene: THREE.Scene, terrain: TerrainData): GameObject {
    const Jolt = physics.Jolt;
    const bodyInterface = physics.bodyInterface;

    const startPos = terrain.track.curve.getPointAt(0);
    const tangent = terrain.track.curve.getTangentAt(0);
    const groundY = terrain.heightmap.heightAt(startPos.x, startPos.z);
    // Align local +Z with the track tangent so the car spawns facing forward.
    const spawnRot = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    const spawnY = groundY + SPAWN_CLEARANCE;

    // Centre of mass dropped to the bottom of the box: engine + drivetrain
    // sit low, which keeps the car from rolling over in fast corners.
    const innerBox = new Jolt.BoxShapeSettings(new Jolt.Vec3(HALF_W, HALF_H, HALF_L));
    const shapeSettings = new Jolt.OffsetCenterOfMassShapeSettings(
        new Jolt.Vec3(0, -HALF_H, 0),
        innerBox,
    );
    const shape = shapeSettings.Create().Get();

    const bodySettings = new Jolt.BodyCreationSettings(
        shape,
        new Jolt.RVec3(startPos.x, spawnY, startPos.z),
        new Jolt.Quat(spawnRot.x, spawnRot.y, spawnRot.z, spawnRot.w),
        Jolt.EMotionType_Dynamic,
        LAYER_MOVING,
    );
    bodySettings.mOverrideMassProperties = Jolt.EOverrideMassProperties_CalculateInertia;
    bodySettings.mMassPropertiesOverride.mMass = VEHICLE_MASS;

    const body = bodyInterface.CreateBody(bodySettings);
    bodyInterface.AddBody(body.GetID(), Jolt.EActivation_Activate);
    Jolt.destroy(bodySettings);

    const vehicle = new Jolt.VehicleConstraintSettings();
    vehicle.mWheels.clear();
    for (const spec of WHEELS) {
        const w = new Jolt.WheelSettingsWV();
        w.mPosition = new Jolt.Vec3(spec.x, WHEEL_Y, spec.z);
        w.mMaxSteerAngle = spec.steer ? MAX_STEER_ANGLE : 0;
        w.mRadius = WHEEL_RADIUS;
        w.mWidth = WHEEL_WIDTH;
        w.mSuspensionMinLength = SUSPENSION_MIN;
        w.mSuspensionMaxLength = SUSPENSION_MAX;
        w.mSuspensionSpring.mFrequency = SUSPENSION_FREQ;
        w.mSuspensionSpring.mDamping = SUSPENSION_DAMPING;
        w.mMaxBrakeTorque = spec.steer ? FRONT_BRAKE_TORQUE : BACK_BRAKE_TORQUE;
        w.mMaxHandBrakeTorque = spec.steer ? 0 : BACK_HANDBRAKE_TORQUE;
        vehicle.mWheels.push_back(w);
    }

    vehicle.mAntiRollBars.clear();
    for (const [left, right] of [
        [0, 1],
        [2, 3],
    ] as const) {
        const bar = new Jolt.VehicleAntiRollBar();
        bar.mLeftWheel = left;
        bar.mRightWheel = right;
        bar.mStiffness = ANTI_ROLL_STIFFNESS;
        vehicle.mAntiRollBars.push_back(bar);
    }

    const controllerSettings = new Jolt.WheeledVehicleControllerSettings();
    const engine = controllerSettings.mEngine;
    engine.mMaxTorque = DRIVETRAIN.maxTorque;
    engine.mMinRPM = DRIVETRAIN.minRPM;
    engine.mMaxRPM = DRIVETRAIN.maxRPM;
    engine.mInertia = DRIVETRAIN.inertia;
    engine.mAngularDamping = DRIVETRAIN.angularDamping;
    const torque = engine.mNormalizedTorque;
    torque.Clear();
    for (const p of DRIVETRAIN.torqueCurve) torque.AddPoint(p.x, p.y);
    torque.Sort();
    const transmission = controllerSettings.mTransmission;
    transmission.mMode = Jolt.ETransmissionMode_Auto;
    const gears = new Jolt.ArrayFloat();
    for (const ratio of DRIVETRAIN.gearRatios) gears.push_back(ratio);
    transmission.mGearRatios = gears;
    const reverse = new Jolt.ArrayFloat();
    reverse.push_back(DRIVETRAIN.reverseRatio);
    transmission.mReverseGearRatios = reverse;
    transmission.mShiftDownRPM = DRIVETRAIN.shiftDownRPM;
    transmission.mShiftUpRPM = DRIVETRAIN.shiftUpRPM;
    transmission.mSwitchTime = DRIVETRAIN.switchTime;
    transmission.mClutchReleaseTime = DRIVETRAIN.clutchReleaseTime;
    transmission.mSwitchLatency = DRIVETRAIN.switchLatency;
    transmission.mClutchStrength = DRIVETRAIN.clutchStrength;
    controllerSettings.mDifferentialLimitedSlipRatio = LIMITED_SLIP_RATIO;
    controllerSettings.mDifferentials.clear();
    for (const [left, right, ratio] of [
        [0, 1, FRONT_TORQUE_RATIO],
        [2, 3, 1 - FRONT_TORQUE_RATIO],
    ] as const) {
        if (ratio === 0) continue;
        const diff = new Jolt.VehicleDifferentialSettings();
        diff.mLeftWheel = left;
        diff.mRightWheel = right;
        diff.mEngineTorqueRatio = ratio;
        diff.mLimitedSlipRatio = LIMITED_SLIP_RATIO;
        controllerSettings.mDifferentials.push_back(diff);
    }
    vehicle.mController = controllerSettings;

    const constraint = new Jolt.VehicleConstraint(body, vehicle);
    constraint.SetVehicleCollisionTester(
        new Jolt.VehicleCollisionTesterCastCylinder(LAYER_MOVING, 1),
    );
    physics.physicsSystem.AddConstraint(constraint);
    physics.physicsSystem.AddStepListener(new Jolt.VehicleConstraintStepListener(constraint));
    const controller = Jolt.castObject(constraint.GetController(), Jolt.WheeledVehicleController);

    const chassisGroup = new THREE.Group();
    const chassisMesh = new THREE.Mesh(
        new THREE.BoxGeometry(HALF_W * 2, HALF_H * 2, HALF_L * 2),
        new THREE.MeshStandardMaterial({ color: 0x2266dd, roughness: 0.5, metalness: 0.4 }),
    );
    chassisMesh.castShadow = true;
    chassisGroup.add(chassisMesh);
    // Cabin on top, shifted slightly back, so the car has a visible front.
    const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(HALF_W * 1.6, HALF_H * 1.6, HALF_L * 0.9),
        new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.3, metalness: 0.6 }),
    );
    cabin.position.set(0, HALF_H * 1.8, -HALF_L * 0.2);
    cabin.castShadow = true;
    chassisGroup.add(cabin);

    const wheelMeshes: THREE.Object3D[] = [];
    for (let i = 0; i < WHEEL_COUNT; i++) {
        const mesh = buildWheelMesh(WHEEL_RADIUS, WHEEL_WIDTH);
        chassisGroup.add(mesh);
        wheelMeshes.push(mesh);
    }

    return new GameObject('car', [
        new BodyComponent(physics, body),
        new MeshComponent(scene, chassisGroup),
        new CarBehavior(physics, body, constraint, controller, chassisGroup, wheelMeshes, terrain),
    ]);
}

function buildWheelMesh(radius: number, width: number): THREE.Mesh {
    // Native CylinderGeometry has its axis on +Y. Keep it that way so the
    // wheelRight=(0,1,0) / wheelUp=(1,0,0) reference vectors used by the
    // CarBehavior to query GetWheelLocalTransform line up with the mesh.
    const geom = new THREE.CylinderGeometry(radius, radius, width, 24);
    const mesh = new THREE.Mesh(
        geom,
        new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.9,
            metalness: 0.1,
        }),
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Spoke marker so wheel spin is visible. The box lies in the wheel's
    // disc plane (XZ in the mesh's native frame): thin along Y (axle), tall
    // along Z (radius), narrow along X.
    const marker = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, width * 1.15, radius * 1.7),
        new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.5 }),
    );
    marker.castShadow = true;
    mesh.add(marker);

    return mesh;
}
