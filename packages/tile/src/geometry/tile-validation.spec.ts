import { TestBed } from '@angular/core/testing';

import { type TileIssue } from '@tile/entity/issue';
import {
  BUMP,
  LEFT_BARRIER,
  MEDIUM_HAZARD,
  PATCH,
  RAMP,
  RIGHT_BARRIER,
} from '@tile/entity/obstacle.mock';
import { type Obstacle } from '@tile/entity/obstacles/obstacle';
import { type Profile } from '@tile/entity/profile';
import { STANDARD_PROFILE } from '@tile/entity/profile.mock';
import { SHARP_TURN_SWEEP, STRAIGHT_SWEEP, sweepOf } from '@tile/entity/sweep.mock';
import { TileValidation } from '@tile/geometry/tile-validation';

const codes = (issues: TileIssue[]): string[] => issues.map((i: TileIssue) => i.code);

describe('TileValidation', () => {
  let validation: TileValidation;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    validation = TestBed.inject(TileValidation);
  });

  describe('profile', () => {
    it('accepts the standard profile, and a road of five with one shoulder', () => {
      expect(validation.profile(STANDARD_PROFILE)).toEqual([]);
      const fiveWide: Profile = { ...STANDARD_PROFILE, position: 1, roadWidth: 5, leftShoulder: 0 };
      expect(validation.profile(fiveWide)).toEqual([]);
    });

    it.each<[string, Partial<Profile>, string[], string]>([
      [
        'a road too wide',
        { roadWidth: 5 },
        ['block-width', 'no-landscape-right'],
        'road plus shoulders make 7 units, at most 6',
      ],
      [
        'no landscape left',
        { position: 1 },
        ['no-landscape-left'],
        'no landscape on the left: the block starts at unit 0',
      ],
      [
        'no landscape right',
        { position: 4 },
        ['no-landscape-right'],
        'no landscape on the right: the block ends at unit 8',
      ],
      ['a road of zero', { roadWidth: 0 }, ['road-width'], 'road of 0 units, expected 1 to 5'],
      [
        'a fractional position',
        { position: 2.5 },
        ['position-not-whole'],
        'position 2.5 is not whole',
      ],
      [
        'a negative height',
        { height: -1 },
        ['height-out-of-range'],
        'height -1, expected a whole number from 0 to 1000',
      ],
      [
        'a height too high',
        { height: 1001 },
        ['height-out-of-range'],
        'height 1001, expected a whole number from 0 to 1000',
      ],
      [
        'a fractional height',
        { height: 2.5 },
        ['height-out-of-range'],
        'height 2.5, expected a whole number from 0 to 1000',
      ],
    ])('refuses %s', (_name, change, expected, message) => {
      const issues = validation.profile({ ...STANDARD_PROFILE, ...change });
      expect(codes(issues)).toEqual(expected);
      expect(issues[0]?.message).toBe(message);
      expect(issues.every((i: TileIssue) => i.subject === 'profile')).toBe(true);
    });
  });

  describe('obstacle', () => {
    const onTheRight: Profile = { ...STANDARD_PROFILE, position: 5 };
    const roadOnTheRight = sweepOf({ entry: onTheRight });

    it.each<[string, Obstacle, TileIssue]>([
      [
        'a hazard outside the tile',
        { ...MEDIUM_HAZARD, size: 'small', at: 1.2 },
        {
          code: 'obstacle-position',
          subject: 'hazard small at 1.2',
          message: 'position 1.2 outside 0 to 1',
        },
      ],
      [
        'a span outside the tile',
        { ...RAMP, from: -0.1, to: 0.5 },
        { code: 'obstacle-span', subject: 'ramp', message: 'span -0.1 to 0.5 outside 0 to 1' },
      ],
      [
        'an empty span',
        { ...RAMP, from: 0.6, to: 0.4 },
        { code: 'obstacle-empty-span', subject: 'ramp', message: 'span 0.6 to 0.4 is empty' },
      ],
      [
        'a hazard spilling out',
        { ...MEDIUM_HAZARD, size: 'large', at: 0.02, offset: 3 },
        {
          code: 'obstacle-spills',
          subject: 'hazard large at 0.02',
          message: 'spills out of the tile',
        },
      ],
      [
        'a barrier spilling out',
        RIGHT_BARRIER,
        { code: 'obstacle-spills', subject: 'right barrier', message: 'spills out of the tile' },
      ],
    ])('refuses %s', (_name, obstacle, expected) => {
      const sweep = obstacle.kind === 'barrier' ? roadOnTheRight : STRAIGHT_SWEEP;
      expect(validation.obstacle(sweep, obstacle)).toEqual([expected]);
    });

    it('accepts what fits: a large hazard mid-tile, a left barrier round a sharp turn, a patch, a bump', () => {
      const large: Obstacle = { ...MEDIUM_HAZARD, size: 'large', offset: 3 };
      expect(validation.obstacle(STRAIGHT_SWEEP, large)).toEqual([]);
      expect(validation.obstacle(SHARP_TURN_SWEEP, LEFT_BARRIER)).toEqual([]);
      expect(validation.obstacle(STRAIGHT_SWEEP, PATCH)).toEqual([]);
      expect(validation.obstacle(STRAIGHT_SWEEP, BUMP)).toEqual([]);
    });

    it('describes an obstacle in words, the subject of its issues', () => {
      expect(validation.describe(MEDIUM_HAZARD)).toBe('hazard medium at 0.5');
      expect(validation.describe(LEFT_BARRIER)).toBe('left barrier');
      expect(validation.describe(RAMP)).toBe('ramp');
      expect(validation.describe(PATCH)).toBe('patch');
    });
  });

  it('gathers a tile’s issues, both profiles named, then its obstacles', () => {
    const noRoad: Profile = { ...STANDARD_PROFILE, roadWidth: 0 };
    const belowGround: Profile = { ...STANDARD_PROFILE, height: -1 };
    const sweep = sweepOf({ entry: noRoad, exitProfile: belowGround });
    const issues = validation.tile(sweep, [{ ...RAMP, from: 0.6, to: 0.4 }]);
    expect(issues.map((i: TileIssue) => [i.subject, i.code])).toEqual([
      ['entry profile', 'road-width'],
      ['exit profile', 'height-out-of-range'],
      ['ramp', 'obstacle-empty-span'],
    ]);
    expect(validation.tile(STRAIGHT_SWEEP)).toEqual([]);
  });
});
