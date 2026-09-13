import { type Cell, type Heading } from '@tile/entity/grid';
import { type Profile, FACE_WIDTH, blockEnd, blockStart } from '@tile/entity/profile';

/** A point or a vector of the plane seen from above, x east, y north, in units. */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/** Side of a tile, in units (functional spec 2.1). */
export const SIDE = FACE_WIDTH;
/** From the centre to the middle of a face. */
export const APOTHEM = (SIDE * Math.sqrt(3)) / 2;
/** Between the centres of two neighbouring tiles. */
export const PITCH = 2 * APOTHEM;

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function scale(v: Vec2, k: number): Vec2 {
  return { x: v.x * k, y: v.y * k };
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Unit vector of an absolute direction: rank 0 north, then clockwise by 60°. */
export function directionVector(heading: Heading): Vec2 {
  const angle = Math.PI / 2 - (heading * Math.PI) / 3;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

/** Flat layout: q advances 1.5 sides east, r one pitch north. */
export function cellToWorld(cell: Cell): Vec2 {
  return { x: SIDE * 1.5 * cell.q, y: APOTHEM * cell.q + PITCH * cell.r };
}

/** The six corners of a tile centred at `center`, from the north-east one, clockwise. */
export function hexCorners(center: Vec2): Vec2[] {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = Math.PI / 3 - (i * Math.PI) / 3;
    return add(center, { x: SIDE * Math.cos(angle), y: SIDE * Math.sin(angle) });
  });
}

/** Inside a convex polygon given clockwise, with a small tolerance. */
export function insideConvex(p: Vec2, polygon: readonly Vec2[]): boolean {
  const tolerance = SIDE * 1e-6;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (cross > tolerance) return false;
  }
  return true;
}

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

/** The entry face (6) of a tile heading `heading`, crossed inwards. */
export function entryFrame(center: Vec2, heading: Heading): FaceFrame {
  const travel = directionVector(heading);
  const right = rightOf(travel);
  const middle = add(center, scale(travel, -APOTHEM));
  return { origin: add(middle, scale(right, -SIDE / 2)), travel, right };
}

/** The exit face of a tile, of absolute direction `exitHeading`, crossed outwards. */
export function exitFrame(center: Vec2, exitHeading: Heading): FaceFrame {
  const travel = directionVector(exitHeading);
  const right = rightOf(travel);
  const middle = add(center, scale(travel, APOTHEM));
  return { origin: add(middle, scale(right, -SIDE / 2)), travel, right };
}

export function rightOf(travel: Vec2): Vec2 {
  return { x: travel.y, y: -travel.x };
}

/** The point of a face at unit `u` (fractional), pushed `depth` along the travel. */
export function facePoint(frame: FaceFrame, u: number, depth = 0): Vec2 {
  return add(add(frame.origin, scale(frame.right, u)), scale(frame.travel, depth));
}

/** Left and right bounds, in units from the left of the face, of the road. */
export function roadSpan(profile: Profile): [number, number] {
  return [profile.position, profile.position + profile.roadWidth];
}

export function blockSpan(profile: Profile): [number, number] {
  return [blockStart(profile), blockEnd(profile)];
}
