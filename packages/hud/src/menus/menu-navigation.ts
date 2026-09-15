import { Injectable, inject } from '@angular/core';

import { Inputs } from '@hexrace/inputs';

import { FrameLoop } from '@hud/debug/frame-loop';

const DEAD_ZONE = 0.5;
const FIRST_REPEAT_SECONDS = 0.4;
const NEXT_REPEAT_SECONDS = 0.12;
const LONGEST_FRAME_SECONDS = 0.1;

/** What the player asked of a menu in one frame: a step of -1, 0 or 1 on each axis, and the buttons. */
export interface MenuGesture {
  readonly x: number;
  readonly y: number;
  readonly confirm: boolean;
  readonly back: boolean;
}

interface Edge {
  direction: number;
  wait: number;
  armed: boolean;
}

/**
 * Turns the continuous actions of `Inputs` into the gestures a menu answers to (technical spec
 * 5.5): a dead zone, one step when a value crosses it, then a wait and a repeat while it is held,
 * so a stick kept over rolls a list at a readable pace. An action already off its rest when the
 * watch starts gives nothing until it comes back, which is what keeps the press that opened a
 * screen from being read again by the screen it opened. Give each menu its own instance.
 */
@Injectable({ providedIn: 'root' })
export class MenuNavigation {
  private readonly inputs = inject(Inputs);
  private readonly loop = inject(FrameLoop);
  private readonly horizontal: Edge = { direction: 0, wait: 0, armed: false };
  private readonly vertical: Edge = { direction: 0, wait: 0, armed: false };
  private readonly confirm: Edge = { direction: 0, wait: 0, armed: false };
  private readonly back: Edge = { direction: 0, wait: 0, armed: false };
  private previous = -1;

  /** Calls back once a frame with that frame's gestures, until the caller is destroyed. */
  watch(onGesture: (gesture: MenuGesture) => void): void {
    this.loop.start((now: number) => {
      onGesture(this.tick(now));
    });
  }

  private tick(now: number): MenuGesture {
    const elapsed = this.previous < 0 ? 0 : (now - this.previous) / 1000;
    const dt = Math.min(elapsed, LONGEST_FRAME_SECONDS);
    this.previous = now;
    this.inputs.poll(dt);
    const actions = this.inputs.actions;
    return {
      x: this.step(this.horizontal, actions.navigateX, dt, true),
      y: this.step(this.vertical, actions.navigateY, dt, true),
      confirm: this.step(this.confirm, actions.confirm, dt, false) !== 0,
      back: this.step(this.back, actions.back, dt, false) !== 0,
    };
  }

  private step(edge: Edge, value: number, dt: number, repeats: boolean): number {
    const direction = Math.abs(value) < DEAD_ZONE ? 0 : Math.sign(value);
    if (direction === 0) {
      edge.direction = 0;
      edge.armed = true;
      return 0;
    }
    if (!edge.armed) return 0;
    if (direction !== edge.direction) {
      edge.direction = direction;
      edge.wait = FIRST_REPEAT_SECONDS;
      return direction;
    }
    if (!repeats) return 0;
    edge.wait -= dt;
    if (edge.wait > 0) return 0;
    edge.wait = NEXT_REPEAT_SECONDS;
    return direction;
  }
}
