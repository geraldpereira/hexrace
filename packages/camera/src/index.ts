/**
 * The camera of the functional spec 3.9: `FollowCamera` drives an engine `CameraComponent` after a
 * `CameraTarget` (position, heading, speed, next tile), `RigSolver` computes the pose and
 * `CameraTuning` holds the knobs. `entity/` is the data alone. It knows no car and no track:
 * whoever has them fills a target.
 */
export { type CameraTarget, type Vec3Like } from '@camera/entity/camera-target';
export { type RigPose } from '@camera/entity/rig-pose';
export { CameraTuning } from '@camera/follow/camera-tuning';
export { FollowCamera } from '@camera/follow/follow-camera';
export { RigSolver } from '@camera/follow/rig-solver';
