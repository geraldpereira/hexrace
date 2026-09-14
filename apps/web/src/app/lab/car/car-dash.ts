import { signal } from '@angular/core';
import { type CarOptions, type CarState, DEFAULT_CAR_OPTIONS } from '@hexrace/car';
import { type AssistReadout } from '@hexrace/hud';

const ACTING = 0.01;
const RESET_SECONDS = 3;

/**
 * The gauges of a page that drives a car, as signals the HUD reads: two pages do, `lab/car` and
 * `lab/race`, and both show the same dashboard. `read` is called once a frame with the car's
 * state. An assist that was never bought shows no lamp at all, which is what a null stands for.
 */
export class CarDash {
  /** What the garage sold, which says which lamps exist at all. */
  options: CarOptions = DEFAULT_CAR_OPTIONS;

  readonly rpm = signal(0);
  readonly gear = signal(0);
  readonly kmh = signal(0);
  readonly limiter = signal(false);
  readonly shiftHint = signal(false);
  readonly resetProgress = signal(0);
  readonly assists = signal<AssistReadout>({ abs: null, tractionControl: null });

  read(state: CarState): void {
    const options = this.options;
    this.rpm.set(Math.round(state.rpm));
    this.gear.set(state.gear);
    this.kmh.set(Math.round(state.speedKmh));
    this.limiter.set(state.limiter);
    this.shiftHint.set(state.shiftHint);
    this.resetProgress.set(state.resetHeld / RESET_SECONDS);
    this.assists.set({
      abs: options.abs.enabled ? state.absCut > ACTING : null,
      tractionControl: options.tractionControl.enabled ? state.tractionCut > ACTING : null,
    });
  }
}
