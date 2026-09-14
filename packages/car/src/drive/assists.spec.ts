import { TestBed } from '@angular/core/testing';

import { Assists } from '@car/drive/assists';
import { type AssistState } from '@car/entity/car-options';
import { carOptions } from '@car/entity/car.mock';

describe('Assists', () => {
  let assists: Assists;
  let state: AssistState;

  beforeEach(() => {
    assists = TestBed.inject(Assists);
    state = { cut: 0 };
  });

  it('does nothing while the assist is not bought', () => {
    const abs = carOptions().abs;
    expect(assists.limit(state, abs, 1, 80, true, 1 / 60)).toBe(1);
    expect(state.cut).toBe(0);
  });

  it('cuts the input in proportion to the slip past the threshold', () => {
    const abs = carOptions().abs;
    abs.enabled = true;
    expect(assists.limit(state, abs, 0.3, 80, true, 1 / 60)).toBe(1);
    expect(assists.limit(state, abs, 0.55, 80, true, 1 / 60)).toBeCloseTo(0.75);
    expect(assists.limit(state, abs, 2, 80, true, 1 / 60)).toBeCloseTo(0.5);
  });

  it('stays out below its speed, and releases the cut over its release time', () => {
    const tc = carOptions().tractionControl;
    tc.enabled = true;
    assists.limit(state, tc, 1, 2, true, 1 / 60);
    expect(state.cut).toBe(0);
    assists.limit(state, tc, 1, 40, true, 1 / 60);
    expect(state.cut).toBe(1);
    assists.limit(state, tc, 0, 40, false, 0.05);
    expect(state.cut).toBeCloseTo(0.5);
    assists.limit(state, tc, 0, 40, false, 1);
    expect(state.cut).toBe(0);
  });

  it('drops the cut at once when the assist has no release time or no range', () => {
    const tc = carOptions().tractionControl;
    tc.enabled = true;
    tc.releaseTime = 0;
    assists.limit(state, tc, 1, 40, true, 1 / 60);
    assists.limit(state, tc, 0, 40, true, 1 / 60);
    expect(state.cut).toBe(0);
    tc.slipRange = 0;
    expect(assists.limit(state, tc, 5, 40, true, 1 / 60)).toBe(1);
  });
});
