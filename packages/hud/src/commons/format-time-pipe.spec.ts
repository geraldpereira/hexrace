import { TestBed } from '@angular/core/testing';

import { FormatTimePipe } from '@hud/commons/format-time-pipe';

describe('FormatTimePipe', () => {
  let pipe: FormatTimePipe;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    pipe = TestBed.inject(FormatTimePipe);
  });

  it('writes minutes only when there are some, seconds padded to two then', () => {
    expect(pipe.transform(0)).toBe('0.000');
    expect(pipe.transform(9_500)).toBe('9.500');
    expect(pipe.transform(71_234)).toBe('1:11.234');
    expect(pipe.transform(605_007)).toBe('10:05.007');
  });

  it('keeps a delta signed and rounds to the millisecond', () => {
    expect(pipe.transform(-1_234, { signed: true })).toBe('-1.234');
    expect(pipe.transform(1_234, { signed: true })).toBe('+1.234');
    expect(pipe.transform(999.6)).toBe('1.000');
  });
});
