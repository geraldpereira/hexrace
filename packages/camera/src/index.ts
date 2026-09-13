/**
 * The camera of the functional spec 3.9: `FollowCamera` drives an engine `CameraComponent` after a
 * `CameraTarget` (position, heading, speed, next tile), with the pure `solveRig` behind it and the
 * knobs in `CameraTuning`. It knows no car and no track: whoever has them fills a target.
 */
export { type CameraTarget, type Vec3Like } from '@camera/entity/camera-target';
export { CameraTuning } from '@camera/entity/camera-tuning';
export { headingTo, solveRig, turnBetween, type RigPose } from '@camera/entity/rig';
export { FollowCamera } from '@camera/follow/follow-camera';
