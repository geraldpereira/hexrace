import { TestBed } from '@angular/core/testing';

import { PerfCorner } from '@hud/debug/perf-corner';
import { PerfMeter } from '@hud/debug/perf-meter';

describe('PerfCorner', () => {
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    frames = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });

  it('shows nothing until asked, then the fps refreshed four times a second', async () => {
    await TestBed.configureTestingModule({ imports: [PerfCorner] }).compileComponents();
    const meter = TestBed.inject(PerfMeter);
    const fixture = TestBed.createComponent(PerfCorner);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.corner')).toBeNull();

    meter.cornerVisible.set(true);
    for (let i = 0; i < 60; i++) frames[i]?.(i * 16.7);
    for (let i = 0; i < 200; i++) meter.step(3);
    frames[60]?.(1002);
    await fixture.whenStable();
    expect(host.querySelector('.corner')?.textContent).toMatch(/^\d+ fps · step 3\.0 ms$/);
  });
});
