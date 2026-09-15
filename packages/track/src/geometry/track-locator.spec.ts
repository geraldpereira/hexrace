import { TestBed } from '@angular/core/testing';
import { Vec2 } from '@hexrace/commons';
import { Layout } from '@hexrace/tile';

import { EMPTY_TRACK, climbOf, tileOf, trackOf } from '@track/entity/track.mock';
import { type Track } from '@track/entity/track';
import { TrackExamples } from '@track/format/track-examples';
import { TrackLocator } from '@track/geometry/track-locator';
import { TrackPlacement } from '@track/geometry/track-placement';
import { TrackWindow } from '@track/geometry/track-window';

describe('TrackLocator', () => {
  let locator: TrackLocator;
  let placement: TrackPlacement;
  let layout: Layout;
  let window: TrackWindow;
  const line: Track = climbOf([24, 24, 24, 24, 24, 24, 24, 24], { mode: 'rally' });

  beforeEach(() => {
    TestBed.configureTestingModule({});
    locator = TestBed.inject(TrackLocator);
    placement = TestBed.inject(TrackPlacement);
    layout = TestBed.inject(Layout);
    window = TestBed.inject(TrackWindow);
  });

  function centerOf(track: Track, index: number): Vec2 {
    const laid = placement.place(track);
    return layout.cellToWorld(laid.tiles[index]!.cell);
  }

  it('finds the tile whose hexagon holds the point, at half its axis in the middle', () => {
    const laid = placement.place(line);
    const spot = locator.locate(line, laid, centerOf(line, 3));
    expect(spot?.placed.index).toBe(3);
    expect(spot?.cursor.tile).toBe(3);
    expect(spot?.cursor.s).toBeCloseTo(0.5, 6);
    expect(spot?.position).toBeCloseTo(3.5, 6);
  });

  it('answers nothing off the track, and nothing at all on a track without tiles', () => {
    const laid = placement.place(line);
    expect(locator.locate(line, laid, new Vec2(500, 500))).toBeNull();
    expect(locator.tileAt(placement.place(EMPTY_TRACK), Vec2.ZERO)).toBeNull();
  });

  it('looks around the hint first, then at the rest of the track, and wraps a hint past the end', () => {
    const laid = placement.place(line);
    expect(locator.tileAt(laid, centerOf(line, 1), 0)?.index).toBe(1);
    expect(locator.tileAt(laid, centerOf(line, 5), 0)?.index).toBe(5);
    expect(locator.tileAt(laid, centerOf(line, 7), 9)?.index).toBe(7);
  });

  it('gives back the position a player pose was taken at, tile by tile and on a loop', () => {
    const laid = placement.place(line);
    for (const position of [0.2, 2.5, 4.3, 7.9]) {
      const pose = window.playerPose(line, laid, position);
      expect(pose).not.toBeNull();
      if (!pose) return;
      expect(locator.locate(line, laid, pose.point)?.position).toBeCloseTo(position, 3);
    }
    const ring = TestBed.inject(TrackExamples).of('europe-loop-01') ?? EMPTY_TRACK;
    const laidRing = placement.place(ring);
    const pose = window.playerPose(ring, laidRing, 6.5);
    expect(pose && locator.locate(ring, laidRing, pose.point)?.position).toBeCloseTo(6.5, 3);
  });

  it('reads the progress of a turning tile from its own axis', () => {
    const turn = trackOf([tileOf(2), tileOf(12), tileOf(12)]);
    const laid = placement.place(turn);
    const pose = window.playerPose(turn, laid, 0.25);
    expect(pose && locator.progressOn(turn, laid.tiles[0]!, pose.point)).toBeCloseTo(0.25, 3);
  });
});
