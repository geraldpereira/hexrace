/**
 * Chassis figures shared by `createCar` (initial Jolt body) and the debug
 * panel (live edits). Half-extents of the collision box, the mass, and where
 * the centre of mass sits relative to the box centre. Mass and balance are
 * car characteristics: a light nimble car versus a heavy planted one.
 */
export interface ChassisSpec {
    halfW: number;
    halfH: number;
    halfL: number;
    mass: number;
    /** Centre of mass offset from the box centre (m). Negative y = low. */
    comX: number;
    comY: number;
    comZ: number;
}

// Compact rally car. Centre of mass dropped to the bottom of the box:
// engine and drivetrain sit low, which keeps the car from rolling over.
export const CHASSIS: ChassisSpec = {
    halfW: 0.8,
    halfH: 0.3,
    halfL: 1.9,
    mass: 1300,
    comX: 0,
    comY: -0.3,
    comZ: 0,
};
