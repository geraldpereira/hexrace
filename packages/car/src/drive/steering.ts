import { Injectable } from '@angular/core';
import { clamp } from 'lodash-es';

import { type SteeringSpec } from '@car/entity/car-spec';

/**
 * The wheel and the pedals as the driver feels them (POC 1). `shape` blends an axis between
 * linear and cubic, which softens the centre while full deflection still reaches 1; `maxAngleDeg`
 * is the degressive law of the functional spec 3.1, the lock falling linearly from its value at
 * rest to its value at speed. Validated at 32° standing and 12° at 100 km/h.
 */
@Injectable({ providedIn: 'root' })
export class Steering {
  shape(x: number, cubic: number): number {
    const a = Math.abs(x);
    return Math.sign(x) * ((1 - cubic) * a + cubic * a * a * a);
  }

  maxAngleDeg(spec: SteeringSpec, speedKmh: number): number {
    if (!spec.degressive || spec.fullEffectKmh <= 0) return spec.maxAtRestDeg;
    const t = clamp(speedKmh / spec.fullEffectKmh, 0, 1);
    return spec.maxAtRestDeg + (spec.maxAtSpeedDeg - spec.maxAtRestDeg) * t;
  }
}
