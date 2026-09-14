/**
 * The car (functional spec 3): `entity/` its model, its garage options and the per-surface table,
 * data alone; `drive/` the driving logic in services, no three.js and no Jolt; `physics/` the Jolt
 * body and `CarController`, which drives it and is its own `CameraTarget`; `render/` the meshes,
 * the marks and the dust; `audio/` the four procedural layers behind one `AudioHub`. It knows no
 * track: whoever has one hands it a `SurfaceProbe` that says what is under a wheel.
 */
export { AudioHub, type Voice, type WorkletSource } from '@car/audio/audio-hub';
export { ChassisSound } from '@car/audio/chassis-sound';
export { ChassisWorklet } from '@car/audio/chassis-worklet';
export { EngineSound } from '@car/audio/engine-sound';
export { EngineWorklet } from '@car/audio/engine-worklet';
export { SurfaceSound } from '@car/audio/surface-sound';
export { TyreSound } from '@car/audio/tyre-sound';
export { TyreWorklet } from '@car/audio/tyre-worklet';
export { Assists } from '@car/drive/assists';
export { Drivetrain } from '@car/drive/drivetrain';
export { EngineModel } from '@car/drive/engine-model';
export { Grain } from '@car/drive/grain';
export { Noise } from '@car/drive/noise';
export { Ramps } from '@car/drive/ramps';
export { Steering } from '@car/drive/steering';
export { Surfaces } from '@car/drive/surfaces';
export { DEFAULT_CAR_OPTIONS, DEFAULT_CAR_SPEC } from '@car/entity/car-defaults';
export { type CarCollision, type CarReset, type CarShift } from '@car/entity/car-events';
export {
  type AssistState,
  type CarOptions,
  type SlipAssist,
  type WingOption,
  type YawDampingOption,
} from '@car/entity/car-options';
export {
  type CarPose,
  type CarReadout,
  type SlideReadout,
  type WheelContact,
  type WheelPose,
} from '@car/entity/car-readout';
export {
  type CarSpec,
  type ChassisSpec,
  type CurvePoint,
  type EngineSpec,
  type GearboxSpec,
  type SteeringSpec,
  type Transmission,
  type WheelsSpec,
} from '@car/entity/car-spec';
export { type CarState, IDLE_CAR_STATE } from '@car/entity/car-state';
export { type GearboxState, IDLE_GEARBOX } from '@car/entity/gearbox-state';
export {
  type EnvironmentFeels,
  type RollSound,
  type SlideSound,
  type SurfaceFeel,
  type SurfaceParticles,
  type SurfaceProbe,
  type SurfaceQuery,
} from '@car/entity/surface-feel';
export { type SurfaceRanks } from '@car/entity/surface-ranks';
export { SURFACE_CATALOG } from '@car/entity/surfaces/surface-catalog';
export { type Point3, type QuatMut, type Vec3Mut } from '@car/entity/vectors';
export { CarBodies } from '@car/physics/car-bodies';
export { CarController } from '@car/physics/car-controller';
export { CarForces } from '@car/physics/car-forces';
export { CarPoses } from '@car/physics/car-poses';
export { type CarRig } from '@car/physics/car-rig';
export { CarTelemetry, type DriverInput } from '@car/physics/car-telemetry';
export { ChassisAxes } from '@car/physics/chassis-axes';
export { ManualGearbox } from '@car/physics/manual-gearbox';
export { WheelContacts } from '@car/physics/wheel-contacts';
export { WheelSurfaces } from '@car/physics/wheel-surfaces';
export { type CarMeshSet, CarMeshes } from '@car/render/car-meshes';
export { CarParticles } from '@car/render/car-particles';
export { CarView } from '@car/render/car-view';
export { type Puff, type PuffCloud, Puffs } from '@car/render/puffs';
export { SkidMarks } from '@car/render/skid-marks';
