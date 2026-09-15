import { Injectable, inject } from '@angular/core';
import { Noise } from '@hexrace/commons';
import { type Swell } from '@hexrace/tile';

import { type SurfaceFeel } from '@car/entity/surface-feel';

const REF_SPEED = 10;
const MAX_SPEED_FACTOR = 2;
const LATERAL_OFFSET = 100;

/**
 * The roughness of a surface at the world place a wheel stands on: the short grain of POC 1 and
 * the long swell that heaves a landscape, added. Being of the place and not of the distance run, a
 * parked car is still, two wheels read apart, a crest is found again, and the mesh can light the
 * very field the suspension climbs. The bump enters the suspension preload, the spring acting as
 * if the ground had risen; sideways it is a noise force growing with speed, read far from it.
 */
@Injectable({ providedIn: 'root' })
export class Grain {
  private readonly noise = inject(Noise);

  /** Virtual bump height under a wheel standing at a world place, in metres. */
  bump(feel: SurfaceFeel, swell: Swell, x: number, z: number): number {
    return this.wave(feel.bumpHeight, feel.wavelength, x, z) + this.swell(swell, x, z);
  }

  /** The long swell alone at a world place, in metres: what the ground mesh shades. */
  swell(swell: Swell, x: number, z: number): number {
    return this.wave(swell.height, swell.length, x, z);
  }

  /** Sideways force at a wheel, in newtons, across its rolling direction. */
  lateral(feel: SurfaceFeel, x: number, z: number, load: number, speed: number): number {
    const factor = Math.min(speed / REF_SPEED, MAX_SPEED_FACTOR);
    const sample = this.noise.at(x / feel.wavelength + LATERAL_OFFSET, z / feel.wavelength);
    return feel.lateralRoughness * load * factor * sample;
  }

  private wave(height: number, length: number, x: number, z: number): number {
    if (height === 0 || length <= 0) return 0;
    return height * this.noise.at(x / length, z / length);
  }
}
