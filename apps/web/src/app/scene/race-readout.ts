import { signal } from '@angular/core';

import { DEFAULT_LAPS, type RaceState } from '@hexrace/game-commons';
import { type RaceMode, type TimerReadout } from '@hexrace/hud';

/**
 * What a race shows over the canvas, as signals the HUD reads: the countdown step, the wrong way
 * and the timer. `read` is called once a frame with the director's state, the way `CarDash.read`
 * is called with the car's. The best lap and the gap to it stay empty: Track scores the total
 * time and keeps no lap times (functional spec 4.2), and Rally has one lap.
 */
export class RaceReadout {
  readonly countdownStep = signal<number | null>(null);
  readonly wrongWay = signal(false);
  readonly timer = signal<TimerReadout>({
    mode: 'track',
    currentMs: 0,
    lap: 0,
    lapCount: DEFAULT_LAPS,
    bestMs: null,
    deltaMs: null,
    splitsMs: [],
  });

  read(state: RaceState, mode: RaceMode): void {
    this.countdownStep.set(state.countdownStep);
    this.wrongWay.set(state.wrongWay);
    this.timer.set({
      mode,
      currentMs: state.elapsedMs,
      lap: state.lap,
      lapCount: state.lapCount,
      bestMs: null,
      deltaMs: null,
      splitsMs: [],
    });
  }
}
