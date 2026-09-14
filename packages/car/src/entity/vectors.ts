/** Three numbers read, whatever carries them: a three.js vector, a Jolt one, a literal. */
export interface Point3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Three numbers written in place: the poses and contacts the physics refreshes every step. */
export interface Vec3Mut {
  x: number;
  y: number;
  z: number;
}

/** A rotation written in place, four numbers, the three.js and Jolt order. */
export interface QuatMut extends Vec3Mut {
  w: number;
}
