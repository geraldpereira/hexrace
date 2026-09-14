/**
 * What the car is doing this frame, the snapshot the HUD, the sound and the panel read
 * (functional spec 7.2). Nothing here is a control: the controller fills it after the step, and
 * whoever displays it never writes it back. Speeds in km/h, angles in degrees.
 */
export interface CarState {
  speedKmh: number;
  rpm: number;
  minRpm: number;
  maxRpm: number;
  shiftUpRpm: number;
  /** Negative reverse, 0 neutral, 1 and up forward. */
  gear: number;
  throttle: number;
  brake: number;
  steer: number;
  handBrake: number;
  /** Clutch friction, 0 open and 1 locked. */
  clutch: number;
  shifting: boolean;
  /** The revs are against the limiter, or a full-throttle upshift is cutting the ignition. */
  limiter: boolean;
  /** In a manual box, the revs are past the shift-up point. */
  shiftHint: boolean;
  absCut: number;
  tractionCut: number;
  /** Current maximum steering angle after the degressive law. */
  steerMaxDeg: number;
  yawRateDeg: number;
  /** Downforce as a percentage of the car's weight. */
  downforcePercent: number;
  /** No wheel is touching the ground. */
  airborne: boolean;
  /** Seconds the reset button has been held, of the three the spec asks (3.8). */
  resetHeld: number;
}

/** A car standing still with the engine off: what a state starts at, and what a test compares to. */
export const IDLE_CAR_STATE: Readonly<CarState> = {
  speedKmh: 0,
  rpm: 0,
  minRpm: 0,
  maxRpm: 1,
  shiftUpRpm: 1,
  gear: 0,
  throttle: 0,
  brake: 0,
  steer: 0,
  handBrake: 0,
  clutch: 0,
  shifting: false,
  limiter: false,
  shiftHint: false,
  absCut: 0,
  tractionCut: 0,
  steerMaxDeg: 0,
  yawRateDeg: 0,
  downforcePercent: 0,
  airborne: true,
  resetHeld: 0,
};
