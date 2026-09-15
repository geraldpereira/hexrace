import { TestBed } from '@angular/core/testing';
import { HEIGHT_UNIT } from '@hexrace/tile';

import { EMPTY_TRACK, climbOf } from '@track/entity/track.mock';
import { type Track } from '@track/entity/track';
import { TrackExamples } from '@track/format/track-examples';
import { TrackPlacement } from '@track/geometry/track-placement';
import { TrackWindow } from '@track/geometry/track-window';

describe('TrackWindow', () => {
  let window: TrackWindow;
  let placement: TrackPlacement;
  let ring: Track;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    window = TestBed.inject(TrackWindow);
    placement = TestBed.inject(TrackPlacement);
    ring = TestBed.inject(TrackExamples).of('europe-loop-01') ?? EMPTY_TRACK;
  });

  it('cuts a position into a tile and a progress, wrapping on a loop', () => {
    expect(window.cursorAt(3.25, 12, true)).toEqual({ tile: 3, s: 0.25 });
    expect(window.cursorAt(12.5, 12, true)).toEqual({ tile: 0, s: 0.5 });
    expect(window.cursorAt(-0.5, 12, true)).toEqual({ tile: 11, s: 0.5 });
    expect(window.cursorAt(7, 4, false).tile).toBe(3);
    expect(window.cursorAt(-2, 4, false)).toEqual({ tile: 0, s: 0 });
    expect(window.cursorAt(1, 0, false)).toEqual({ tile: 0, s: 0 });
  });

  it('shows X tiles ahead and Y behind, past the start on a loop', () => {
    expect([...window.indices(12, 0, true, 3, 1)].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 11]);
    expect([...window.indices(12, 11, true, 2, 1)].sort((a, b) => a - b)).toEqual([0, 1, 10, 11]);
    expect([...window.indices(4, 3, false, 3, 1)].sort((a, b) => a - b)).toEqual([2, 3]);
    expect([...window.indices(4, 0, false, 1, 2)]).toEqual([0, 1]);
  });

  it('uses its own counts by default', () => {
    window.ahead = 1;
    window.behind = 0;
    expect([...window.indices(5, 2, false)]).toEqual([2, 3]);
  });

  it('puts the player on the road centre, at ground height, facing the way it goes', () => {
    const line = climbOf([24, 24, 24], { mode: 'rally' });
    const pose = window.playerPose(line, placement.place(line), 0.5);
    expect(pose).not.toBeNull();
    if (!pose) return;
    expect(pose.travel.x).toBeCloseTo(0, 9);
    expect(pose.travel.y).toBeCloseTo(1, 9);
    expect(pose.height).toBeCloseTo(24 * HEIGHT_UNIT, 9);
    expect(pose.point.x).toBeCloseTo(0, 9);
    expect(window.playerPose(ring, placement.place(ring), 12.25)?.cursor).toEqual({
      tile: 0,
      s: 0.25,
    });
    expect(window.playerPose(EMPTY_TRACK, placement.place(EMPTY_TRACK), 0)).toBeNull();
  });
});
