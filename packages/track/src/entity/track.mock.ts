import { type ExitFace, type Profile, type Tile } from '@hexrace/tile';

import { type Track } from '@track/entity/track';

const MOCK_PROFILE: Profile = {
  position: 3,
  roadWidth: 2,
  leftShoulder: 1,
  rightShoulder: 1,
  height: 24,
  road: 1,
  shoulder: 1,
  landscape: 1,
};

export function tileOf(exit: ExitFace, changes: Partial<Profile> = {}): Tile {
  return { exit, profile: { ...MOCK_PROFILE, ...changes } };
}

export function trackOf(tiles: readonly Tile[], changes: Partial<Track> = {}): Track {
  return {
    id: 'test-01',
    name: 'Test',
    environment: 'europe',
    mode: 'rally',
    tiles,
    ...changes,
  };
}

export function climbOf(heights: readonly number[], changes: Partial<Track> = {}): Track {
  return trackOf(
    heights.map((height: number) => tileOf(12, { height })),
    changes,
  );
}

export const EMPTY_TRACK: Track = trackOf([]);
