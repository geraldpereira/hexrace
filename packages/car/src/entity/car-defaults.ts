import { type CarOptions } from '@car/entity/car-options';
import { type CarSpec } from '@car/entity/car-spec';

/** The compact rally car of POC 1, tuned by ear and by feel; nothing here is redesigned. */
export const DEFAULT_CAR_SPEC: CarSpec = {
  name: 'Rally compact',
  chassis: {
    halfWidth: 0.8,
    halfHeight: 0.3,
    halfLength: 1.9,
    mass: 1300,
    comX: 0,
    comY: -0.3,
    comZ: 0,
  },
  wheels: {
    radius: 0.34,
    width: 0.22,
    attachY: -0.3,
    frontZ: 1.3,
    backZ: -1.3,
    suspensionMin: 0.05,
    suspensionMax: 0.25,
    suspensionFrequency: 2.5,
    suspensionDamping: 0.7,
    antiRollStiffness: 1000,
    frontBrakeTorque: 3000,
    backBrakeTorque: 2000,
    handBrakeTorque: 6000,
  },
  engine: {
    maxTorque: 600,
    minRpm: 800,
    maxRpm: 4500,
    torqueCurve: [
      { x: 0, y: 0.45 },
      { x: 0.3, y: 0.7 },
      { x: 0.65, y: 1 },
      { x: 0.85, y: 0.92 },
      { x: 1, y: 0.7 },
    ],
    inertia: 0.5,
    angularDamping: 0.2,
  },
  gearbox: {
    ratios: [3.2, 2.1, 1.5, 1.15, 0.9],
    reverseRatio: -3.2,
    shiftUpRpm: 3900,
    shiftDownRpm: 1700,
    switchTime: 0.25,
    clutchReleaseTime: 0.2,
    switchLatency: 0.5,
    clutchStrength: 10,
  },
  steering: {
    degressive: true,
    maxAtRestDeg: 32,
    maxAtSpeedDeg: 12,
    fullEffectKmh: 100,
    steerResponse: 0.6,
    throttleResponse: 0.3,
    brakeResponse: 0.3,
  },
  transmission: 'all',
  limitedSlipRatio: 1.4,
  handBrakeLateralGrip: 0.3,
};

/** Every assist off, as a car leaves the garage: at the pad the raw drive feels better (3.1). */
export const DEFAULT_CAR_OPTIONS: CarOptions = {
  abs: {
    enabled: false,
    slipThreshold: 0.3,
    slipRange: 0.5,
    strength: 0.5,
    minSpeedKmh: 5,
    releaseTime: 0.1,
  },
  tractionControl: {
    enabled: false,
    slipThreshold: 0.3,
    slipRange: 0.25,
    strength: 0.5,
    minSpeedKmh: 5,
    releaseTime: 0.1,
  },
  wing: { enabled: false, coefficient: 5, balance: -0.6 },
  yawDamping: { enabled: false, damping: 1 },
};
