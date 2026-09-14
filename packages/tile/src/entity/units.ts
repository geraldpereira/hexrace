/** One unit of length, a car width, in metres: 1.7 m to fix ideas until a car drives the tiles. */
export const UNIT_METERS = 1.7;
/** One height step, in metres; heights do not depend on the car (functional spec 2.3). */
export const HEIGHT_STEP_METERS = 0.2;
/** One height step, in units of length. */
export const HEIGHT_UNIT = HEIGHT_STEP_METERS / UNIT_METERS;
/** The most a track spans from lowest to highest, in steps: 200 m. */
export const MAX_AMPLITUDE_STEPS = 1000;
/** The skirt goes this far below the track's lowest point, in metres (functional spec 2.7). */
export const SKIRT_DEPTH_METERS = 2;
