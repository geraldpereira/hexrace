import { TestBed } from '@angular/core/testing';

import { LapCounter } from '@game-commons/race/lap-counter';

describe('LapCounter', () => {
  let laps: LapCounter;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    laps = TestBed.inject(LapCounter);
  });

  it('counts a crossing of the line on a loop, and takes one back when driven over backwards', () => {
    expect(laps.crossing(11.9, 0.6, 0.5, 12, true)).toBe(1);
    expect(laps.crossing(0.6, 11.9, 0.5, 12, true)).toBe(-1);
    expect(laps.crossing(3, 4, 0.5, 12, true)).toBe(0);
    expect(laps.crossing(0.4, 0.5, 0.5, 12, true)).toBe(1);
  });

  it('counts nothing when an out and back stops short of the line', () => {
    expect(laps.crossing(0.4, 0.49, 0.5, 12, true)).toBe(0);
    expect(laps.crossing(0.49, 0.4, 0.5, 12, true)).toBe(0);
  });

  it('counts the finish of an open track once, forwards only', () => {
    expect(laps.crossing(3.4, 3.6, 3.5, 4, false)).toBe(1);
    expect(laps.crossing(3.6, 3.4, 3.5, 4, false)).toBe(-1);
    expect(laps.crossing(1, 2, 3.5, 4, false)).toBe(0);
    expect(laps.crossing(3.6, 3.8, 3.5, 4, false)).toBe(0);
  });

  it('takes the short way round for the step, and says nothing about a track with no tile', () => {
    expect(laps.step(11.9, 0.1, 12)).toBeCloseTo(0.2, 9);
    expect(laps.step(0.1, 11.9, 12)).toBeCloseTo(-0.2, 9);
    expect(laps.step(1, 3, 12)).toBeCloseTo(2, 9);
    expect(laps.crossing(0, 1, 0.5, 0, true)).toBe(0);
  });
});
