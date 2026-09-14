import { type Vec2 } from '@hexrace/commons';

import { FACE_WIDTH } from '@tile/entity/profile';

/** Side of a tile, in units (functional spec 2.1). */
export const SIDE = FACE_WIDTH;
/** From the centre to the middle of a face. */
export const APOTHEM = (SIDE * Math.sqrt(3)) / 2;
/** Between the centres of two neighbouring tiles. */
export const PITCH = 2 * APOTHEM;

/**
 * A face as the driver crossing it sees it: `travel` the direction of travel, `right` the driver's
 * right, `origin` the left corner of the face. Unit u of the face runs from `origin + right·u` to
 * `origin + right·(u+1)`.
 */
export interface FaceFrame {
  readonly origin: Vec2;
  readonly travel: Vec2;
  readonly right: Vec2;
}
