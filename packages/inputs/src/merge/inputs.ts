import { Injectable, inject } from '@angular/core';

import { InputActions } from '@inputs/entity/input-actions';
import { INPUT_SOURCES, type InputSourceId } from '@inputs/entity/input-source';

/**
 * The sources merged into the one snapshot the game reads at the start of each step. Analogue
 * values take the maximum; steering and navigation are summed and clamped, so a keyboard and a
 * gamepad held together do not fight. `activeSource` is the last source engaged: what the HUD
 * shows, and what decides whether the touch paddles are drawn.
 */
@Injectable({ providedIn: 'root' })
export class Inputs {
  readonly actions = new InputActions();
  activeSource: InputSourceId | null = null;

  private readonly sources = inject(INPUT_SOURCES, { optional: true }) ?? [];

  poll(dt: number): void {
    const a = this.actions;
    a.clear();
    for (const source of this.sources) {
      source.poll(dt);
      const s = source.actions;
      if (s.isEngaged()) this.activeSource = source.id;
      a.throttle = Math.max(a.throttle, s.throttle);
      a.brake = Math.max(a.brake, s.brake);
      a.steer = clamp(a.steer + s.steer);
      a.handBrake = Math.max(a.handBrake, s.handBrake);
      a.reset = Math.max(a.reset, s.reset);
      a.navigateX = clamp(a.navigateX + s.navigateX);
      a.navigateY = clamp(a.navigateY + s.navigateY);
      a.confirm = Math.max(a.confirm, s.confirm);
      a.back = Math.max(a.back, s.back);
    }
  }
}

function clamp(v: number): number {
  return Math.max(-1, Math.min(1, v));
}
