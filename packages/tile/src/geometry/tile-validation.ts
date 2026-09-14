import { Injectable, inject } from '@angular/core';
import { Polygons } from '@hexrace/commons';

import { type TileIssue, type TileIssueCode } from '@tile/entity/issue';
import { SIDE } from '@tile/entity/layout';
import { type Obstacle } from '@tile/entity/obstacles/obstacle';
import { type SPoint } from '@tile/entity/slice';
import {
  type Profile,
  FACE_WIDTH,
  MAX_BLOCK_WIDTH,
  MAX_HEIGHT,
  MAX_ROAD_WIDTH,
  MIN_HEIGHT,
  MIN_LANDSCAPE_WIDTH,
  MIN_ROAD_WIDTH,
} from '@tile/entity/profile';
import { type TileSweep } from '@tile/entity/sweep';
import { Layout } from '@tile/geometry/layout';
import { Profiles } from '@tile/geometry/profiles';
import { TileObstacles } from '@tile/geometry/tile-obstacles';

/**
 * What the model refuses, as `TileIssue`s with a code the editor can act on (functional spec 2.1
 * for profiles, 2.4 for obstacles): a road too wide or too narrow, a block eating the landscape, a
 * height out of range, an obstacle outside its tile. Joining, closure and slopes are the track's.
 */
@Injectable({ providedIn: 'root' })
export class TileValidation {
  private readonly layout = inject(Layout);
  private readonly profiles = inject(Profiles);
  private readonly obstacles = inject(TileObstacles);
  private readonly polygons = inject(Polygons);

  profile(profile: Profile): TileIssue[] {
    const issues: TileIssue[] = [];
    const say = (code: TileIssueCode, message: string): void => {
      issues.push({ code, subject: 'profile', message });
    };
    const { position, roadWidth, height } = profile;
    if (!Number.isInteger(roadWidth) || roadWidth < MIN_ROAD_WIDTH || roadWidth > MAX_ROAD_WIDTH) {
      say(
        'road-width',
        `road of ${roadWidth} units, expected ${MIN_ROAD_WIDTH} to ${MAX_ROAD_WIDTH}`,
      );
    }
    const block = this.profiles.blockWidth(profile);
    if (block > MAX_BLOCK_WIDTH) {
      say('block-width', `road plus shoulders make ${block} units, at most ${MAX_BLOCK_WIDTH}`);
    }
    if (!Number.isInteger(position)) {
      say('position-not-whole', `position ${position} is not whole`);
    } else {
      const start = this.profiles.blockStart(profile);
      const end = this.profiles.blockEnd(profile);
      if (start < MIN_LANDSCAPE_WIDTH) {
        say('no-landscape-left', `no landscape on the left: the block starts at unit ${start}`);
      }
      if (end > FACE_WIDTH - MIN_LANDSCAPE_WIDTH) {
        say('no-landscape-right', `no landscape on the right: the block ends at unit ${end}`);
      }
    }
    if (!Number.isInteger(height) || height < MIN_HEIGHT || height > MAX_HEIGHT) {
      say(
        'height-out-of-range',
        `height ${height}, expected a whole number from ${MIN_HEIGHT} to ${MAX_HEIGHT}`,
      );
    }
    return issues;
  }

  obstacle(sweep: TileSweep, obstacle: Obstacle): TileIssue[] {
    const subject = this.describe(obstacle);
    const say = (code: TileIssueCode, message: string): TileIssue[] => [{ code, subject, message }];
    if (obstacle.kind === 'hazard') {
      if (!this.inUnit(obstacle.at))
        return say('obstacle-position', `position ${obstacle.at} outside 0 to 1`);
    } else if (!this.inUnit(obstacle.from) || !this.inUnit(obstacle.to)) {
      return say('obstacle-span', `span ${obstacle.from} to ${obstacle.to} outside 0 to 1`);
    } else if (obstacle.from >= obstacle.to) {
      return say('obstacle-empty-span', `span ${obstacle.from} to ${obstacle.to} is empty`);
    }
    const corners = this.layout.corners(sweep.center);
    const { outline } = this.obstacles.footprint(sweep, obstacle);
    if (outline.some((p: SPoint) => !this.polygons.insideConvex(p.at, corners, SIDE * 1e-6))) {
      return say('obstacle-spills', 'spills out of the tile');
    }
    return [];
  }

  /** Every issue of a tile alone: both profiles, then each obstacle. */
  tile(sweep: TileSweep, obstacles: readonly Obstacle[] = []): TileIssue[] {
    return [
      ...this.profile(sweep.entry).map((i) => ({ ...i, subject: 'entry profile' })),
      ...this.profile(sweep.exitProfile).map((i) => ({ ...i, subject: 'exit profile' })),
      ...obstacles.flatMap((o) => this.obstacle(sweep, o)),
    ];
  }

  /** An obstacle in words, the subject of its issues: `hazard medium at 0.75`, `left barrier`, `ramp`. */
  describe(obstacle: Obstacle): string {
    switch (obstacle.kind) {
      case 'hazard':
        return `hazard ${obstacle.size} at ${obstacle.at}`;
      case 'barrier':
        return `${obstacle.side} barrier`;
      default:
        return obstacle.kind;
    }
  }

  private inUnit(value: number): boolean {
    return value >= 0 && value <= 1;
  }
}
