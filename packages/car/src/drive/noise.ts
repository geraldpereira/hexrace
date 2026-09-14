import { Injectable } from '@angular/core';

const HASH_A = 374761393;
const HASH_B = 668265263;
const HASH_C = 2246822519;
const HASH_D = 3266489917;
const SEED = 7;

/**
 * A smooth two-dimensional value noise in -1..1, the grain field of POC 1 (which used
 * simplex-noise; the same shape, without the dependency). It is a pure function of its two
 * coordinates: the same wheel at the same distance always reads the same bump, so a parked car
 * is still and a replay is identical.
 */
@Injectable({ providedIn: 'root' })
export class Noise {
  at(x: number, y: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = this.fade(x - x0);
    const fy = this.fade(y - y0);
    const top = this.mix(this.hash(x0, y0), this.hash(x0 + 1, y0), fx);
    const bottom = this.mix(this.hash(x0, y0 + 1), this.hash(x0 + 1, y0 + 1), fx);
    return this.mix(top, bottom, fy);
  }

  private fade(t: number): number {
    return t * t * (3 - 2 * t);
  }

  private mix(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private hash(x: number, y: number): number {
    let h = (Math.imul(x, HASH_A) ^ Math.imul(y, HASH_B) ^ SEED) >>> 0;
    h = Math.imul(h ^ (h >>> 15), HASH_C) >>> 0;
    h = Math.imul(h ^ (h >>> 13), HASH_D) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 2147483647.5 - 1;
  }
}
