import { Injectable, inject } from '@angular/core';
import { Vec2 } from '@hexrace/commons';
import { clamp } from 'lodash-es';

import { type ExitFace } from '@tile/entity/face';
import { type Heading } from '@tile/entity/grid';
import { APOTHEM, SIDE } from '@tile/entity/layout';
import {
  type PathSample,
  type TransitionSpan,
  DEFAULT_TRANSITION,
  SHARP_TURN_RADIUS,
  WIDE_TURN_RADIUS,
} from '@tile/entity/path';
import { Faces } from '@tile/geometry/faces';

/**
 * The axis of a tile, from the middle of the entry face to the middle of the exit face, tangent to
 * both, `s` from 0 to 1: a segment of two apothems when straight, an arc of 1.5 sides in a wide
 * turn, of half a side around the shared corner in a sharp one. In the tile's own frame (centred,
 * heading north) or in the world; plus the transition of the profile along it.
 */
@Injectable({ providedIn: 'root' })
export class TilePaths {
  private readonly faces = inject(Faces);

  local(exit: ExitFace, s: number): PathSample {
    const turn = this.faces.turnOf(exit);
    if (turn === 0) {
      const travel = new Vec2(0, 1);
      return { point: new Vec2(0, -APOTHEM + 2 * APOTHEM * s), travel, right: travel.right() };
    }
    const sweep = (Math.abs(turn) * Math.PI) / 3;
    const radius = Math.abs(turn) === 1 ? WIDE_TURN_RADIUS : SHARP_TURN_RADIUS;
    const side = Math.sign(turn);
    const center = new Vec2(side * radius, -APOTHEM);
    const start = side > 0 ? Math.PI : 0;
    const angle = start - side * sweep * s;
    const point = center.add(new Vec2(radius * Math.cos(angle), radius * Math.sin(angle)));
    const travel = new Vec2(side * Math.sin(angle), -side * Math.cos(angle));
    return { point, travel, right: travel.right() };
  }

  /** Length of the axis, in units: what a car following the middle of the road covers. */
  length(exit: ExitFace): number {
    const turn = Math.abs(this.faces.turnOf(exit));
    if (turn === 0) return 2 * APOTHEM;
    return (turn === 1 ? WIDE_TURN_RADIUS : SHARP_TURN_RADIUS) * ((turn * Math.PI) / 3);
  }

  /** A local vector turned to a tile's heading. */
  rotate(v: Vec2, heading: Heading): Vec2 {
    return v.rotate(-(heading * Math.PI) / 3);
  }

  /** A world vector brought into the frame of a tile heading `heading`. */
  unrotate(v: Vec2, heading: Heading): Vec2 {
    return this.rotate(v, ((6 - heading) % 6) as Heading);
  }

  world(center: Vec2, heading: Heading, exit: ExitFace, s: number): PathSample {
    const local = this.local(exit, s);
    return {
      point: center.add(this.rotate(local.point, heading)),
      travel: this.rotate(local.travel, heading),
      right: this.rotate(local.right, heading),
    };
  }

  /** The point of the profile at unit `u` (0 left, 8 right) on a sample of the axis. */
  profilePoint(sample: PathSample, u: number): Vec2 {
    return sample.point.add(sample.right.scale(u - SIDE / 2));
  }

  /** A centred transition covering a fraction `extent` of the tile (1 = the whole tile). */
  spanOfExtent(extent: number): TransitionSpan {
    const half = Math.min(1, Math.max(0.01, extent)) / 2;
    return { start: 0.5 - half, end: 0.5 + half };
  }

  /** Progress of the transition, 0 to 1, a quintic smootherstep: no curvature jump at either end. */
  transition(s: number, span: TransitionSpan = DEFAULT_TRANSITION): number {
    const t = Math.min(1, Math.max(0, (s - span.start) / (span.end - span.start)));
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerpSpan(
    entry: [number, number],
    exit: [number, number],
    s: number,
    span: TransitionSpan = DEFAULT_TRANSITION,
  ): [number, number] {
    const t = this.transition(s, span);
    return [entry[0] + (exit[0] - entry[0]) * t, entry[1] + (exit[1] - entry[1]) * t];
  }

  /** The `s` of the axis point nearest to a local point; 0.5 at the apex of a sharp turn. */
  localAxisParameter(exit: ExitFace, p: Vec2): number {
    const turn = this.faces.turnOf(exit);
    if (turn === 0) return clamp((p.y + APOTHEM) / (2 * APOTHEM), 0, 1);
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
    return clamp(s, 0, 1);
  }

  axisParameter(center: Vec2, heading: Heading, exit: ExitFace, p: Vec2): number {
    return this.localAxisParameter(exit, this.unrotate(p.sub(center), heading));
  }
}
