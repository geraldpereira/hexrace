import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/** What a loop drives: the fixed step, the render, and a word when it has to drop time. */
export interface LoopHandlers {
  /** Once per fixed step: inputs, physics, deterministic logic. */
  fixedUpdate(): void;
  /** Once per frame, with the seconds since the previous frame. */
  render(dt: number): void;
  /** When the step cap is hit and the accumulator is dropped. */
  onPanic?(): void;
}

export const FIXED_TIMESTEP = 1 / 60;
const MAX_FRAME_DT = 0.1;
const MAX_STEPS_PER_FRAME = 5;

/**
 * The fixed-timestep loop with an accumulator (technical spec 2.4), from rally-game: physics runs
 * at 60 Hz whatever the display does, the render once per animation frame. A frame longer than
 * `maxFrameDt` counts as that much (a tab coming back does not replay its absence, spec 2.4), and
 * more than `maxSteps` steps in one frame drops the backlog rather than spiral. `stepMs` and
 * `frameMs` are the last timings, for the performance meter; `alpha` the render's place between two steps.
 */
@Injectable({ providedIn: 'root' })
export class GameLoop {
  fixedTimestep = FIXED_TIMESTEP;
  maxFrameDt = MAX_FRAME_DT;
  maxSteps = MAX_STEPS_PER_FRAME;
  /** Duration of the last frame's fixed steps together, in ms. */
  stepMs = 0;
  /** Duration of the last frame, render included, in ms. */
  frameMs = 0;
  /** How far the render is between the last step and the next, 0..1, for interpolation. */
  alpha = 0;
  running = false;

  private readonly window = inject(DOCUMENT).defaultView as Window;
  private handlers: LoopHandlers | null = null;
  private accumulator = 0;
  private last = 0;
  private frame = 0;

  start(handlers: LoopHandlers): void {
    if (this.running) return;
    this.handlers = handlers;
    this.running = true;
    this.accumulator = 0;
    this.last = this.window.performance.now();
    this.frame = this.window.requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    this.window.cancelAnimationFrame(this.frame);
  }

  private readonly tick = (now: number): void => {
    const handlers = this.handlers;
    if (!this.running || !handlers) return;
    const dt = Math.min((now - this.last) / 1000, this.maxFrameDt);
    this.last = now;
    this.accumulator += dt;

    const before = this.window.performance.now();
    let steps = 0;
    while (this.accumulator >= this.fixedTimestep && steps < this.maxSteps) {
      handlers.fixedUpdate();
      this.accumulator -= this.fixedTimestep;
      steps += 1;
    }
    if (steps === this.maxSteps) {
      this.accumulator = 0;
      handlers.onPanic?.();
    }
    this.alpha = this.accumulator / this.fixedTimestep;
    this.stepMs = this.window.performance.now() - before;

    handlers.render(dt);
    this.frameMs = this.window.performance.now() - before;
    this.frame = this.window.requestAnimationFrame(this.tick);
  };
}
