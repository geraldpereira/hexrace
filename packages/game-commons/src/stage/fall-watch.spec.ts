import { TestBed } from '@angular/core/testing';
import { SKIRT_DEPTH_METERS, UNIT_METERS } from '@hexrace/tile';
import { TrackSweeps } from '@hexrace/track';

import { rallyTrack } from '@game-commons/entity/track.mock';
import { FallWatch } from '@game-commons/stage/fall-watch';

describe('FallWatch', () => {
  let watch: FallWatch;
  let sweeps: TrackSweeps;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    watch = TestBed.inject(FallWatch);
    sweeps = TestBed.inject(TrackSweeps);
  });

  it('puts the floor a margin under the skirt of the lowest tile', () => {
    const track = rallyTrack(3);
    const skirt = sweeps.skirtBase(track) * UNIT_METERS;
    expect(watch.floor(track)).toBeCloseTo(skirt - watch.margin, 6);
    expect(skirt).toBeLessThan(24 * 0.2 - SKIRT_DEPTH_METERS + 1e-6);
  });

  it('calls a fall only once nothing can catch the car any more', () => {
    const track = rallyTrack(3);
    const floor = watch.floor(track);
    expect(watch.fallen(track, floor + 0.1)).toBe(false);
    expect(watch.fallen(track, floor - 0.1)).toBe(true);
  });
});
