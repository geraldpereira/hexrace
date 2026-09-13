import {
  type Profile,
  blockEnd,
  blockStart,
  blockWidth,
  isValidProfile,
  profileErrors,
  sameProfile,
  zoneAt,
  zones,
} from '@tile/entity/profile';

const sketch3: Profile = {
  position: 2,
  roadWidth: 3,
  leftShoulder: 1,
  rightShoulder: 1,
  height: 5,
  road: 1,
  shoulder: 1,
  landscape: 1,
};

describe('profile', () => {
  it('reproduces sketch 3: landscape, shoulder, three of road, shoulder, two of landscape', () => {
    expect(zones(sketch3)).toEqual([
      'landscape',
      'shoulder',
      'road',
      'road',
      'road',
      'shoulder',
      'landscape',
      'landscape',
    ]);
    expect(blockStart(sketch3)).toBe(1);
    expect(blockEnd(sketch3)).toBe(6);
    expect(blockWidth(sketch3)).toBe(5);
    expect(zoneAt(sketch3, 7)).toBe('landscape');
    expect(isValidProfile(sketch3)).toBe(true);
  });

  it('accepts a road of 5 with one shoulder, refuses it with two', () => {
    expect(isValidProfile({ ...sketch3, position: 1, roadWidth: 5, leftShoulder: 0 })).toBe(true);
    expect(profileErrors({ ...sketch3, position: 2, roadWidth: 5 })).toEqual([
      'road plus shoulders make 7 units, at most 6',
      'no landscape on the right: the block ends at unit 8',
    ]);
  });

  it('demands a unit of landscape on each side', () => {
    expect(profileErrors({ ...sketch3, position: 1 })).toEqual([
      'no landscape on the left: the block starts at unit 0',
    ]);
    expect(profileErrors({ ...sketch3, position: 4 })).toEqual([
      'no landscape on the right: the block ends at unit 8',
    ]);
  });

  it('refuses a position that is not whole', () => {
    expect(profileErrors({ ...sketch3, position: 2.5 })).toEqual(['position 2.5 is not whole']);
  });

  it.each([
    [{ roadWidth: 0 }, 'road of 0 units, expected 1 to 5'],
    [{ roadWidth: 2.5 }, 'road of 2.5 units, expected 1 to 5'],
    [{ height: -1 }, 'height -1, expected a whole number from 0 to 1000'],
    [{ height: 1001 }, 'height 1001, expected a whole number from 0 to 1000'],
    [{ height: 2.5 }, 'height 2.5, expected a whole number from 0 to 1000'],
  ])('bounds road width and height: %o', (change, message) => {
    const errors = profileErrors({ ...sketch3, ...change });
    expect(errors).toEqual([message]);
  });

  it('compares profiles in every field', () => {
    expect(sameProfile(sketch3, { ...sketch3 })).toBe(true);
    expect(sameProfile(sketch3, { ...sketch3, landscape: 2 })).toBe(false);
    expect(sameProfile(sketch3, { ...sketch3, height: 6 })).toBe(false);
    expect(sameProfile(sketch3, { ...sketch3, shoulder: 2 })).toBe(false);
    expect(sameProfile(sketch3, { ...sketch3, road: 2 })).toBe(false);
    expect(sameProfile(sketch3, { ...sketch3, rightShoulder: 0 })).toBe(false);
    expect(sameProfile(sketch3, { ...sketch3, leftShoulder: 0 })).toBe(false);
    expect(sameProfile(sketch3, { ...sketch3, roadWidth: 2 })).toBe(false);
    expect(sameProfile(sketch3, { ...sketch3, position: 3 })).toBe(false);
  });
});
