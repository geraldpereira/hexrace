import { TestBed } from '@angular/core/testing';
import { HEIGHT_UNIT, TilePaths, TileSweeper } from '@hexrace/tile';

import { type PlacedTile } from '@track/entity/placement';
import { type Track } from '@track/entity/track';
import { climbOf } from '@track/entity/track.mock';
import { TrackPlacement } from '@track/geometry/track-placement';
import { TrackSlopes } from '@track/geometry/track-slopes';
import { TrackSweeps } from '@track/geometry/track-sweeps';

describe('TrackSlopes', () => {
  let slopes: TrackSlopes;
  let placement: TrackPlacement;
  let sweeps: TrackSweeps;
  let sweeper: TileSweeper;
  let paths: TilePaths;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    slopes = TestBed.inject(TrackSlopes);
    placement = TestBed.inject(TrackPlacement);
    sweeps = TestBed.inject(TrackSweeps);
    sweeper = TestBed.inject(TileSweeper);
    paths = TestBed.inject(TilePaths);
  });

  function heightAt(track: Track, placed: PlacedTile, s: number): number {
    return sweeper.heightOfS(sweeps.of(track, placed), s);
  }

  it('is the mean slope of a tile, and zero outside the track', () => {
    const track = climbOf([3, 4]);
    expect(slopes.secant(track, 1)).toBeCloseTo(1 / paths.length(12), 12);
    expect(slopes.secant(track, 9)).toBe(0);
  });

  it('makes a steady climb one straight ramp, with no step at the joints', () => {
    const track = climbOf([3, 4, 5, 6, 6]);
    const placed = placement.place(track);
    const middle = placed.tiles[2];
    const before = placed.tiles[1];
    expect(middle && before).toBeTruthy();
    if (!middle || !before) return;
    for (let i = 0; i <= 10; i++) {
      expect(heightAt(track, middle, i / 10)).toBeCloseTo((4 + i / 10) * HEIGHT_UNIT, 9);
    }
    const step = 1e-5;
    const length = paths.length(12);
    const slopeBefore =
      (heightAt(track, before, 1) - heightAt(track, before, 1 - step)) / (step * length);
    const slopeAfter =
      (heightAt(track, middle, step) - heightAt(track, middle, 0)) / (step * length);
    expect(slopeBefore).toBeCloseTo(slopeAfter, 4);
    expect(slopeBefore).toBeCloseTo(HEIGHT_UNIT / length, 4);
  });

  it('leaves a flat tile between two climbs flat, without overshoot', () => {
    const track = climbOf([3, 4, 4, 5, 5]);
    const placed = placement.place(track);
    const flat = placed.tiles[2];
    const climb = placed.tiles[1];
    if (!flat || !climb) return;
    for (let i = 0; i <= 20; i++) {
      expect(heightAt(track, flat, i / 20)).toBeCloseTo(4 * HEIGHT_UNIT, 9);
      const h = heightAt(track, climb, i / 20);
      expect(h).toBeGreaterThanOrEqual(3 * HEIGHT_UNIT - 1e-9);
      expect(h).toBeLessThanOrEqual(4 * HEIGHT_UNIT + 1e-9);
    }
  });

  it('is zero at both ends of an open track and continuous around a loop', () => {
    const open = slopes.faceSlopes(climbOf([3, 4, 5]));
    expect(open[0]).toBe(0);
    expect(open[3]).toBe(0);
    const loop = slopes.faceSlopes(climbOf([3, 4, 5, 4, 3], { mode: 'track' }));
    expect(loop[0]).toBe(loop[5]);
    expect(slopes.faceSlopes(climbOf([], { mode: 'track' }))).toEqual([0]);
  });
});
