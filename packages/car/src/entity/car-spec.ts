/** A point of a normalised curve, x in 0..1 and y the value the curve reads there. */
export interface CurvePoint {
  x: number;
  y: number;
}

/** Which axle the engine drives; the POC ran all four (functional spec 3.1). */
export type Transmission = 'front' | 'rear' | 'all';

/**
 * The collision box, the mass and where the centre of mass sits relative to the box centre.
 * Mass and balance are what makes a car's character: light and nimble against heavy and planted.
 * Metres and kilograms; a negative `comY` drops the centre of mass, which keeps the car flat.
 */
export interface ChassisSpec {
  halfWidth: number;
  halfHeight: number;
  halfLength: number;
  mass: number;
  comX: number;
  comY: number;
  comZ: number;
}

/**
 * The four wheels: their geometry, their suspension and their brakes. `attachY` is where the
 * strut hangs from the chassis box, `frontZ` and `backZ` the axles along the local +Z, which
 * points at the nose. Torques in N·m, lengths in metres, the spring frequency in Hz.
 */
export interface WheelsSpec {
  radius: number;
  width: number;
  attachY: number;
  frontZ: number;
  backZ: number;
  suspensionMin: number;
  suspensionMax: number;
  suspensionFrequency: number;
  suspensionDamping: number;
  antiRollStiffness: number;
  frontBrakeTorque: number;
  backBrakeTorque: number;
  handBrakeTorque: number;
}

/** The engine Jolt runs: peak torque, its band, the shape of the curve and how freely it revs. */
export interface EngineSpec {
  maxTorque: number;
  minRpm: number;
  maxRpm: number;
  torqueCurve: CurvePoint[];
  inertia: number;
  angularDamping: number;
}

/**
 * The gearbox, automatic in the game and manual as a debug option: forward ratios first gear
 * first, one reverse ratio (negative), the two shift points and the clutch timings in seconds.
 */
export interface GearboxSpec {
  ratios: number[];
  reverseRatio: number;
  shiftUpRpm: number;
  shiftDownRpm: number;
  switchTime: number;
  clutchReleaseTime: number;
  switchLatency: number;
  clutchStrength: number;
}

/**
 * The steering, degressive with speed: the maximum angle falls linearly from `maxAtRestDeg` to
 * `maxAtSpeedDeg`, reached at `fullEffectKmh`. Three numbers per model, never bought at the
 * garage (functional spec 3.1). The responses blend the input between linear and cubic.
 */
export interface SteeringSpec {
  degressive: boolean;
  maxAtRestDeg: number;
  maxAtSpeedDeg: number;
  fullEffectKmh: number;
  steerResponse: number;
  throttleResponse: number;
  brakeResponse: number;
}

/**
 * One car model: everything fixed by the model and not touched at the garage (functional spec
 * 3.1). The fields are mutable on purpose, the lab panel edits them live and the physics reads
 * them back each step; a race clones the default rather than sharing it.
 */
export interface CarSpec {
  name: string;
  chassis: ChassisSpec;
  wheels: WheelsSpec;
  engine: EngineSpec;
  gearbox: GearboxSpec;
  steering: SteeringSpec;
  transmission: Transmission;
  /** Torque a differential may send to its faster wheel, as a ratio of the slower one's. */
  limitedSlipRatio: number;
  /** Rear lateral grip factor while the hand brake is pulled: the arcade flick. */
  handBrakeLateralGrip: number;
}
