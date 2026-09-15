import { TestBed } from '@angular/core/testing';

import { BestTimes } from '@hexrace/game-commons';
import { type Track, TrackExamples } from '@hexrace/track';

import { GameTracks, type PlayableTrack } from '@ui/game/game-tracks';

describe('GameTracks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function tracks(): PlayableTrack[] {
    return TestBed.inject(GameTracks).all();
  }

  it('keeps the loops the model accepts, and nothing else', () => {
    const offered = tracks();
    expect(offered.length).toBeGreaterThan(0);
    const examples = TestBed.inject(TrackExamples).all();
    const loops = examples.filter((track: Track) => track.mode === 'track');
    expect(offered.length).toBeLessThan(loops.length);
    for (const playable of offered) {
      expect(playable.track.mode).toBe('track');
      expect(playable.summary.locked).toBe(false);
      expect(playable.summary.lengthM).toBeGreaterThan(0);
      expect(playable.summary.environment).not.toBe('');
    }
    expect(offered.map((p: PlayableTrack) => p.track.id)).toContain('europe-ring-01');
  });

  it('reads the best time saved for a track, and finds a track by its id', () => {
    expect(tracks()[0]?.summary.bestMs).toBeNull();
    TestBed.inject(BestTimes).record('europe-ring-01', 61_234);
    expect(TestBed.inject(GameTracks).of('europe-ring-01')?.summary.bestMs).toBe(61_234);
    expect(TestBed.inject(GameTracks).of('nowhere-at-all')).toBeNull();
  });
});
