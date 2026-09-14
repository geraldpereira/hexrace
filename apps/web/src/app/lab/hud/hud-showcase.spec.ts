import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DebugPanel } from '@hexrace/hud';

import { HudShowcase } from '@ui/lab/hud/hud-showcase';
import { type FrameCapture, captureFrames } from '@ui/testing/frames.mock';
import { panelButton } from '@ui/testing/panel.mock';
import { stubResizeObserver } from '@ui/testing/resize-observer.mock';

describe('HudShowcase', () => {
  let capture: FrameCapture;

  beforeEach(() => {
    capture = captureFrames();
    stubResizeObserver({ width: 320, height: 180 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function render(): Promise<{ host: HTMLElement; page: HudShowcase }> {
    await TestBed.configureTestingModule({
      imports: [HudShowcase],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(HudShowcase);
    await fixture.whenStable();
    return { host: fixture.nativeElement as HTMLElement, page: fixture.componentInstance };
  }

  it('shows every component and registers the HUD folder, shown', async () => {
    const { host } = await render();
    for (const tag of [
      'hr-rev-counter',
      'hr-gear-indicator',
      'hr-speed-indicator',
      'hr-damage-indicator',
      'hr-race-timer',
      'hr-reset-gauge',
      'hr-wrong-way',
      'hr-assist-lamps',
      'hr-canvas-frame',
      'hr-credits',
      'hr-track-card',
      'hr-car-card',
      'hr-stat-bars',
    ]) {
      expect(host.querySelector(tag), tag).not.toBeNull();
    }
    expect(TestBed.inject(DebugPanel).visible()).toBe(true);
    expect(document.querySelector('.lil-gui')?.textContent).toContain('Redline RPM');
  });

  it('follows the fake race every frame, timer running, and paints the fake canvas', async () => {
    const { page } = await render();
    [...capture.frames].forEach((cb) => cb(500));
    const fill = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillRect: fill,
    } as unknown as CanvasRenderingContext2D);
    page.race.absOwned = false;
    page.race.rpm = 3000;
    page.race.gear = 4;
    page.race.kmh = 120;
    page.race.tcOwned = true;
    [...capture.frames].forEach((cb) => cb(1000));
    [...capture.frames].forEach((cb) => cb(1500));
    expect(page.rpm()).toBe(3000);
    expect(page.gear()).toBe(4);
    expect(page.kmh()).toBe(120);
    expect(page.timer().currentMs).toBeGreaterThan(400);
    expect(page.assists()).toEqual({ abs: null, tractionControl: false });
    expect(fill).toHaveBeenCalled();
    expect(page.canvas.width).toBe(320);
    expect(page.canvas.height).toBe(180);
    page.race.running = false;
    const held = page.timer().currentMs;
    [...capture.frames].forEach((cb) => cb(2000));
    expect(page.timer().currentMs).toBe(held);
  });

  it('hits a part from the folder, and rebuilds the damage from the sliders', async () => {
    const { page } = await render();
    page.race.hitPart = 'engine';
    panelButton('Hit!').click();
    expect(page.damage().engine).toBe(75);
    expect(page.hit()).toBe('engine');
    panelButton('Hit!').click();
    expect(page.damage().engine).toBe(50);
    const rows = [...document.querySelectorAll('.lil-controller')];
    const gearbox = rows.find((r) => r.querySelector('.lil-name')?.textContent === 'gearbox')!;
    const input = gearbox.querySelector('input')!;
    input.value = '40';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(page.damage().gearbox).toBe(40);
  });

  it('runs the countdown from the folder', async () => {
    const { page } = await render();
    vi.useFakeTimers();
    panelButton('Start countdown').click();
    vi.advanceTimersByTime(0);
    expect(page.countdownStep()).toBe(3);
    vi.advanceTimersByTime(3000);
    expect(page.countdownStep()).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(page.countdownStep()).toBeNull();
  });

  it('opens the results dialog from the folder', async () => {
    await render();
    panelButton('Results dialog').click();
    await new Promise((r) => setTimeout(r, 0));
    const box = document.querySelector('hr-results-dialog')!;
    expect(box.querySelector('.time')).not.toBeNull();
    box.querySelectorAll('button')[0]!.click();
  });
});
