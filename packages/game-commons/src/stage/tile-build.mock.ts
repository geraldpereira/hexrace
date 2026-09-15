import { Vec2 } from '@hexrace/commons';
import { type Obstacle, type Profile, type TileBuild, type TileSweep } from '@hexrace/tile';

const FLAT: Profile = {
  position: 3,
  roadWidth: 2,
  leftShoulder: 1,
  rightShoulder: 1,
  height: 0,
  road: 1,
  shoulder: 1,
  landscape: 1,
};

export function straightBuild(
  obstacles: readonly Obstacle[] = [],
  profile: Partial<Profile> = {},
): TileBuild {
  const shape: Profile = { ...FLAT, ...profile };
  const sweep: TileSweep = {
    center: Vec2.ZERO,
    heading: 0,
    exit: 12,
    entry: shape,
    exitProfile: shape,
  };
  if (obstacles.length === 0) return { sweep, skirtBase: -2 };
  return { sweep, obstacles, skirtBase: -2 };
}
