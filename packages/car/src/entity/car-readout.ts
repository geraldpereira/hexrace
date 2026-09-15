import { type Swell } from '@hexrace/tile';

import { type CarState } from '@car/entity/car-state';
import { type SurfaceFeel } from '@car/entity/surface-feel';
import { type Point3, type QuatMut, type Vec3Mut } from '@car/entity/vectors';

/**
 * One wheel after a step: whether it touches, what it stands on, how hard it slips and where its
 * contact is in world space. Jolt's own cast gives all of it, one step stale at 60 Hz, which is
 * invisible for marks, particles and sound. `bump` is the virtual grain height the suspension
 * was preloaded with, so the wheel mesh can ride over ground the collider does not carry.
 */
export interface WheelContact {
  contact: boolean;
  surface: SurfaceFeel;
  /** The long swell of the surface, which the ground mesh shades but does not carry. */
  swell: Swell;
  longitudinalSlip: number;
  lateralSlipDeg: number;
  /** Tyre surface speed against the ground along the rolling direction, m/s. */
  slipSpeed: number;
  /** Suspension length change rate, m/s, negative while compressing. */
  suspensionVelocity: number;
  hardHit: boolean;
  width: number;
  bump: number;
  readonly point: Vec3Mut;
  readonly normal: Vec3Mut;
  readonly lateral: Vec3Mut;
  readonly longitudinal: Vec3Mut;
}

/** Where a wheel's mesh goes, in the chassis' own frame, the bump lift already added. */
export interface WheelPose {
  readonly position: Vec3Mut;
  readonly rotation: QuatMut;
}

/** Where the car's meshes go this frame: the chassis in world space, the wheels under it. */
export interface CarPose {
  readonly position: Vec3Mut;
  readonly rotation: QuatMut;
  readonly wheels: readonly WheelPose[];
}

/**
 * Everything the car shows of itself: what the HUD reads, what the marks, the particles and the
 * four sound layers follow. The physics writes it, `render/` and `audio/` only read it, which is
 * how those two sub-modules never have to know each other (technical spec 2.1).
 */
export interface CarReadout {
  readonly state: CarState;
  readonly contacts: readonly WheelContact[];
  readonly pose: CarPose;
  readonly velocity: Point3;
}

/** How hard each wheel is sliding, 0 to 1: the marks decide it, the sound and the dust follow. */
export interface SlideReadout {
  readonly wheelIntensity: readonly number[];
}
