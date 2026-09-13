/** Linear interpolation from a to b by t in [0, 1]. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Where v sits between a and b, 0 to 1, clamped; 0 when a equals b. */
export function inverseLerp(a: number, b: number, v: number): number {
  if (a === b) return 0;
  return Math.max(0, Math.min(1, (v - a) / (b - a)));
}

/** A ramp: 0 at or before `start`, 1 at or after `full`, linear between. */
export function ramp(v: number, start: number, full: number): number {
  return inverseLerp(start, full, v);
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function kmhToMps(kmh: number): number {
  return kmh / 3.6;
}

export function mpsToKmh(mps: number): number {
  return mps * 3.6;
}
