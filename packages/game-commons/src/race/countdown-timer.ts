import { Injectable, inject } from '@angular/core';
import { Clock } from '@hexrace/commons';

const COUNTDOWN_SECONDS = 3;
const GO_SECONDS = 1;

/**
 * Three, two, one, GO (functional spec 4.1), read from the wall clock rather than counted in
 * steps: one second a figure, then the GO held one more second before the screen clears. The
 * step is what the `Countdown` component of the hud shows, null when it must show nothing.
 */
@Injectable({ providedIn: 'root' })
export class CountdownTimer {
  private readonly clock = inject(Clock);
  private origin: number | null = null;

  start(): void {
    this.origin = this.clock.now();
  }

  reset(): void {
    this.origin = null;
  }

  /** Seconds since the start of the countdown, 0 while it has not begun. */
  seconds(): number {
    const origin = this.origin;
    return origin === null ? 0 : (this.clock.now() - origin) / 1000;
  }

  /** True once the GO has been given, which is when the race may run. */
  done(): boolean {
    return this.origin !== null && this.seconds() >= COUNTDOWN_SECONDS;
  }

  /** 3, 2, 1, then 0 for the GO, then null a second later; null before the countdown starts. */
  step(): number | null {
    if (this.origin === null) return null;
    const seconds = this.seconds();
    if (seconds >= COUNTDOWN_SECONDS + GO_SECONDS) return null;
    if (seconds >= COUNTDOWN_SECONDS) return 0;
    return COUNTDOWN_SECONDS - Math.floor(seconds);
  }
}
