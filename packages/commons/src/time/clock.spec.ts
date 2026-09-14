import { TestBed } from '@angular/core/testing';

import { Clock } from '@commons/time/clock';

describe('Clock', () => {
  it('reads the wall clock in milliseconds, never going backwards', () => {
    TestBed.configureTestingModule({});
    const clock = TestBed.inject(Clock);
    const before = Date.now();
    const now = clock.now();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(clock.now()).toBeGreaterThanOrEqual(now);
  });
});
