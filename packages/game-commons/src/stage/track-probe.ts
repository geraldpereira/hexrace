import { Injectable, inject } from '@angular/core';
import { type Point3, type SurfaceProbe, type SurfaceQuery } from '@hexrace/car';
import { type Vec2 } from '@hexrace/commons';
import { type Surface, TileSurfaces } from '@hexrace/tile';
import { TrackLocator } from '@hexrace/track';

import { type TrackStage } from '@game-commons/stage/track-stage';

/**
 * What the car asks about the ground under a wheel, answered by the track: the point comes in
 * metres, goes back to the plane in units, finds the tile that holds it and reads the zone and
 * the rank there. Null when no tile owns the point, and the wheel then keeps the car's
 * `defaultSurface`. The tile the locator found does hold the point, so its surface is never
 * missing: the two ask the very same question of the very same hexagon.
 */
@Injectable({ providedIn: 'root' })
export class TrackProbe implements SurfaceProbe {
  /** The stage whose laid track is read; without one the probe answers nothing. */
  stage: TrackStage | null = null;

  private readonly locator = inject(TrackLocator);
  private readonly surfaces = inject(TileSurfaces);
  private hint = 0;

  at(point: Point3): SurfaceQuery | null {
    const stage = this.stage;
    const track = stage?.track;
    if (!stage || !track) return null;
    const p: Vec2 = stage.plane(point);
    const placed = this.locator.tileAt(stage.placement, p, this.hint);
    if (!placed) return null;
    this.hint = placed.index;
    const build = stage.builds[placed.index]!;
    const surface = this.surfaces.at(build.sweep, p, build.obstacles)!;
    return this.query(track.environment, surface);
  }

  private query(environment: SurfaceQuery['environment'], surface: Surface): SurfaceQuery {
    return { environment, zone: surface.zone, rank: surface.type };
  }
}
