import { TestBed } from '@angular/core/testing';

import { PerfMeter } from '@hud/debug/perf-meter';

describe('PerfMeter', () => {
  let meter: PerfMeter;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    meter = TestBed.inject(PerfMeter);
  });

  it('settles on the frame rate of a steady loop', () => {
    for (let i = 0; i <= 200; i++) meter.frame(i * (1000 / 60));
    expect(meter.fps).toBeCloseTo(60, 0);
    expect(meter.frameMs).toBeCloseTo(16.67, 1);
  });

  it('ignores a repeated timestamp and averages the step time', () => {
    meter.frame(100);
    meter.frame(100);
    expect(meter.fps).toBe(0);
    for (let i = 0; i < 100; i++) meter.step(2);
    expect(meter.stepMs).toBeCloseTo(2, 3);
  });
});
