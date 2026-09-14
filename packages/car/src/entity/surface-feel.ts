import { type EnvironmentId, type Zone } from '@hexrace/tile';

import { type CurvePoint } from '@car/entity/car-spec';
import { type Point3 } from '@car/entity/vectors';

/** What a sliding tyre sounds like: 0 a grainy crunch, 1 a tonal squeal, mixed in between. */
export interface SlideSound {
  tone: number;
  freq: number;
  q: number;
  grainRate: number;
  grainDur: number;
  level: number;
}

/** What rolling over it sounds like: tyre roar under a cut-off, grains and a low rumble. */
export interface RollSound {
  hiss: number;
  hissFreq: number;
  grainRate: number;
  grainDur: number;
  grainLevel: number;
  rumble: number;
}

/** What the wheels throw up: soft puffs that drift, and solid bits under gravity. */
export interface SurfaceParticles {
  dustColor: number;
  dustAlpha: number;
  dustSize: number;
  dustLife: number;
  slideDust: number;
  rollDust: number;
  debrisColor: number;
  debrisSize: number;
  debrisLife: number;
  slideDebris: number;
  rollDebris: number;
}

/**
 * How one surface rank drives, sounds and looks under a wheel. The friction curves are effective
 * μ, what the tyre actually gets: the physics squares them before handing them to Jolt, whose
 * ground bodies have friction 1 and combine as the square root of the product. `grain` shakes the
 * car with virtual bumps the ground mesh does not carry, `drag` and `rolling` bog it down.
 */
export interface SurfaceFeel {
  /** The rank's character, for the panel; never the matter (functional spec 2.2). */
  readonly key: string;
  longitudinal: CurvePoint[];
  lateral: CurvePoint[];
  /** Wheel spin damping, standing in for rolling resistance. */
  rolling: number;
  /** Horizontal drag on the chassis per wheel in contact, in N per m/s. */
  drag: number;
  /** Height of the virtual bumps under a wheel, in metres. */
  bumpHeight: number;
  /** Sideways noise force, as a fraction of the wheel's static load at the reference speed. */
  lateralRoughness: number;
  /** Metres between two grain bumps: short shakes, long ruts. */
  wavelength: number;
  markColor: number;
  markOpacity: number;
  slideSound: SlideSound;
  rollSound: RollSound;
  particles: SurfaceParticles;
}

/** The eight ranks of one environment, ordered by decreasing grip (functional spec 2.2). */
export interface EnvironmentFeels {
  readonly road: readonly [SurfaceFeel, SurfaceFeel, SurfaceFeel];
  readonly shoulder: readonly [SurfaceFeel, SurfaceFeel, SurfaceFeel];
  readonly landscape: readonly [SurfaceFeel, SurfaceFeel];
}

/** Where a wheel is standing: the environment of the track, the zone and the rank, 1 first. */
export interface SurfaceQuery {
  readonly environment: EnvironmentId;
  readonly zone: Zone;
  readonly rank: number;
}

/**
 * What the caller of the car answers about the ground under a point: the showcase reads its flat
 * painted zones, a race will read `TileSurfaces` on the tile the point falls in. Null means
 * nobody owns the point, and the wheel keeps the surface it had.
 */
export interface SurfaceProbe {
  at(point: Point3): SurfaceQuery | null;
}
