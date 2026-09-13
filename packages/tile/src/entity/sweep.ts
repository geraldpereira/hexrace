import { Injectable } from '@angular/core';

import { type ExitFace } from '@tile/entity/face';
import { type Heading } from '@tile/entity/grid';
import { type Vec2, SIDE, add, scale } from '@tile/entity/layout';
import {
  type TransitionSpan,
  DEFAULT_TRANSITION,
  axisParameter,
  pathLength,
  transition,
  worldPath,
} from '@tile/entity/path';
import { type Profile } from '@tile/entity/profile';
import { hermite } from '@tile/entity/slope';
import { HEIGHT_UNIT } from '@tile/entity/units';

/**
 * Everything the geometry of one tile needs, resolved: where it sits, which way it points, its
 * two profiles, the transition span, and the slopes at its faces that the track deduced from the
 * neighbours (zero for a tile alone). Distances in units.
 */
export interface TileSweep {
  readonly center: Vec2;
  readonly heading: Heading;
  readonly exit: ExitFace;
  readonly entry: Profile;
  readonly exitProfile: Profile;
  readonly transition?: TransitionSpan;
  readonly entrySlope?: number;
  readonly exitSlope?: number;
}

/** The edges of the zones at one `s`: the road centre, its travel and right, then left to right. */
export interface Boundaries {
  readonly center: Vec2;
  readonly travel: Vec2;
  readonly right: Vec2;
  readonly blockLeft: Vec2;
  readonly roadLeft: Vec2;
  readonly roadRight: Vec2;
  readonly blockRight: Vec2;
}

const EPSILON = 1e-3;

/**
 * Sweeps a profile along a tile's axis. The road centre follows its own curve, the axis shifted by
 * the profile centre, and widths are measured across that curve's tangent, not the axis: a road
 * moving sideways would otherwise look narrower by the cosine of its slant. Heights follow a
 * cubic Hermite between the faces with the slopes the neighbours dictate (functional spec 2.3).
 */
@Injectable({ providedIn: 'root' })
export class TileSweeper {
  boundariesAt(sweep: TileSweep, s: number): Boundaries {
    const center = this.roadCenter(sweep, s);
    const before = this.roadCenter(sweep, s - EPSILON);
    const after = this.roadCenter(sweep, s + EPSILON);
    const travel = normalize({ x: after.x - before.x, y: after.y - before.y });
    const right = { x: travel.y, y: -travel.x };
    const t = transition(s, sweep.transition ?? DEFAULT_TRANSITION);
    const halfRoad = lerp(sweep.entry.roadWidth, sweep.exitProfile.roadWidth, t) / 2;
    const leftShoulder = lerp(sweep.entry.leftShoulder, sweep.exitProfile.leftShoulder, t);
    const rightShoulder = lerp(sweep.entry.rightShoulder, sweep.exitProfile.rightShoulder, t);
    return {
      center,
      travel,
      right,
      blockLeft: add(center, scale(right, -halfRoad - leftShoulder)),
      roadLeft: add(center, scale(right, -halfRoad)),
      roadRight: add(center, scale(right, halfRoad)),
      blockRight: add(center, scale(right, halfRoad + rightShoulder)),
    };
  }

  /** The road centre: the axis shifted by the current profile's centre. */
  roadCenter(sweep: TileSweep, s: number): Vec2 {
    const sample = worldPath(sweep.center, sweep.heading, sweep.exit, s);
    const u = lerp(
      roadCenterUnit(sweep.entry),
      roadCenterUnit(sweep.exitProfile),
      transition(s, sweep.transition ?? DEFAULT_TRANSITION),
    );
    return add(sample.point, scale(sample.right, u - SIDE / 2));
  }

  /** The profile in force at `s`: the entry's types before the middle, the exit's after. */
  profileAt(sweep: TileSweep, s: number): Profile {
    return s < 0.5 ? sweep.entry : sweep.exitProfile;
  }

  /** Height of the axis at `s`, in units; the transition span plays no part. */
  heightOfS(sweep: TileSweep, s: number): number {
    const length = pathLength(sweep.exit);
    const h = hermite(
      sweep.entry.height,
      (sweep.entrySlope ?? 0) * length,
      sweep.exitProfile.height,
      (sweep.exitSlope ?? 0) * length,
      Math.min(1, Math.max(0, s)),
    );
    return h * HEIGHT_UNIT;
  }

  /** Height of the ground anywhere on the tile: that of the nearest axis point, exact on the faces. */
  heightAt(sweep: TileSweep, p: Vec2): number {
    return this.heightOfS(sweep, axisParameter(sweep.center, sweep.heading, sweep.exit, p));
  }
}

function roadCenterUnit(profile: Profile): number {
  return profile.position + profile.roadWidth / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function normalize(v: Vec2): Vec2 {
  const length = Math.hypot(v.x, v.y);
  return { x: v.x / length, y: v.y / length };
}
