import { Injectable } from '@angular/core';

/**
 * The wall clock, behind a token so a test can wind it by hand. Whatever runs on real time rather
 * than on fixed steps reads it: a race chrono keeps counting while a hidden tab stops stepping
 * (technical spec 2.4). Milliseconds, from the same origin as `Date.now`.
 */
@Injectable({ providedIn: 'root' })
export class Clock {
  now(): number {
    return Date.now();
  }
}
