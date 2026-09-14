/**
 * An assist that cuts an input as the wheels slip: ABS on the brake, traction control on the
 * throttle. Both watch Jolt's longitudinal slip ratio, so a threshold just past the friction
 * peak is natural; the cut rises at once and releases over `releaseTime`, so it modulates
 * instead of chattering. Bought at the garage, then tuned freely (functional spec 6.2).
 */
export interface SlipAssist {
  enabled: boolean;
  slipThreshold: number;
  slipRange: number;
  /** Fraction of the input removed at full cut. */
  strength: number;
  /** Under this speed the slip ratio means nothing, so the assist stays out. */
  minSpeedKmh: number;
  releaseTime: number;
}

/** How much of an assist is cutting right now, 0 to 1; the lamp and the release ramp read it. */
export interface AssistState {
  cut: number;
}

/** The bought wing: downforce per (m/s)² and where it pushes, -1 rear axle to +1 front axle. */
export interface WingOption {
  enabled: boolean;
  coefficient: number;
  balance: number;
}

/** A torque against the yaw rate, in 1/s; meant for the touch screen, cut at the pad. */
export interface YawDampingOption {
  enabled: boolean;
  damping: number;
}

/**
 * What the player buys and tunes for one car (functional spec 6.2). ABS, traction control and
 * the wing are the three garage options; yaw damping is not sold, it is the touch assist the
 * POC left off at the pad. All off by default.
 */
export interface CarOptions {
  abs: SlipAssist;
  tractionControl: SlipAssist;
  wing: WingOption;
  yawDamping: YawDampingOption;
}
