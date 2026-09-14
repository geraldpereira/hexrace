import { Injectable, inject } from '@angular/core';
import { type Track, TrackSweeps } from '@hexrace/track';
import { Units } from '@hexrace/tile';

/** How far below the skirt's floor the car must have fallen before it counts as gone, in metres. */
export const FALL_MARGIN_METERS = 3;

/**
 * When the car has left the terrain (functional spec 2.7): the world has no ground, only tiles
 * with a skirt going down to a floor common to the whole track. Once the car is that floor and a
 * margin below, nothing can catch it any more and it is put back on the track (3.8).
 */
@Injectable({ providedIn: 'root' })
export class FallWatch {
  margin = FALL_MARGIN_METERS;

  private readonly sweeps = inject(TrackSweeps);
  private readonly units = inject(Units);

  /** The height, in metres, under which there is nothing left to land on. */
  floor(track: Track): number {
    return this.units.unitsToMeters(this.sweeps.skirtBase(track)) - this.margin;
  }

  fallen(track: Track, height: number): boolean {
    return height < this.floor(track);
  }
}
