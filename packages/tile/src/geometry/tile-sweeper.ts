import { Injectable, inject } from '@angular/core';
import { Maths, type Vec2 } from '@hexrace/commons';

import { DEFAULT_TRANSITION } from '@tile/entity/path';
import { type Profile } from '@tile/entity/profile';
import { type Boundaries, type TileSweep } from '@tile/entity/sweep';
import { HEIGHT_UNIT } from '@tile/entity/units';
import { Profiles } from '@tile/geometry/profiles';
import { TilePaths } from '@tile/geometry/tile-paths';

const EPSILON = 1e-3;

/**
 * Sweeps a profile along a tile's axis. The road centre follows its own curve, the axis shifted by
 * the profile centre, and widths are measured across that curve's tangent, not the axis: a road
 * moving sideways would otherwise look narrower by the cosine of its slant. Heights follow a
 * cubic Hermite between the faces with the slopes the neighbours dictate (functional spec 2.3).
 */
@Injectable({ providedIn: 'root' })
export class TileSweeper {
  private readonly maths = inject(Maths);
  private readonly paths = inject(TilePaths);
  private readonly profiles = inject(Profiles);

  boundariesAt(sweep: TileSweep, s: number): Boundaries {
    const center = this.roadCenter(sweep, s);
    const before = this.roadCenter(sweep, s - EPSILON);
    const after = this.roadCenter(sweep, s + EPSILON);
    const travel = after.sub(before).normalized();
    const right = travel.right();
    const t = this.paths.transition(s, sweep.transition ?? DEFAULT_TRANSITION);
    const halfRoad = this.maths.lerp(sweep.entry.roadWidth, sweep.exitProfile.roadWidth, t) / 2;
    const leftShoulder = this.maths.lerp(
      sweep.entry.leftShoulder,
      sweep.exitProfile.leftShoulder,
      t,
    );
    const rightShoulder = this.maths.lerp(
      sweep.entry.rightShoulder,
      sweep.exitProfile.rightShoulder,
      t,
    );
    return {
      center,
      travel,
      right,
      blockLeft: center.add(right.scale(-halfRoad - leftShoulder)),
      roadLeft: center.add(right.scale(-halfRoad)),
      roadRight: center.add(right.scale(halfRoad)),
      blockRight: center.add(right.scale(halfRoad + rightShoulder)),
    };
  }

  /** The road centre: the axis shifted by the current profile's centre. */
  roadCenter(sweep: TileSweep, s: number): Vec2 {
    const sample = this.paths.world(sweep.center, sweep.heading, sweep.exit, s);
    const u = this.maths.lerp(
      this.profiles.roadCenter(sweep.entry),
      this.profiles.roadCenter(sweep.exitProfile),
      this.paths.transition(s, sweep.transition ?? DEFAULT_TRANSITION),
    );
    return this.paths.profilePoint(sample, u);
  }

  /** The profile in force at `s`: the entry's types before the middle, the exit's after. */
  profileAt(sweep: TileSweep, s: number): Profile {
    return s < 0.5 ? sweep.entry : sweep.exitProfile;
  }

  /** Height of the axis at `s`, in units; the transition span plays no part. */
  heightOfS(sweep: TileSweep, s: number): number {
    const length = this.paths.length(sweep.exit);
    const h = this.maths.hermite(
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
    return this.heightOfS(
      sweep,
      this.paths.axisParameter(sweep.center, sweep.heading, sweep.exit, p),
    );
  }
}
