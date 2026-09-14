import { TestBed } from '@angular/core/testing';

import { EngineModel } from '@car/drive/engine-model';

describe('EngineModel', () => {
  let engine: EngineModel;

  beforeEach(() => {
    engine = TestBed.inject(EngineModel);
  });

  it('reads the revs as a share of the ceiling, clamped', () => {
    expect(engine.revShare(2250, 4500)).toBe(0.5);
    expect(engine.revShare(9000, 4500)).toBe(1);
    expect(engine.revShare(-10, 0)).toBe(0);
  });

  it('chops the ignition against the ceiling and through a flat upshift', () => {
    expect(engine.onLimiter(0.99, 0.8, false)).toBe(true);
    expect(engine.onLimiter(0.99, 0.2, false)).toBe(false);
    expect(engine.onLimiter(0.4, 0.9, true)).toBe(true);
    expect(engine.onLimiter(0.4, 0.5, true)).toBe(false);
  });

  it('asks for the next gear only when there is one', () => {
    expect(engine.shiftHint(4000, 3900, 2, 5)).toBe(true);
    expect(engine.shiftHint(3000, 3900, 2, 5)).toBe(false);
    expect(engine.shiftHint(4000, 3900, 5, 5)).toBe(false);
    expect(engine.shiftHint(4000, 3900, -1, 5)).toBe(false);
  });
});
