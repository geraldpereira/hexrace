import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DebugPanel } from '@hexrace/hud';

import { DebugShowcase, DemoSubject } from '@ui/lab/debug/debug-showcase';
import { type FrameCapture, captureFrames } from '@ui/testing/frames.mock';

describe('DemoSubject', () => {
  it('reads the curve piecewise, clamped at both ends', () => {
    const s = new DemoSubject();
    expect(s.curveAt(-1)).toBe(0.2);
    expect(s.curveAt(0.25)).toBeCloseTo(0.6, 5);
    expect(s.curveAt(0.5)).toBe(1);
    expect(s.curveAt(2)).toBe(0.2);
    s.curve = [];
    expect(s.curveAt(0.5)).toBe(0);
  });

  it('samples a sine, a square or noise, and nothing when disabled', () => {
    const s = new DemoSubject();
    s.speed = 60;
    expect(s.sample(0.25)).toBeCloseTo(s.curveAt(0.25), 5);
    s.mode = 'square';
    expect(s.sample(0.25)).toBeCloseTo(s.curveAt(0.25), 5);
    s.mode = 'noise';
    expect(Math.abs(s.sample(0.25))).toBeLessThanOrEqual(1);
    s.enabled = false;
    expect(s.sample(0.25)).toBe(0);
  });
});

describe('DebugShowcase', () => {
  let capture: FrameCapture;

  beforeEach(() => {
    capture = captureFrames();
    localStorage.clear();
  });

  it('registers a Demo folder with every kind of control, shows the panel and follows the wave', async () => {
    await TestBed.configureTestingModule({
      imports: [DebugShowcase],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(DebugShowcase);
    await fixture.whenStable();
    expect(TestBed.inject(DebugPanel).visible()).toBe(true);
    const panel = document.querySelector<HTMLElement>('.lil-gui')!;
    for (const label of [
      'Speed (rpm)',
      'Enabled',
      'Colour',
      'Mode',
      'Label',
      'Wave',
      'phase → amplitude',
      'wave',
    ]) {
      expect(panel.textContent).toContain(label);
    }
    capture.frames.forEach((cb) => cb(250));
    expect(fixture.componentInstance.wave()).not.toBe('0.00');
    const curve = panel.querySelectorAll<HTMLCanvasElement>('canvas')[1]!;
    curve.getBoundingClientRect = () => ({ left: 0, top: 0 }) as DOMRect;
    curve.dispatchEvent(new MouseEvent('dblclick', { clientX: 60, clientY: 60, bubbles: true }));
    expect(fixture.componentInstance.subject.curve.length).toBe(4);
    fixture.destroy();
    expect(panel.textContent).not.toContain('Speed (rpm)');
  });
});
