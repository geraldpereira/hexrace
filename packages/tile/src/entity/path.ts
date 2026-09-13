import { type ExitFace, turnOf } from '@tile/entity/face';
import { type Heading } from '@tile/entity/grid';
import { type Vec2, APOTHEM, SIDE, add, rightOf, scale } from '@tile/entity/layout';

/** A point of the axis with the direction of travel and the driver's right, both unit vectors. */
export interface PathSample {
  readonly point: Vec2;
  readonly travel: Vec2;
  readonly right: Vec2;
}

export const WIDE_TURN_RADIUS = SIDE * 1.5;
export const SHARP_TURN_RADIUS = SIDE / 2;

/**
 * The axis of a tile in its local frame, centred at the origin and heading north: the curve from
 * the middle of the entry face to the middle of the exit face, tangent to both, `s` from 0 to 1.
 * Straight, a segment of two apothems; a 60° turn, an arc of radius 1.5 sides centred on the
 * neighbour touching both faces; a 120° turn, an arc of half a side centred on the corner the two
 * faces share, where the inner edge of the profile shrinks to that corner.
 */
export function localPath(exit: ExitFace, s: number): PathSample {
  const turn = turnOf(exit);
  if (turn === 0) {
    const travel = { x: 0, y: 1 };
    return { point: { x: 0, y: -APOTHEM + 2 * APOTHEM * s }, travel, right: rightOf(travel) };
  }
  const sweep = (Math.abs(turn) * Math.PI) / 3;
  const radius = Math.abs(turn) === 1 ? WIDE_TURN_RADIUS : SHARP_TURN_RADIUS;
  const side = Math.sign(turn);
  const center = { x: side * radius, y: -APOTHEM };
  const start = side > 0 ? Math.PI : 0;
  const angle = start - side * sweep * s;
  const point = add(center, { x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  const travel = { x: side * Math.sin(angle), y: -side * Math.cos(angle) };
  return { point, travel, right: rightOf(travel) };
}

/** Length of the axis, in units: what a car following the middle of the road covers. */
export function pathLength(exit: ExitFace): number {
  const turn = Math.abs(turnOf(exit));
  if (turn === 0) return 2 * APOTHEM;
  return (turn === 1 ? WIDE_TURN_RADIUS : SHARP_TURN_RADIUS) * ((turn * Math.PI) / 3);
}

export function rotate(v: Vec2, heading: Heading): Vec2 {
  const angle = -(heading * Math.PI) / 3;
  const c = Math.cos(angle);
  const sn = Math.sin(angle);
  return { x: v.x * c - v.y * sn, y: v.x * sn + v.y * c };
}

/** The inverse of `rotate`: a world vector brought into the frame of a tile heading `heading`. */
export function unrotate(v: Vec2, heading: Heading): Vec2 {
  return rotate(v, ((6 - heading) % 6) as Heading);
}

export function worldPath(center: Vec2, heading: Heading, exit: ExitFace, s: number): PathSample {
  const local = localPath(exit, s);
  return {
    point: add(center, rotate(local.point, heading)),
    travel: rotate(local.travel, heading),
    right: rotate(local.right, heading),
  };
}

/** The point of the profile at unit `u` (0 left, 8 right) on a sample of the axis. */
export function profilePoint(sample: PathSample, u: number): Vec2 {
  return add(sample.point, scale(sample.right, u - SIDE / 2));
}

/**
 * Where the profile changes along the axis: constant before `start`, constant after `end`, in
 * transition between. Spreading it softens position shifts; the faces stay exact since the
 * transition is over at s = 1 (functional spec 2.2).
 */
export interface TransitionSpan {
  readonly start: number;
  readonly end: number;
}

export const DEFAULT_TRANSITION: TransitionSpan = { start: 0.3, end: 0.7 };

/** A centred transition covering a fraction `extent` of the tile (1 = the whole tile). */
export function transitionOfExtent(extent: number): TransitionSpan {
  const half = Math.min(1, Math.max(0.01, extent)) / 2;
  return { start: 0.5 - half, end: 0.5 + half };
}

/**
 * Progress of the transition, 0 (entry profile) to 1 (exit profile): a quintic smootherstep, so
 * first and second derivatives vanish at both ends and the curvature does not jump.
 */
export function transition(s: number, span: TransitionSpan = DEFAULT_TRANSITION): number {
  const t = Math.min(1, Math.max(0, (s - span.start) / (span.end - span.start)));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function lerpSpan(
  entry: [number, number],
  exit: [number, number],
  s: number,
  span: TransitionSpan = DEFAULT_TRANSITION,
): [number, number] {
  const t = transition(s, span);
  return [entry[0] + (exit[0] - entry[0]) * t, entry[1] + (exit[1] - entry[1]) * t];
}

/**
 * The `s` of the axis point nearest to a point of the local frame, which gives any point of the
 * tile a height, landscape included. At the apex of a sharp turn every axis point is as near: 0.5.
 */
export function localAxisParameter(exit: ExitFace, p: Vec2): number {
  const turn = turnOf(exit);
  if (turn === 0) return clamp01((p.y + APOTHEM) / (2 * APOTHEM));
  const sweep = (Math.abs(turn) * Math.PI) / 3;
  const radius = Math.abs(turn) === 1 ? WIDE_TURN_RADIUS : SHARP_TURN_RADIUS;
  const side = Math.sign(turn);
  const dx = p.x - side * radius;
  const dy = p.y + APOTHEM;
  if (Math.hypot(dx, dy) < 1e-9) return 0.5;
  const start = side > 0 ? Math.PI : 0;
  const period = (2 * Math.PI) / sweep;
  let s = ((start - Math.atan2(dy, dx)) * side) / sweep;
  s = ((s % period) + period) % period;
  if (s > 1 + (period - 1) / 2) s -= period;
  return clamp01(s);
}

export function axisParameter(center: Vec2, heading: Heading, exit: ExitFace, p: Vec2): number {
  return localAxisParameter(exit, unrotate({ x: p.x - center.x, y: p.y - center.y }, heading));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
