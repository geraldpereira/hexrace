import { TestBed } from '@angular/core/testing';

import { TileText } from '@track/format/tile-text';

describe('TileText', () => {
  let text: TileText;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    text = TestBed.inject(TileText);
  });

  it('reads a full line, start word and obstacles included', () => {
    const read = text.parse(
      'start  exit=2  pos=3  w=2  sh=1,0  h=48  t=2/3/1  obs=bump@0.4-0.6,barrier:left',
      7,
      true,
    );
    expect(read.errors).toEqual([]);
    expect(read.tile).toEqual({
      exit: 2,
      profile: {
        position: 3,
        roadWidth: 2,
        leftShoulder: 1,
        rightShoulder: 0,
        height: 48,
        road: 2,
        shoulder: 3,
        landscape: 1,
      },
      obstacles: [
        { kind: 'bump', from: 0.4, to: 0.6 },
        { kind: 'barrier', side: 'left', from: 0, to: 1 },
      ],
    });
  });

  it('defaults the shoulders to none and drops an empty obstacle list', () => {
    const read = text.parse('exit=12  pos=2  w=3  h=5  t=1/1/1  obs=', 3, false);
    expect(read.errors).toEqual([]);
    expect(read.tile?.profile.leftShoulder).toBe(0);
    expect(read.tile?.obstacles).toBeUndefined();
  });

  it.each([
    ['exit=7 pos=2 w=3 h=5 t=1/1/1', 'exit "7" is invalid, expected 12, 2, 4, 8 or 10'],
    ['pos=2 w=3 h=5 t=1/1/1', 'exit "" is invalid, expected 12, 2, 4, 8 or 10'],
    ['exit=12 w=3 h=5 t=1/1/1', 'pos "" is invalid, expected a whole number'],
    ['exit=12 pos=2 w=3 h=5', 't "" is invalid, expected road/shoulder/landscape as 1-3/1-3/1-2'],
    ['exit=12 pos=two w=3 h=5 t=1/1/1', 'pos "two" is invalid, expected a whole number'],
    ['exit=12 pos=2 w=3 sh=2,0 h=5 t=1/1/1', 'sh "2,0" is invalid, expected left,right as 0 or 1'],
    [
      'exit=12 pos=2 w=3 h=5 t=4/1/1',
      't "4/1/1" is invalid, expected road/shoulder/landscape as 1-3/1-3/1-2',
    ],
    ['exit=12 pos=2 w=3 h=5 t=1/1/1 foo=1', 'unknown key "foo"'],
    ['exit=12 pos=2 w=3 h=5 t=1/1/1 lonely', 'expected "key=value", read "lonely"'],
    ['exit=12 pos=2 w=3 h=5 t=1/1/1 obs=nope', 'obstacle "nope" is invalid'],
  ])('refuses %s', (line: string, message: string) => {
    const read = text.parse(line, 4, true);
    expect(read.tile).toBeNull();
    expect(read.errors).toContainEqual({ line: 4, message });
  });

  it('allows the start word on the first tile only', () => {
    expect(text.parse('start exit=12 pos=2 w=3 h=5 t=1/1/1', 2, true).errors).toEqual([]);
    expect(text.parse('start exit=12 pos=2 w=3 h=5 t=1/1/1', 9, false).errors).toEqual([
      { line: 9, message: '"start" is only allowed on the first tile' },
    ]);
  });

  it('writes lined-up columns, the start word on the first tile only', () => {
    const tile = {
      exit: 2 as const,
      profile: {
        position: 2,
        roadWidth: 3,
        leftShoulder: 1 as const,
        rightShoulder: 1 as const,
        height: 5,
        road: 1 as const,
        shoulder: 1 as const,
        landscape: 1 as const,
      },
      obstacles: [{ kind: 'ramp' as const, from: 0.4, to: 0.55 }],
    };
    expect(text.serialize(tile, true)).toBe(
      'start  exit=2   pos=2  w=3  sh=1,1  h=5   t=1/1/1  obs=ramp@0.4-0.55',
    );
    expect(text.serialize({ exit: 12, profile: tile.profile }, false)).toBe(
      '       exit=12  pos=2  w=3  sh=1,1  h=5   t=1/1/1',
    );
  });
});
