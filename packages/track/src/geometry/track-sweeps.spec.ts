import { TestBed } from '@angular/core/testing';
import { HEIGHT_UNIT, LINE_AT, Layout, SKIRT_DEPTH_METERS, Units } from '@hexrace/tile';

import { EMPTY_TRACK, climbOf } from '@track/entity/track.mock';
import { TrackPlacement } from '@track/geometry/track-placement';
import { TrackSweeps } from '@track/geometry/track-sweeps';

describe('TrackSweeps', () => {
  let sweeps: TrackSweeps;
  let placement: TrackPlacement;
  let layout: Layout;
  let units: Units;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    sweeps = TestBed.inject(TrackSweeps);
    placement = TestBed.inject(TrackPlacement);
    layout = TestBed.inject(Layout);
    units = TestBed.inject(Units);
  });

  it('resolves a laid tile into a sweep at its cell, with its environment transition', () => {
    const track = climbOf([10, 20]);
    const placed = placement.place(track).tiles[1];
    expect(placed).toBeDefined();
    if (!placed) return;
    const sweep = sweeps.of(track, placed);
    expect(sweep.center).toEqual(layout.cellToWorld({ q: 0, r: 1 }));
    expect(sweep.heading).toBe(0);
    expect(sweep.entry.height).toBe(10);
    expect(sweep.exitProfile.height).toBe(20);
    expect(sweep.transition).toEqual({ start: 0, end: 1 });
  });

  it('puts the skirt of every tile on one floor, under the lowest face', () => {
    expect(sweeps.skirtBase(climbOf([10, 4, 20]))).toBeCloseTo(
      4 * HEIGHT_UNIT - units.metersToUnits(SKIRT_DEPTH_METERS),
      9,
    );
    expect(sweeps.skirtBase(EMPTY_TRACK)).toBeCloseTo(-units.metersToUnits(SKIRT_DEPTH_METERS), 9);
  });

  it('builds every tile of a track, the line only where a mark sits', () => {
    const track = climbOf([10, 12, 14]);
    const builds = sweeps.builds(track, placement.place(track));
    expect(builds).toHaveLength(3);
    expect(builds.map((build) => build.line)).toEqual([LINE_AT, null, LINE_AT]);
    expect(new Set(builds.map((build) => build.skirtBase)).size).toBe(1);
    expect(builds[0]?.obstacles).toEqual([]);
  });
});
