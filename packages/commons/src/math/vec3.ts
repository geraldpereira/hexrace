/** An immutable vector of space, y up; what the tile hands to three.js and Jolt, in metres. */
export class Vec3 {
  static readonly ZERO = new Vec3(0, 0, 0);
  static readonly UP = new Vec3(0, 1, 0);

  constructor(
    readonly x: number,
    readonly y: number,
    readonly z: number,
  ) {}

  add(o: Vec3): Vec3 {
    return new Vec3(this.x + o.x, this.y + o.y, this.z + o.z);
  }

  sub(o: Vec3): Vec3 {
    return new Vec3(this.x - o.x, this.y - o.y, this.z - o.z);
  }

  scale(k: number): Vec3 {
    return new Vec3(this.x * k, this.y * k, this.z * k);
  }

  dot(o: Vec3): number {
    return this.x * o.x + this.y * o.y + this.z * o.z;
  }

  cross(o: Vec3): Vec3 {
    return new Vec3(
      this.y * o.z - this.z * o.y,
      this.z * o.x - this.x * o.z,
      this.x * o.y - this.y * o.x,
    );
  }

  length(): number {
    return Math.hypot(this.x, this.y, this.z);
  }

  equals(o: Vec3, epsilon = 1e-9): boolean {
    return (
      Math.abs(this.x - o.x) <= epsilon &&
      Math.abs(this.y - o.y) <= epsilon &&
      Math.abs(this.z - o.z) <= epsilon
    );
  }
}
