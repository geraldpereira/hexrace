export interface Vec3Like {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * What the camera reads each frame about the thing it follows: the car in the race, a dummy in the
 * lab. `heading` is the yaw in radians, 0 along +Z and growing towards +X, which is three's
 * `rotation.y` for an object whose nose points at +Z. `nextTile` is where the track goes next,
 * null while nobody knows.
 */
export interface CameraTarget {
  readonly position: Vec3Like;
  readonly heading: number;
  /** m/s, never negative. */
  readonly speed: number;
  readonly nextTile: Vec3Like | null;
}
