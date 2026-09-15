import { TestBed } from '@angular/core/testing';
import { Profiles } from '@hexrace/tile';

import { type Track } from '@track/entity/track';
import { EMPTY_TRACK, climbOf } from '@track/entity/track.mock';
import { TrackExamples } from '@track/format/track-examples';
import { TrackProfiles } from '@track/geometry/track-profiles';

describe('TrackProfiles', () => {
  let profiles: TrackProfiles;
  let same: Profiles;
  let ring: Track;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    profiles = TestBed.inject(TrackProfiles);
    same = TestBed.inject(Profiles);
    ring = TestBed.inject(TrackExamples).of('europe-loop-01') ?? EMPTY_TRACK;
  });

  it('gives each tile the exit profile of the one before', () => {
    for (let i = 1; i < ring.tiles.length; i++) {
      expect(
        same.same(profiles.entryProfile(ring, i), ring.tiles[i - 1]?.profile ?? ({} as never)),
      ).toBe(true);
    }
  });

  it('closes the loop: the first tile is entered by the last tile exit', () => {
    const last = ring.tiles.at(-1)?.profile;
    expect(last && same.same(profiles.entryProfile(ring, 0), last)).toBe(true);
    expect(profiles.isClosed(ring)).toBe(true);
  });

  it('makes the start tile uniform on an open track', () => {
    const { entry, exit } = profiles.profilesOf(climbOf([10, 20]), 0);
    expect(same.same(entry, exit)).toBe(true);
    expect(profiles.isClosed(climbOf([10]))).toBe(false);
  });

  it('knows where the track changes inside a tile', () => {
    const { entry, exit } = profiles.profilesOf(ring, 4);
    expect([entry.roadWidth, exit.roadWidth]).toEqual([3, 2]);
    expect([entry.position, exit.position]).toEqual([2, 3]);
  });

  it('refuses an index outside the track', () => {
    expect(() => profiles.tileAt(ring, 12)).toThrow(RangeError);
  });
});
