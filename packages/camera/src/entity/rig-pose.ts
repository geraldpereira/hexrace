import { type Vec3Like } from '@camera/entity/camera-target';

/** Where the camera should be and what it should look at, before any smoothing. */
export interface RigPose {
  readonly eye: Vec3Like;
  readonly aim: Vec3Like;
  /** The heading the camera ends up aligned with, radians. */
  readonly heading: number;
}
