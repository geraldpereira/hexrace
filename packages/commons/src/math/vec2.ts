/**
 * An immutable vector of the plane, x east and y north in the tile model, whatever the unit. The
 * one value object with a constructor: arithmetic reads better as `a.add(b).scale(k)` than as
 * free functions, and a vector has no dependency to inject.
 */
export class Vec2 {
  static readonly ZERO = new Vec2(0, 0);

  constructor(
    readonly x: number,
    readonly y: number,
  ) {}

  add(o: Vec2): Vec2 {
    return new Vec2(this.x + o.x, this.y + o.y);
  }

  sub(o: Vec2): Vec2 {
    return new Vec2(this.x - o.x, this.y - o.y);
  }

  scale(k: number): Vec2 {
    return new Vec2(this.x * k, this.y * k);
  }

  dot(o: Vec2): number {
    return this.x * o.x + this.y * o.y;
  }

  /** The z of the 3D cross product: positive when `o` is counter-clockwise from this. */
  cross(o: Vec2): number {
    return this.x * o.y - this.y * o.x;
  }

  length(): number {
    return Math.hypot(this.x, this.y);
  }

  distanceTo(o: Vec2): number {
    return Math.hypot(this.x - o.x, this.y - o.y);
  }

  /** Unit length; the zero vector stays zero. */
  normalized(): Vec2 {
    const length = this.length();
    return length === 0 ? Vec2.ZERO : this.scale(1 / length);
  }

  /** The perpendicular on the right of a direction of travel, seen from above. */
  right(): Vec2 {
    return new Vec2(this.y, -this.x);
  }

  lerp(o: Vec2, t: number): Vec2 {
    return new Vec2(this.x + (o.x - this.x) * t, this.y + (o.y - this.y) * t);
  }

  /** Rotated counter-clockwise by `angle` radians. */
  rotate(angle: number): Vec2 {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Vec2(this.x * c - this.y * s, this.x * s + this.y * c);
  }

  equals(o: Vec2, epsilon = 1e-9): boolean {
    return Math.abs(this.x - o.x) <= epsilon && Math.abs(this.y - o.y) <= epsilon;
  }
}
