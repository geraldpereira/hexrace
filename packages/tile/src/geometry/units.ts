import { Injectable } from '@angular/core';
import { type Vec2, Vec3 } from '@hexrace/commons';

import { HEIGHT_UNIT, UNIT_METERS } from '@tile/entity/units';

/**
 * Conversions between the model's units (lane widths, height steps) and the 3D world's metres
 * (functional spec 2.1 and 2.3). `toWorld` is the last step before three.js and Jolt: the plane's
 * x stays x, its north becomes -z, the height becomes y, all in metres.
 */
@Injectable({ providedIn: 'root' })
export class Units {
  metersToUnits(meters: number): number {
    return meters / UNIT_METERS;
  }

  unitsToMeters(units: number): number {
    return units * UNIT_METERS;
  }

  stepsToUnits(steps: number): number {
    return steps * HEIGHT_UNIT;
  }

  toWorld(p: Vec2, height: number): Vec3 {
    return new Vec3(p.x * UNIT_METERS, height * UNIT_METERS, -p.y * UNIT_METERS);
  }
}
