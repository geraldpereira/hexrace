import { Injectable } from '@angular/core';
import { clamp } from 'lodash-es';

import { type AssistState, type SlipAssist } from '@car/entity/car-options';

/**
 * ABS and traction control, the two garage options that watch a slip and cut an input (POC 1).
 * Both read Jolt's longitudinal slip ratio, the same quantity the friction curves key on, so a
 * threshold sits naturally just past the μ peak. The cut jumps to its target and falls back over
 * `releaseTime`, which modulates instead of chattering; the state is the car's, not the service's.
 */
@Injectable({ providedIn: 'root' })
export class Assists {
  /** Advances the cut and returns the multiplier to put on the input this step. */
  limit(
    state: AssistState,
    assist: SlipAssist,
    slip: number,
    speedKmh: number,
    active: boolean,
    dt: number,
  ): number {
    const wanted =
      assist.enabled && active && speedKmh >= assist.minSpeedKmh && assist.slipRange > 0
        ? clamp((slip - assist.slipThreshold) / assist.slipRange, 0, 1)
        : 0;
    const release = assist.releaseTime > 0 ? dt / assist.releaseTime : 1;
    state.cut = Math.max(wanted, state.cut - release);
    return 1 - assist.strength * state.cut;
  }
}
