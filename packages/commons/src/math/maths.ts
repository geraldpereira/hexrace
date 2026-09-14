import { Injectable } from '@angular/core';

/** The arithmetic more than one module needs: interpolations, angles and speeds, both ways. */
@Injectable({ providedIn: 'root' })
export class Maths {
  /** Linear interpolation from a to b by t in [0, 1]. */
  lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /** Where v sits between a and b, 0 to 1, clamped; 0 when a equals b. */
  inverseLerp(a: number, b: number, v: number): number {
    if (a === b) return 0;
    return Math.max(0, Math.min(1, (v - a) / (b - a)));
  }

  /** A ramp: 0 at or before `start`, 1 at or after `full`, linear between. */
  ramp(v: number, start: number, full: number): number {
    return this.inverseLerp(start, full, v);
  }

  /** Cubic Hermite interpolation on [0, 1]: values and tangents (derivatives in s) at both ends. */
  hermite(h0: number, t0: number, h1: number, t1: number, s: number): number {
    const s2 = s * s;
    const s3 = s2 * s;
    return (
      (2 * s3 - 3 * s2 + 1) * h0 + (s3 - 2 * s2 + s) * t0 + (-2 * s3 + 3 * s2) * h1 + (s3 - s2) * t1
    );
  }

  degToRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  radToDeg(rad: number): number {
    return (rad * 180) / Math.PI;
  }

  kmhToMps(kmh: number): number {
    return kmh / 3.6;
  }

  mpsToKmh(mps: number): number {
    return mps * 3.6;
  }
}
