import { TestBed } from '@angular/core/testing';

import { ObstacleText } from '@track/format/obstacle-text';

describe('ObstacleText', () => {
  let text: ObstacleText;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    text = TestBed.inject(ObstacleText);
  });

  it.each([
    'hazard:large@0.6/-2.5',
    'hazard:small@0.5',
    'barrier:left',
    'barrier:right@0.3-1',
    'ramp@0.4-0.55',
    'bump@0.45-0.55',
    'patch:3@0.3-0.7/-0.5x1.5',
    'patch:3@0.3-0.7/-0.5',
    'patch:2@0.1-0.2',
  ])('writes and reads %s back unchanged', (sample: string) => {
    const obstacle = text.parse(sample);
    expect(obstacle).not.toBeNull();
    if (obstacle) expect(text.serialize(obstacle)).toBe(sample);
  });

  it('reads the fields of each kind', () => {
    expect(text.parse('hazard:medium@0.5/-1.5')).toEqual({
      kind: 'hazard',
      size: 'medium',
      at: 0.5,
      offset: -1.5,
    });
    expect(text.parse('barrier:left')).toEqual({
      kind: 'barrier',
      side: 'left',
      from: 0,
      to: 1,
    });
    expect(text.parse('bump@0.45-0.55')).toEqual({ kind: 'bump', from: 0.45, to: 0.55 });
    expect(text.parse('patch:2@0.1-0.2')).toEqual({
      kind: 'patch',
      road: 2,
      from: 0.1,
      to: 0.2,
      offset: 0,
      width: 1,
    });
  });

  it.each(['hazard:huge@0.5', 'barrier@0.2', 'ramp@2-3', 'patch:4@0-1', 'nonsense'])(
    'refuses %s',
    (sample: string) => {
      expect(text.parse(sample)).toBeNull();
    },
  );

  it('writes a patch whose width alone differs from the default', () => {
    expect(text.serialize({ kind: 'patch', road: 1, from: 0, to: 1, offset: 0, width: 2 })).toBe(
      'patch:1@0-1/0x2',
    );
  });
});
