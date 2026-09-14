import { TestBed } from '@angular/core/testing';

import { type Profile } from '@tile/entity/profile';
import { Profiles } from '@tile/geometry/profiles';

const sketch: Profile = {
  position: 2,
  roadWidth: 3,
  leftShoulder: 1,
  rightShoulder: 1,
  height: 5,
  road: 1,
  shoulder: 1,
  landscape: 1,
};

describe('Profiles', () => {
  let profiles: Profiles;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    profiles = TestBed.inject(Profiles);
  });

  it('reads landscape, shoulder, three of road, shoulder, two of landscape', () => {
    expect(profiles.zones(sketch)).toEqual([
      'landscape',
      'shoulder',
      'road',
      'road',
      'road',
      'shoulder',
      'landscape',
      'landscape',
    ]);
    expect(profiles.blockStart(sketch)).toBe(1);
    expect(profiles.blockEnd(sketch)).toBe(6);
    expect(profiles.blockWidth(sketch)).toBe(5);
    expect(profiles.blockSpan(sketch)).toEqual([1, 6]);
    expect(profiles.roadSpan(sketch)).toEqual([2, 5]);
    expect(profiles.roadCenter(sketch)).toBe(3.5);
  });

  it('compares profiles field by field', () => {
    expect(profiles.same(sketch, { ...sketch })).toBe(true);
    expect(profiles.same(sketch, { ...sketch, landscape: 2 })).toBe(false);
    expect(profiles.same(sketch, { ...sketch, height: 6 })).toBe(false);
    expect(profiles.same(sketch, { ...sketch, position: 3 })).toBe(false);
    expect(profiles.same(sketch, { ...sketch, roadWidth: 2 })).toBe(false);
    expect(profiles.same(sketch, { ...sketch, leftShoulder: 0 })).toBe(false);
    expect(profiles.same(sketch, { ...sketch, rightShoulder: 0 })).toBe(false);
    expect(profiles.same(sketch, { ...sketch, road: 2 })).toBe(false);
    expect(profiles.same(sketch, { ...sketch, shoulder: 2 })).toBe(false);
  });
});
