import { Injectable, inject } from '@angular/core';
import { Clock } from '@hexrace/commons';

/**
 * The chrono, on the wall clock and not on fixed steps: there is no pause, so losing the focus
 * does not stop a race and the time missed while a hidden tab skipped its frames still counts
 * (technical spec 2.4). It runs from the GO to the finish, and holds the final time afterwards.
 */
@Injectable({ providedIn: 'root' })
export class RaceClock {
  private readonly clock = inject(Clock);
  private origin: number | null = null;
  private stopped: number | null = null;

  get running(): boolean {
    return this.origin !== null && this.stopped === null;
  }

  start(): void {
    this.origin = this.clock.now();
    this.stopped = null;
  }

  /** Milliseconds since the GO: 0 before it, and the final time once stopped. */
  elapsedMs(): number {
    const origin = this.origin;
    if (origin === null) return 0;
    return (this.stopped ?? this.clock.now()) - origin;
  }

  stop(): number {
    this.stopped ??= this.clock.now();
    return this.elapsedMs();
  }

  reset(): void {
    this.origin = null;
    this.stopped = null;
  }
}
