import { Injectable, signal } from '@angular/core';

const FPS_SMOOTHING = 0.1;

/**
 * Frames per second and the time a physics step takes. `frame(now)` is called once per animation
 * frame by whoever runs the loop (the panel while it is open, the engine later); `step(ms)` by the
 * engine after each physics step. Both are exponential averages so they read steadily.
 */
@Injectable({ providedIn: 'root' })
export class PerfMeter {
  fps = 0;
  frameMs = 0;
  stepMs = 0;
  /** The small corner overlay for measuring on a phone (functional spec 9.2). */
  readonly cornerVisible = signal(false);

  private last = 0;

  frame(now: number): void {
    if (this.last > 0) {
      const dt = now - this.last;
      if (dt > 0) {
        this.frameMs += (dt - this.frameMs) * FPS_SMOOTHING;
        this.fps += (1000 / dt - this.fps) * FPS_SMOOTHING;
      }
    }
    this.last = now;
  }

  step(ms: number): void {
    this.stepMs += (ms - this.stepMs) * FPS_SMOOTHING;
  }
}
