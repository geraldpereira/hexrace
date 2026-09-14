import { type Profile, type Tile } from '@hexrace/tile';
import { type Track } from '@hexrace/track';

const FLAT: Profile = {
  position: 3,
  roadWidth: 2,
  leftShoulder: 1,
  rightShoulder: 1,
  height: 24,
  road: 1,
  shoulder: 1,
  landscape: 1,
};

export function rallyTrack(count = 4, changes: Partial<Track> = {}): Track {
  const tiles: Tile[] = Array.from({ length: count }, () => ({ exit: 12, profile: { ...FLAT } }));
  return {
    id: 'race-test-01',
    name: 'Race test',
    environment: 'europe',
    mode: 'rally',
    tiles,
    ...changes,
  };
}
