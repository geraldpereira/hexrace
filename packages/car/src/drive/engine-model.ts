import { Injectable } from '@angular/core';
import { clamp } from 'lodash-es';

const LIMITER_REV_SHARE = 0.97;
const LIMITER_THROTTLE = 0.5;
const FLAT_SHIFT_THROTTLE = 0.7;

/**
 * What the revs mean, apart from Jolt which runs the engine itself. `revShare` is the fraction of
 * the maximum, the number the rev counter and the sound both key on; `onLimiter` says when the
 * ignition is being chopped, either against the ceiling or through a full-throttle upshift, and
 * `shiftHint` when a manual box would like the next gear (functional spec 7.5).
 */
@Injectable({ providedIn: 'root' })
export class EngineModel {
  revShare(rpm: number, maxRpm: number): number {
    return clamp(rpm / Math.max(maxRpm, 1), 0, 1);
  }

  onLimiter(revShare: number, throttle: number, shifting: boolean): boolean {
    const ceiling = revShare >= LIMITER_REV_SHARE && throttle >= LIMITER_THROTTLE;
    return ceiling || (shifting && throttle >= FLAT_SHIFT_THROTTLE);
  }

  shiftHint(rpm: number, shiftUpRpm: number, gear: number, topGear: number): boolean {
    return gear > 0 && gear < topGear && rpm >= shiftUpRpm;
  }
}
