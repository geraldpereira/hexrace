import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

import { type InputActions, IDLE_ACTIONS } from '@inputs/entity/input-actions';
import { type InputSource, type InputSourceId } from '@inputs/entity/input-source';

const SMOOTHING_TIME = 0.1;

/**
 * The keyboard, mapped as the functional spec 3.3 says: WASD or arrows to throttle, brake and
 * steer, Space hand brake, R reset, E / Q shift up / down, Enter confirm, Escape back. A key is 0
 * or 1; the three driving actions ramp over `smoothingTime` seconds to give the digital keyboard a
 * little of the analogue it lacks (technical spec 5.3). A window losing focus releases every key,
 * since their release would otherwise never be seen.
 */
@Injectable({ providedIn: 'root' })
export class KeyboardSource implements InputSource {
  readonly id: InputSourceId = 'keyboard';
  readonly actions: InputActions = { ...IDLE_ACTIONS };
  smoothingTime = SMOOTHING_TIME;

  private readonly held = new Set<string>();
  private readonly target: InputActions = { ...IDLE_ACTIONS };
  private touched = false;

  constructor() {
    const window = inject(DOCUMENT).defaultView;
    window?.addEventListener('keydown', this.onKeyDown);
    window?.addEventListener('keyup', this.onKeyUp);
    window?.addEventListener('blur', this.onBlur);
  }

  get connected(): boolean {
    return this.touched;
  }

  poll(dt: number): void {
    const alpha = this.smoothingTime > 0 ? 1 - Math.exp(-dt / this.smoothingTime) : 1;
    const a = this.actions;
    const t = this.target;
    a.throttle += (t.throttle - a.throttle) * alpha;
    a.brake += (t.brake - a.brake) * alpha;
    a.steer += (t.steer - a.steer) * alpha;
    a.handBrake = t.handBrake;
    a.reset = t.reset;
    a.gearUp = t.gearUp;
    a.gearDown = t.gearDown;
    a.navigateX = t.navigateX;
    a.navigateY = t.navigateY;
    a.confirm = t.confirm;
    a.back = t.back;
  }

  private recompute(): void {
    const on = (...codes: string[]): number => (codes.some((c) => this.held.has(c)) ? 1 : 0);
    const t = this.target;
    t.throttle = on('KeyW', 'ArrowUp');
    t.brake = on('KeyS', 'ArrowDown');
    t.steer = on('KeyD', 'ArrowRight') - on('KeyA', 'ArrowLeft');
    t.handBrake = on('Space');
    t.reset = on('KeyR');
    t.gearUp = on('KeyE');
    t.gearDown = on('KeyQ');
    t.navigateX = t.steer;
    t.navigateY = t.brake - t.throttle;
    t.confirm = on('Enter');
    t.back = on('Escape');
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (!KeyboardSource.HANDLED.has(e.code)) return;
    e.preventDefault();
    this.touched = true;
    if (!this.held.has(e.code)) {
      this.held.add(e.code);
      this.recompute();
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    if (this.held.delete(e.code)) this.recompute();
  };

  private readonly onBlur = (): void => {
    this.held.clear();
    this.recompute();
    Object.assign(this.actions, IDLE_ACTIONS);
  };

  private static readonly HANDLED = new Set([
    'KeyW',
    'KeyA',
    'KeyS',
    'KeyD',
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'Space',
    'KeyR',
    'KeyE',
    'KeyQ',
    'Enter',
    'Escape',
  ]);
}
