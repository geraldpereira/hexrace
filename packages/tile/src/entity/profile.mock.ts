import { type Profile } from '@tile/entity/profile';

export const STANDARD_PROFILE: Profile = {
  position: 2,
  roadWidth: 3,
  leftShoulder: 1,
  rightShoulder: 1,
  height: 5,
  road: 1,
  shoulder: 1,
  landscape: 1,
};

export const TEN_STEPS_HIGH: Profile = { ...STANDARD_PROFILE, height: 10 };

export const NARROW_LEFT: Profile = { ...STANDARD_PROFILE, roadWidth: 1, height: 3 };

export const NARROW_RIGHT: Profile = { ...NARROW_LEFT, position: 5 };

export const WIDE: Profile = { ...NARROW_LEFT, position: 1, roadWidth: 5, rightShoulder: 0 };

export const WIDE_LEFT: Profile = {
  position: 1,
  roadWidth: 4,
  leftShoulder: 0,
  rightShoulder: 1,
  height: 3,
  road: 1,
  shoulder: 2,
  landscape: 1,
};

export const NARROW_RIGHT_DARK: Profile = {
  ...WIDE_LEFT,
  position: 5,
  roadWidth: 1,
  leftShoulder: 1,
  rightShoulder: 1,
  road: 3,
  landscape: 2,
};

const LOW: Profile = { ...STANDARD_PROFILE, height: 3 };

export const HIGH: Profile = { ...LOW, height: 7, position: 3, roadWidth: 2 };

export const NO_SHOULDERS: Profile = {
  ...WIDE_LEFT,
  position: 2,
  leftShoulder: 0,
  rightShoulder: 0,
};

export const PALE_SHOULDER: Profile = { ...STANDARD_PROFILE, shoulder: 2 };

export const DARK_EXIT: Profile = { ...PALE_SHOULDER, road: 3, shoulder: 3, landscape: 2 };
