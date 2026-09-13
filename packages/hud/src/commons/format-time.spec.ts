import { formatTime } from '@hud/commons/format-time';

describe('formatTime', () => {
  it('writes seconds and millis under a minute, minutes above', () => {
    expect(formatTime(0)).toBe('0.000');
    expect(formatTime(9_500)).toBe('9.500');
    expect(formatTime(71_234)).toBe('1:11.234');
    expect(formatTime(605_007)).toBe('10:05.007');
  });

  it('keeps the sign of a delta, and rounds', () => {
    expect(formatTime(-1_234, { signed: true })).toBe('-1.234');
    expect(formatTime(1_234, { signed: true })).toBe('+1.234');
    expect(formatTime(999.6)).toBe('1.000');
  });
});
