import { Injectable, inject } from '@angular/core';
import { clamp } from 'lodash-es';

import { type InputActions, IDLE_ACTIONS } from '@inputs/entity/input-actions';
import { type InputSource, type InputSourceId } from '@inputs/entity/input-source';
import { INPUT_SOURCES } from '@inputs/merge/input-sources';

/**
 * The sources merged into the one snapshot the game reads at the start of each step. Analogue
 * values take the maximum; steering and navigation are summed and clamped, so a keyboard and a
 * gamepad held together do not fight. `activeSource` is the last source engaged: what the HUD
 * shows, and what decides whether the touch paddles are drawn.
 */
@Injectable({ providedIn: 'root' })
export class Inputs {
  readonly actions: InputActions = { ...IDLE_ACTIONS };
  activeSource: InputSourceId | null = null;

  private readonly sources: readonly InputSource[] =
    inject(INPUT_SOURCES, { optional: true }) ?? [];

  poll(dt: number): void {
    const a = this.actions;
    Object.assign(a, IDLE_ACTIONS);
    for (const source of this.sources) {
      source.poll(dt);
      const s = source.actions;
      if (this.isEngaged(s)) this.activeSource = source.id;
      a.throttle = Math.max(a.throttle, s.throttle);
      a.brake = Math.max(a.brake, s.brake);
      a.steer = clamp(a.steer + s.steer, -1, 1);
      a.handBrake = Math.max(a.handBrake, s.handBrake);
      a.reset = Math.max(a.reset, s.reset);
      a.gearUp = Math.max(a.gearUp, s.gearUp);
      a.gearDown = Math.max(a.gearDown, s.gearDown);
      a.navigateX = clamp(a.navigateX + s.navigateX, -1, 1);
      a.navigateY = clamp(a.navigateY + s.navigateY, -1, 1);
      a.confirm = Math.max(a.confirm, s.confirm);
      a.back = Math.max(a.back, s.back);
    }
  }

  /** Whether any action is off its rest value. */
  isEngaged(actions: InputActions): boolean {
    return Object.values(actions).some((v: number) => v !== 0);
  }
}
