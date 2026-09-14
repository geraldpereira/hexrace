import { Injectable, inject } from '@angular/core';
import {
  type Tile,
  type TileBuild,
  type TileSweep,
  EnvironmentCatalog,
  HEIGHT_UNIT,
  Layout,
  SKIRT_DEPTH_METERS,
  Units,
} from '@hexrace/tile';

import { type PlacedTile, type Placement } from '@track/entity/placement';
import { type Track } from '@track/entity/track';
import { TrackMarks } from '@track/geometry/track-marks';

/**
 * What a laid tile owes its geometry: its centre in the plane, its heading, both profiles, the
 * transition span of the track's environment and the slopes its neighbours dictate. The skirt
 * floor is shared by the whole track, below its lowest point (functional spec 2.7).
 */
@Injectable({ providedIn: 'root' })
export class TrackSweeps {
  private readonly environments = inject(EnvironmentCatalog);
  private readonly layout = inject(Layout);
  private readonly marks = inject(TrackMarks);
  private readonly units = inject(Units);

  of(track: Track, placed: PlacedTile): TileSweep {
    return {
      center: this.layout.cellToWorld(placed.cell),
      heading: placed.heading,
      exit: placed.tile.exit,
      entry: placed.entry,
      exitProfile: placed.tile.profile,
      transition: this.environments.of(track.environment).transition,
      entrySlope: placed.entrySlope,
      exitSlope: placed.exitSlope,
    };
  }

  /** The common floor of every skirt, in units: under the lowest face of the track. */
  skirtBase(track: Track): number {
    const heights = track.tiles.map((tile: Tile) => tile.profile.height);
    const lowest = heights.length === 0 ? 0 : Math.min(...heights);
    return lowest * HEIGHT_UNIT - this.units.metersToUnits(SKIRT_DEPTH_METERS);
  }

  buildOf(track: Track, placed: PlacedTile, skirtBase: number): TileBuild {
    return {
      sweep: this.of(track, placed),
      obstacles: placed.tile.obstacles ?? [],
      line: this.marks.at(track, placed.index),
      skirtBase,
    };
  }

  builds(track: Track, placement: Placement): TileBuild[] {
    const skirtBase = this.skirtBase(track);
    return placement.tiles.map((placed: PlacedTile) => this.buildOf(track, placed, skirtBase));
  }
}
