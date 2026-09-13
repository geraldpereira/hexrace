import { TestBed } from '@angular/core/testing';

import { FIXED_TIMESTEP, GameLoop, type LoopHandlers } from '@engine/loop/game-loop';

describe('GameLoop', () => {
  let frames: FrameRequestCallback[];
  let now: number;
  let loop: GameLoop;
  let calls: string[];
  let handlers: LoopHandlers;

  beforeEach(() => {
    frames = [];
    now = 1000;
    calls = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    vi.spyOn(window.performance, 'now').mockImplementation(() => now);
    TestBed.configureTestingModule({});
    loop = TestBed.inject(GameLoop);
    handlers = {
      fixedUpdate: () => calls.push('step'),
      render: (dt) => calls.push(`render ${dt.toFixed(3)}`),
      onPanic: () => calls.push('panic'),
    };
  });

  function frame(elapsedMs: number): void {
    now += elapsedMs;
    const cb = frames.shift();
    cb?.(now);
  }

  it('runs one fixed step per 1/60 s elapsed and one render per frame', () => {
    loop.start(handlers);
    expect(loop.running).toBe(true);
    frame(17);
    expect(calls).toEqual(['step', 'render 0.017']);
    frame(34);
    expect(calls.filter((c) => c === 'step')).toHaveLength(3);
    expect(loop.alpha).toBeGreaterThanOrEqual(0);
    expect(loop.alpha).toBeLessThan(1);
  });

  it('renders without stepping when less than a step has elapsed', () => {
    loop.start(handlers);
    frame(5);
    expect(calls).toEqual(['render 0.005']);
    expect(loop.alpha).toBeCloseTo(0.005 / FIXED_TIMESTEP);
  });

  it('caps a long frame and drops the backlog after the step cap', () => {
    loop.start(handlers);
    frame(40);
    expect(calls.filter((c) => c === 'step')).toHaveLength(2);
    expect(calls).not.toContain('panic');
    frame(5000);
    expect(calls.filter((c) => c === 'step')).toHaveLength(2 + loop.maxSteps);
    expect(calls.at(-2)).toBe('panic');
    expect(loop.alpha).toBe(0);
  });

  it('survives a panic without a panic handler', () => {
    loop.start({ fixedUpdate: handlers.fixedUpdate, render: handlers.render });
    frame(5000);
    expect(calls.filter((c) => c === 'step')).toHaveLength(loop.maxSteps);
  });

  it('measures the steps and the whole frame', () => {
    let ticking = 0;
    vi.spyOn(window.performance, 'now').mockImplementation(() => now + ticking++);
    loop.start(handlers);
    frame(17);
    expect(loop.stepMs).toBeGreaterThan(0);
    expect(loop.frameMs).toBeGreaterThan(loop.stepMs);
  });

  it('ignores a second start and stops cleanly', () => {
    loop.start(handlers);
    loop.start({ fixedUpdate: () => calls.push('other'), render: () => undefined });
    expect(frames).toHaveLength(1);
    loop.stop();
    expect(loop.running).toBe(false);
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
    frame(17);
    expect(calls).toEqual([]);
  });

  it('does nothing on a tick before any start', () => {
    loop.start(handlers);
    loop.stop();
    loop.running = true;
    (loop as unknown as { handlers: null }).handlers = null;
    frame(100);
    expect(calls).toEqual([]);
  });
});
