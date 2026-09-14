import { type Vec3 } from '@hexrace/commons';

/** Where a car is put at the start: the point in metres, and the yaw the chassis takes. */
export interface SpawnPose {
  readonly point: Vec3;
  /** Radians, 0 along +Z and growing towards +X, what `CameraTarget` calls heading. */
  readonly heading: number;
}
