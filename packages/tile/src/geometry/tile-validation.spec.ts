import { TestBed } from '@angular/core/testing';
import { Vec2 } from '@hexrace/commons';

import { type TileIssue } from '@tile/entity/issue';
import { type Obstacle } from '@tile/entity/obstacle';
import { type Profile } from '@tile/entity/profile';
import { type TileSweep } from '@tile/entity/sweep';
import { TileValidation } from '@tile/geometry/tile-validation';

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
const straight: TileSweep = {
  center: Vec2.ZERO,
  heading: 0,
  exit: 12,
  entry: sketch,
  exitProfile: sketch,
};
const sharp: TileSweep = { ...straight, exit: 4 };

const codes = (issues: TileIssue[]): string[] => issues.map((i) => i.code);

describe('TileValidation', () => {
  let validation: TileValidation;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    validation = TestBed.inject(TileValidation);
  });

  describe('profile', () => {
    it('accepts the sketch, and a road of five with one shoulder', () => {
      expect(validation.profile(sketch)).toEqual([]);
      expect(validation.profile({ ...sketch, position: 1, roadWidth: 5, leftShoulder: 0 })).toEqual(
        [],
      );
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
      const issues = validation.profile({ ...sketch, ...change });
      expect(codes(issues)).toEqual(expected);
      expect(issues[0]?.message).toBe(message);
      expect(issues.every((i) => i.subject === 'profile')).toBe(true);
    });
  });

  describe('obstacle', () => {
    it.each<[string, Obstacle, TileIssue]>([
      [
        'a hazard outside the tile',
        { kind: 'hazard', size: 'small', at: 1.2, offset: 0 },
        {
          code: 'obstacle-position',
          subject: 'hazard small at 1.2',
          message: 'position 1.2 outside 0 to 1',
        },
      ],
      [
        'a span outside the tile',
        { kind: 'ramp', from: -0.1, to: 0.5 },
        { code: 'obstacle-span', subject: 'ramp', message: 'span -0.1 to 0.5 outside 0 to 1' },
      ],
      [
        'an empty span',
        { kind: 'ramp', from: 0.6, to: 0.4 },
        { code: 'obstacle-empty-span', subject: 'ramp', message: 'span 0.6 to 0.4 is empty' },
      ],
      [
        'a hazard spilling out',
        { kind: 'hazard', size: 'large', at: 0.02, offset: 3 },
        {
          code: 'obstacle-spills',
          subject: 'hazard large at 0.02',
          message: 'spills out of the tile',
        },
      ],
      [
        'a barrier spilling out',
        { kind: 'barrier', side: 'right', from: 0, to: 1 },
        { code: 'obstacle-spills', subject: 'right barrier', message: 'spills out of the tile' },
      ],
    ])('refuses %s', (_name, obstacle, expected) => {
      const sweep =
        obstacle.kind === 'barrier'
          ? {
              ...straight,
              entry: { ...sketch, position: 5 },
              exitProfile: { ...sketch, position: 5 },
            }
          : straight;
      expect(validation.obstacle(sweep, obstacle)).toEqual([expected]);
    });

    it('accepts what fits: a large hazard mid-tile, a left barrier round a sharp turn, a patch', () => {
      expect(
        validation.obstacle(straight, { kind: 'hazard', size: 'large', at: 0.5, offset: 3 }),
      ).toEqual([]);
      expect(validation.obstacle(sharp, { kind: 'barrier', side: 'left', from: 0, to: 1 })).toEqual(
        [],
      );
      expect(
        validation.obstacle(straight, {
          kind: 'patch',
          from: 0.2,
          to: 0.4,
          offset: 0,
          width: 1,
          road: 2,
        }),
      ).toEqual([]);
      expect(validation.obstacle(straight, { kind: 'bump', from: 0.2, to: 0.4 })).toEqual([]);
    });
  });

  it('gathers a tile’s issues, both profiles named, then its obstacles', () => {
    const sweep: TileSweep = {
      ...straight,
      entry: { ...sketch, roadWidth: 0 },
      exitProfile: { ...sketch, height: -1 },
    };
    const issues = validation.tile(sweep, [{ kind: 'ramp', from: 0.6, to: 0.4 }]);
    expect(issues.map((i) => [i.subject, i.code])).toEqual([
      ['entry profile', 'road-width'],
      ['exit profile', 'height-out-of-range'],
      ['ramp', 'obstacle-empty-span'],
    ]);
    expect(validation.tile(straight)).toEqual([]);
  });
});
