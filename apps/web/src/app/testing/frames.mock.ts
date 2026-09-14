export interface FrameCapture {
  readonly frames: FrameRequestCallback[];
  clock: number;
  tick(count: number, stepMs?: number): void;
}

export interface FrameCaptureOptions {
  readonly clock?: boolean;
}

export function captureFrames(options: FrameCaptureOptions = {}): FrameCapture {
  const capture: FrameCapture = {
    frames: [],
    clock: performance.now(),
    tick(count: number, stepMs = 20): void {
      for (let i = 0; i < count; i++) {
        capture.clock += stepMs;
        const now = options.clock ? capture.clock : performance.now() + stepMs;
        const pending = capture.frames.splice(0);
        for (const cb of pending) cb(now);
      }
    },
  };
  if (options.clock) vi.spyOn(performance, 'now').mockImplementation(() => capture.clock);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
    capture.frames.push(cb);
    return capture.frames.length;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  return capture;
}
