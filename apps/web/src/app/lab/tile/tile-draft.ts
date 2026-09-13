import {
  type EnvironmentId,
  type ExitFace,
  type Heading,
  type Obstacle,
  type Profile,
  type Surface,
  type TileBuild,
  type TileObstacles,
  type TileSweep,
  HEIGHT_UNIT,
  LINE_AT,
  SKIRT_DEPTH_METERS,
  metersToUnits,
  profileErrors,
  transitionOfExtent,
} from '@hexrace/tile';

type MutableProfile = { -readonly [K in keyof Profile]: Profile[K] };

/** What the lab shows about the surface under the pointer; a dash when nothing is there. */
export interface ProbeReadout {
  zone: string;
  type: number;
  s: number;
  offset: number;
}

export function probeReadout(surface: Surface | null): ProbeReadout {
  if (!surface) return { zone: '-', type: 0, s: 0, offset: 0 };
  return {
    zone: surface.zone,
    type: surface.type,
    s: Math.round(surface.s * 100) / 100,
    offset: Math.round(surface.offset * 100) / 100,
  };
}

/**
 * The tile the lab edits: every field of the model as a mutable knob for the debug panel, the
 * obstacles as toggles of one example each, and what the model makes of it, a sweep, a build for
 * the mesh and the collider, and the errors the model raises.
 */
export class TileDraft {
  environment: EnvironmentId = 'europe';
  /** Which way face 12 points in the world, 0 north then clockwise. */
  heading: Heading = 0;
  exit: ExitFace = 2;
  /** Fraction of the axis over which the profile changes, 1 for the whole tile. */
  transitionExtent = 1;
  readonly entry: MutableProfile = {
    position: 2,
    roadWidth: 3,
    leftShoulder: 1,
    rightShoulder: 1,
    height: 10,
    road: 1,
    shoulder: 1,
    landscape: 1,
  };
  readonly exitProfile: MutableProfile = {
    ...this.entry,
    position: 3,
    roadWidth: 2,
    height: 14,
    road: 2,
  };
  /** Height units per unit of axis length, what the track would deduce from the neighbours. */
  entrySlope = 0;
  exitSlope = 0;
  leftBarrier = false;
  rightBarrier = true;
  hazard = true;
  ramp = false;
  patch = true;
  line = true;
  smooth = false;
  outline = true;

  sweep(): TileSweep {
    return {
      center: { x: 0, y: 0 },
      heading: this.heading,
      exit: this.exit,
      entry: { ...this.entry },
      exitProfile: { ...this.exitProfile },
      transition: transitionOfExtent(this.transitionExtent),
      entrySlope: this.entrySlope,
      exitSlope: this.exitSlope,
    };
  }

  obstacles(): Obstacle[] {
    const list: Obstacle[] = [];
    if (this.leftBarrier) list.push({ kind: 'barrier', side: 'left', from: 0, to: 1 });
    if (this.rightBarrier) list.push({ kind: 'barrier', side: 'right', from: 0, to: 1 });
    if (this.hazard) list.push({ kind: 'hazard', size: 'medium', at: 0.75, offset: -0.6 });
    if (this.ramp) list.push({ kind: 'ramp', from: 0.3, to: 0.45 });
    if (this.patch)
      list.push({ kind: 'patch', from: 0.5, to: 0.65, offset: 0.4, width: 1, road: 3 });
    return list;
  }

  build(): TileBuild {
    const lowest = Math.min(this.entry.height, this.exitProfile.height) * HEIGHT_UNIT;
    return {
      sweep: this.sweep(),
      obstacles: this.obstacles(),
      line: this.line ? LINE_AT : null,
      skirtBase: lowest - metersToUnits(SKIRT_DEPTH_METERS),
    };
  }

  /** What the model refuses, in words, prefixed by where. */
  errors(obstacles: TileObstacles): string[] {
    const sweep = this.sweep();
    return [
      ...profileErrors(this.entry).map((e: string) => `entry: ${e}`),
      ...profileErrors(this.exitProfile).map((e: string) => `exit: ${e}`),
      ...this.obstacles().flatMap((o) => obstacles.errors(sweep, o)),
    ];
  }
}
