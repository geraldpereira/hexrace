import { Injectable } from '@angular/core';
import { Vec2 } from '@hexrace/commons';

import { type Cell, type Heading } from '@tile/entity/grid';
import { type FaceFrame, APOTHEM, PITCH, SIDE } from '@tile/entity/layout';

/**
 * From the grid to the plane, in units (technical spec 3.2): x east, y north, seen from above.
 * Flat layout, q advancing 1.5 sides east and r one pitch north; the six corners clockwise from
 * the north-east one; and each face as the driver crossing it sees it.
 */
@Injectable({ providedIn: 'root' })
export class Layout {
  /** Unit vector of an absolute direction: rank 0 north, then clockwise by 60°. */
  direction(heading: Heading): Vec2 {
    const angle = Math.PI / 2 - (heading * Math.PI) / 3;
    return new Vec2(Math.cos(angle), Math.sin(angle));
  }

  cellToWorld(cell: Cell): Vec2 {
    return new Vec2(SIDE * 1.5 * cell.q, APOTHEM * cell.q + PITCH * cell.r);
  }

  corners(center: Vec2): Vec2[] {
    return Array.from({ length: 6 }, (_, i) => {
      const angle = Math.PI / 3 - (i * Math.PI) / 3;
      return center.add(new Vec2(SIDE * Math.cos(angle), SIDE * Math.sin(angle)));
    });
  }

  /** The entry face (6) of a tile heading `heading`, crossed inwards. */
  entryFrame(center: Vec2, heading: Heading): FaceFrame {
    const travel = this.direction(heading);
    const right = travel.right();
    const middle = center.add(travel.scale(-APOTHEM));
    return { origin: middle.add(right.scale(-SIDE / 2)), travel, right };
  }

  /** The exit face of a tile, of absolute direction `exitHeading`, crossed outwards. */
  exitFrame(center: Vec2, exitHeading: Heading): FaceFrame {
    const travel = this.direction(exitHeading);
    const right = travel.right();
    const middle = center.add(travel.scale(APOTHEM));
    return { origin: middle.add(right.scale(-SIDE / 2)), travel, right };
  }

  /** The point of a face at unit `u` (fractional), pushed `depth` along the travel. */
  facePoint(frame: FaceFrame, u: number, depth = 0): Vec2 {
    return frame.origin.add(frame.right.scale(u)).add(frame.travel.scale(depth));
  }
}
