import { Vec2 } from '@hexrace/commons';
import {
  type ExitFace,
  type Profile,
  type ShoulderWidth,
  type TileSweep,
  FACE_WIDTH,
} from '@hexrace/tile';

function roadProfile(
  roadWidth: number,
  leftShoulder: ShoulderWidth = 0,
  rightShoulder: ShoulderWidth = 0,
): Profile {
  return {
    position: Math.round((FACE_WIDTH - roadWidth) / 2),
    roadWidth,
    leftShoulder,
    rightShoulder,
    height: 20,
    road: 1,
    shoulder: 1,
    landscape: 1,
  };
}

export function roadSweep(profile: Profile, exit: ExitFace = 12, entry = profile): TileSweep {
  return { center: Vec2.ZERO, heading: 0, exit, entry, exitProfile: profile };
}

export const STANDARD_ROAD = roadProfile(3, 1, 1);
export const TWO_UNIT_ROAD = roadProfile(2);
export const ONE_UNIT_ROAD = roadProfile(1);
export const WIDE_ROAD = roadProfile(5);
export const LEFT_SHOULDER_ROAD = roadProfile(1, 1, 0);
