import { Injectable, inject } from '@angular/core';

import { type SurfaceFeel } from '@car/entity/surface-feel';
import { Noise } from '@car/drive/noise';

const REF_SPEED = 10;
const MAX_SPEED_FACTOR = 2;
const WHEEL_OFFSET = 7.31;
const LATERAL_OFFSET = 100;

/**
 * The grain of a surface, sampled along the distance travelled in wavelengths so a parked car is
 * still (POC 1). Vertically it is a virtual bump height pushed into the suspension preload, the
 * spring acting as if the ground had risen: a force could not do this, at 5 Hz even a full-load
 * one moves 1300 kg by millimetres. Sideways it is a noise force growing with speed, read far
 * enough away in the field to be uncorrelated with the bumps.
 */
@Injectable({ providedIn: 'root' })
export class Grain {
  private readonly noise = inject(Noise);

  /** Virtual bump height under a wheel, in metres. */
  bump(feel: SurfaceFeel, travelled: number, wheel: number): number {
    return feel.bumpHeight * this.noise.at(wheel * WHEEL_OFFSET, this.phase(feel, travelled));
  }

  /** Sideways force at a wheel, in newtons, across its rolling direction. */
  lateral(
    feel: SurfaceFeel,
    travelled: number,
    wheel: number,
    load: number,
    speed: number,
  ): number {
    const factor = Math.min(speed / REF_SPEED, MAX_SPEED_FACTOR);
    const sample = this.noise.at(
      wheel * WHEEL_OFFSET + LATERAL_OFFSET,
      this.phase(feel, travelled),
    );
    return feel.lateralRoughness * load * factor * sample;
  }

  private phase(feel: SurfaceFeel, travelled: number): number {
    return travelled / feel.wavelength;
  }
}
