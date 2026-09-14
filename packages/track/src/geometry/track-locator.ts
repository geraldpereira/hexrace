import { Injectable, inject } from '@angular/core';
import { Polygons, type Vec2 } from '@hexrace/commons';
import { Layout, SIDE, TilePaths } from '@hexrace/tile';

import { type Cursor } from '@track/entity/cursor';
import { type PlacedTile, type Placement } from '@track/entity/placement';
import { type Track } from '@track/entity/track';
import { TrackSweeps } from '@track/geometry/track-sweeps';

const EDGE_TOLERANCE = SIDE * 1e-6;

/** A point of the plane found on the laid track: the tile that owns it and where it stands. */
export interface TrackSpot {
  readonly placed: PlacedTile;
  readonly cursor: Cursor;
  /** The continuous position `TrackWindow` reads: the tile index plus the progress on its axis. */
  readonly position: number;
}

/**
 * The reverse of `TrackWindow`: from a point of the plane, in units, back to the tile whose
 * hexagon holds it and to the continuous position along the track. Cells do not overlap on a
 * valid track, so at most one tile answers; the search starts around a hint, the tile the caller
 * was on last step, which is where a car nearly always still is. Null off the track altogether.
 */
@Injectable({ providedIn: 'root' })
export class TrackLocator {
  /** How many tiles either side of the hint are looked at before the rest of the track. */
  span = 2;

  private readonly layout = inject(Layout);
  private readonly paths = inject(TilePaths);
  private readonly polygons = inject(Polygons);
  private readonly sweeps = inject(TrackSweeps);

  /** The laid tile whose hexagon holds the point, or null when no tile does. */
  tileAt(placement: Placement, p: Vec2, hint = 0): PlacedTile | null {
    const total = placement.tiles.length;
    if (total === 0) return null;
    for (const index of this.order(total, hint)) {
      const placed = placement.tiles[index]!;
      if (this.holds(placed, p)) return placed;
    }
    return null;
  }

  /** How far along the tile's axis the point stands, 0 at the entry face and 1 at the exit. */
  progressOn(track: Track, placed: PlacedTile, p: Vec2): number {
    const sweep = this.sweeps.of(track, placed);
    return this.paths.axisParameter(sweep.center, sweep.heading, sweep.exit, p);
  }

  locate(track: Track, placement: Placement, p: Vec2, hint = 0): TrackSpot | null {
    const placed = this.tileAt(placement, p, hint);
    if (!placed) return null;
    const s = this.progressOn(track, placed, p);
    return { placed, cursor: { tile: placed.index, s }, position: placed.index + s };
  }

  private holds(placed: PlacedTile, p: Vec2): boolean {
    const corners = this.layout.corners(this.layout.cellToWorld(placed.cell));
    return this.polygons.insideConvex(p, corners, EDGE_TOLERANCE);
  }

  private order(total: number, hint: number): number[] {
    const near = new Set<number>();
    for (let k = -this.span; k <= this.span; k++) {
      near.add((((hint + k) % total) + total) % total);
    }
    const rest: number[] = [];
    for (let i = 0; i < total; i++) if (!near.has(i)) rest.push(i);
    return [...near, ...rest];
  }
}
