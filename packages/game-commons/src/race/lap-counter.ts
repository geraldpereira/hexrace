import { Injectable } from '@angular/core';

/**
 * Line crossings, in the direction of travel (functional spec 4.2). Given the continuous position
 * before and after a step, it says +1 for a crossing forwards, -1 for one backwards and 0 for
 * none: an out and back over the line therefore counts no lap. On a loop the position wraps from
 * n - ε to 0 + ε, so the step is taken as the short way round rather than as a difference.
 */
@Injectable({ providedIn: 'root' })
export class LapCounter {
  crossing(before: number, after: number, line: number, total: number, closed: boolean): number {
    if (total <= 0) return 0;
    if (!closed) {
      if (before < line && after >= line) return 1;
      return before >= line && after < line ? -1 : 0;
    }
    const since = this.wrap(before - line, total) + this.step(before, after, total);
    if (since >= total) return 1;
    return since < 0 ? -1 : 0;
  }

  /** The signed way from one position to the next, the short way round on a loop. */
  step(before: number, after: number, total: number): number {
    return this.wrap(after - before + total / 2, total) - total / 2;
  }

  private wrap(value: number, total: number): number {
    return ((value % total) + total) % total;
  }
}
