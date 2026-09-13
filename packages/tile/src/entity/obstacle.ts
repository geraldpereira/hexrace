import { Injectable, inject } from '@angular/core';

import { type SPoint } from '@tile/entity/geometry';
import { type Vec2, add, hexCorners, insideConvex, scale } from '@tile/entity/layout';
import { type RoadType } from '@tile/entity/profile';
import { type Boundaries, type TileSweep, TileSweeper } from '@tile/entity/sweep';

export type HazardSize = 'small' | 'medium' | 'large';

/** A hazard's footprint in units: length along the road, width across. */
export const HAZARD_FOOTPRINT: Record<HazardSize, { length: number; width: number }> = {
  small: { length: 1, width: 1 },
  medium: { length: 2, width: 1 },
  large: { length: 2, width: 2 },
};

/** A rigid object at a fraction of the axis and an offset from the road centre, along the road. */
export interface Hazard {
  readonly kind: 'hazard';
  readonly size: HazardSize;
  readonly at: number;
  readonly offset: number;
}

/** On the unit bordering the road on the chosen side, whether a shoulder is there or not. */
export interface Barrier {
  readonly kind: 'barrier';
  readonly side: 'left' | 'right';
  readonly from: number;
  readonly to: number;
}

/** Across the whole road. */
export interface RoadBand {
  readonly kind: 'ramp' | 'bump';
  readonly from: number;
  readonly to: number;
}

/** A patch of another road type on the road, without collision. */
export interface Patch {
  readonly kind: 'patch';
  readonly from: number;
  readonly to: number;
  readonly offset: number;
  readonly width: number;
  readonly road: RoadType;
}

/** The obstacles of a tile (functional spec 2.4), placed relative to the road, never to the face. */
export type Obstacle = Hazard | Barrier | RoadBand | Patch;

/** What a barrier reserves in the data, and how thick its body is, in units. */
export const BARRIER_FOOTPRINT_WIDTH = 1;
export const BARRIER_BODY_WIDTH = 0.3;

const BAND_SAMPLES = 12;

/**
 * An obstacle laid on the tile: its reserved outline and its body, the same except for barriers.
 * Along the road it sits at a fraction of the axis, across it at an offset in units from the road
 * centre, negative left, following the road as it moves. A hazard is level, all corners at the
 * height of its centre; a band follows the road between two fractions, left edge out, right back.
 */
export interface Footprint {
  readonly obstacle: Obstacle;
  readonly outline: SPoint[];
  readonly body: SPoint[];
}

export function describeObstacle(obstacle: Obstacle): string {
  switch (obstacle.kind) {
    case 'hazard':
      return `hazard ${obstacle.size} at ${obstacle.at}`;
    case 'barrier':
      return `${obstacle.side} barrier`;
    default:
      return obstacle.kind;
  }
}

/** Lays obstacles on a swept tile: where they sit in the plane, and what is wrong with them. */
@Injectable({ providedIn: 'root' })
export class TileObstacles {
  private readonly sweeper = inject(TileSweeper);

  footprint(sweep: TileSweep, obstacle: Obstacle): Footprint {
    switch (obstacle.kind) {
      case 'hazard':
        return this.hazardFootprint(sweep, obstacle);
      case 'barrier':
        return this.barrierFootprint(sweep, obstacle);
      case 'ramp':
      case 'bump': {
        const outline = this.band(sweep, obstacle, (b) => [b.roadLeft, b.roadRight]);
        return { obstacle, outline, body: outline };
      }
      case 'patch': {
        const outline = this.band(sweep, obstacle, (b) => [
          add(b.center, scale(b.right, obstacle.offset - obstacle.width / 2)),
          add(b.center, scale(b.right, obstacle.offset + obstacle.width / 2)),
        ]);
        return { obstacle, outline, body: outline };
      }
    }
  }

  /** What is wrong with an obstacle, in words: fractions outside the tile, an outline past the hexagon. */
  errors(sweep: TileSweep, obstacle: Obstacle): string[] {
    const errors: string[] = [];
    const name = describeObstacle(obstacle);
    if (obstacle.kind === 'hazard') {
      if (!inUnit(obstacle.at)) errors.push(`${name}: position ${obstacle.at} outside 0 to 1`);
    } else if (!inUnit(obstacle.from) || !inUnit(obstacle.to)) {
      errors.push(`${name}: span ${obstacle.from} to ${obstacle.to} outside 0 to 1`);
    } else if (obstacle.from >= obstacle.to) {
      errors.push(`${name}: span ${obstacle.from} to ${obstacle.to} is empty`);
    }
    if (errors.length > 0) return errors;
    const corners = hexCorners(sweep.center);
    const { outline } = this.footprint(sweep, obstacle);
    if (outline.some((p) => !insideConvex(p, corners))) {
      errors.push(`${name}: spills out of the tile`);
    }
    return errors;
  }

  private hazardFootprint(sweep: TileSweep, obstacle: Hazard): Footprint {
    const { length, width } = HAZARD_FOOTPRINT[obstacle.size];
    const b = this.sweeper.boundariesAt(sweep, obstacle.at);
    const center = add(b.center, scale(b.right, obstacle.offset));
    const along = scale(b.travel, length / 2);
    const across = scale(b.right, width / 2);
    const outline = [
      add(add(center, along), across),
      add(add(center, along), scale(across, -1)),
      add(add(center, scale(along, -1)), scale(across, -1)),
      add(add(center, scale(along, -1)), across),
    ].map((p) => ({ ...p, s: obstacle.at }));
    return { obstacle, outline, body: outline };
  }

  private barrierFootprint(sweep: TileSweep, obstacle: Barrier): Footprint {
    const out = obstacle.side === 'left' ? -1 : 1;
    const edge = obstacle.side === 'left' ? 'roadLeft' : 'roadRight';
    const outline = this.band(sweep, obstacle, (b) => [
      b[edge],
      add(b[edge], scale(b.right, out * BARRIER_FOOTPRINT_WIDTH)),
    ]);
    const body = this.band(sweep, obstacle, (b) => [
      add(b[edge], scale(b.right, out * (BARRIER_FOOTPRINT_WIDTH - BARRIER_BODY_WIDTH))),
      add(b[edge], scale(b.right, out * BARRIER_FOOTPRINT_WIDTH)),
    ]);
    return { obstacle, outline, body };
  }

  private band(
    sweep: TileSweep,
    span: { readonly from: number; readonly to: number },
    edges: (b: Boundaries) => [Vec2, Vec2],
  ): SPoint[] {
    const left: SPoint[] = [];
    const right: SPoint[] = [];
    for (let i = 0; i <= BAND_SAMPLES; i++) {
      const s = span.from + ((span.to - span.from) * i) / BAND_SAMPLES;
      const [l, r] = edges(this.sweeper.boundariesAt(sweep, s));
      left.push({ ...l, s });
      right.push({ ...r, s });
    }
    return [...left, ...right.reverse()];
  }
}

function inUnit(value: number): boolean {
  return value >= 0 && value <= 1;
}
