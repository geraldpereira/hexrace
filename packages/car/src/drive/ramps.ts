import { Injectable } from '@angular/core';
import { clamp } from 'lodash-es';

/**
 * The ramp POC 1 keys its thresholds on: 0 at or before `start`, 1 at or after `full`, linear
 * between, and, when the two are equal, a plain step. `Maths.ramp` in commons answers 0 on that
 * degenerate case; here a threshold with no span has to mean "on above it", because that is how a
 * mark, a squeal and a suspension thump are turned off by pulling their two knobs together.
 */
@Injectable({ providedIn: 'root' })
export class Ramps {
  at(value: number, start: number, full: number): number {
    if (full <= start) return value >= full ? 1 : 0;
    return clamp((value - start) / (full - start), 0, 1);
  }
}
