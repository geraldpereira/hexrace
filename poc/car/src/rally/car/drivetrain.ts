import type { CurvePoint } from '../../engine/debug/curveEditor';

/**
 * Engine and gearbox figures, in one place so `createCar` (Jolt settings)
 * and the debug panel (initial editor values) agree. Everything here maps
 * onto Jolt's own VehicleEngine / VehicleTransmission: nothing is simulated
 * by hand. The gearbox stays automatic (spec 3): no manual shifting.
 */
export interface DrivetrainSpec {
    maxTorque: number;
    minRPM: number;
    maxRPM: number;
    /** Torque fraction against RPM / maxRPM. Jolt's default is flat-ish (0.8 → 1 → 0.8). */
    torqueCurve: CurvePoint[];
    /** Engine inertia (kg·m²): how fast the revs climb with the clutch open. */
    inertia: number;
    /** Engine angular damping: how fast the revs fall back with no throttle. */
    angularDamping: number;
    /** Forward gear ratios, first gear first. */
    gearRatios: number[];
    /** Reverse gear ratio (negative). */
    reverseRatio: number;
    shiftUpRPM: number;
    shiftDownRPM: number;
    /** Time (s) with the clutch open while a gear changes. */
    switchTime: number;
    /** Time (s) to release the clutch after the new gear is in. */
    clutchReleaseTime: number;
    /** Minimum time (s) between two gear changes. */
    switchLatency: number;
    clutchStrength: number;
}

export const DRIVETRAIN: DrivetrainSpec = {
    maxTorque: 600,
    minRPM: 800,
    // Low-revving, torquey engine: the whole band fits in 800–4500 RPM so
    // the note stays low and the gears are audible.
    maxRPM: 4500,
    // A rally-ish curve: weak under 2000, peak around 4500, tailing off at
    // the limiter so short-shifting doesn't pay.
    torqueCurve: [
        { x: 0, y: 0.45 },
        { x: 0.3, y: 0.7 },
        { x: 0.65, y: 1 },
        { x: 0.85, y: 0.92 },
        { x: 1, y: 0.7 },
    ],
    inertia: 0.5,
    angularDamping: 0.2,
    gearRatios: [3.2, 2.1, 1.5, 1.15, 0.9],
    reverseRatio: -3.2,
    shiftUpRPM: 3900,
    shiftDownRPM: 1700,
    switchTime: 0.25,
    clutchReleaseTime: 0.2,
    switchLatency: 0.5,
    clutchStrength: 10,
};
