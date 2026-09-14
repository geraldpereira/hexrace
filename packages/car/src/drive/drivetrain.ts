import { Injectable } from '@angular/core';
import { clamp } from 'lodash-es';

const RPM_PER_RAD_PER_SECOND = 60 / (2 * Math.PI);

/**
 * The gearbox as this package sees it, Jolt owning the automatic one. `topGear` and `stepGear`
 * drive the manual box of the debug option, from reverse through neutral to the last ratio;
 * `manualClutch` is the ramp Jolt does not run in manual mode, open for the switch time then
 * released linearly; `engineRpm` reads the revs a gear and a wheel speed imply.
 */
@Injectable({ providedIn: 'root' })
export class Drivetrain {
  topGear(ratios: readonly number[]): number {
    return ratios.length;
  }

  /** The gear one press up or down leads to, kept between reverse and the top gear. */
  stepGear(current: number, up: boolean, down: boolean, top: number): number {
    return clamp(current + (up ? 1 : 0) - (down ? 1 : 0), -1, top);
  }

  manualClutch(gear: number, age: number, switchTime: number, releaseTime: number): number {
    if (gear === 0) return 0;
    if (age < switchTime) return 0;
    return releaseTime > 0 ? Math.min((age - switchTime) / releaseTime, 1) : 1;
  }

  /** Revs a wheel turning at `wheelRate` rad/s implies in that gear, 0 in neutral. */
  engineRpm(ratios: readonly number[], reverse: number, gear: number, wheelRate: number): number {
    if (gear === 0) return 0;
    const ratio = gear < 0 ? reverse : (ratios[gear - 1] ?? 0);
    return Math.abs(wheelRate * ratio) * RPM_PER_RAD_PER_SECOND;
  }
}
