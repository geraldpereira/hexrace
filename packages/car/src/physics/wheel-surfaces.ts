import { Injectable } from '@angular/core';
import type Jolt from 'jolt-physics';

import { type CurvePoint } from '@car/entity/car-spec';
import { type SurfaceFeel } from '@car/entity/surface-feel';

/**
 * Pushes a surface into a wheel's Jolt settings: the two friction curves and the spin damping
 * that stands in for rolling resistance. The curves in a `SurfaceFeel` are effective μ, so they
 * are squared here: Jolt combines tyre and ground as the square root of the product and every
 * ground body has friction 1, which makes the tyre see exactly the value written in the table.
 */
@Injectable({ providedIn: 'root' })
export class WheelSurfaces {
  apply(wheel: Jolt.WheelWV, feel: SurfaceFeel, lateralScale: number): void {
    const settings = wheel.GetSettings();
    this.curve(settings.mLongitudinalFriction, feel.longitudinal, 1);
    this.curve(settings.mLateralFriction, feel.lateral, lateralScale);
    settings.mAngularDamping = feel.rolling;
  }

  private curve(target: Jolt.LinearCurve, points: readonly CurvePoint[], scale: number): void {
    target.Clear();
    for (const point of points) {
      const mu = point.y * scale;
      target.AddPoint(point.x, mu * mu);
    }
    target.Sort();
  }
}
