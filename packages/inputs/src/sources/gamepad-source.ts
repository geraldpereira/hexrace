import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { clamp } from 'lodash-es';

import { InputActions } from '@inputs/entity/input-actions';
import { type InputSource, type InputSourceId } from '@inputs/entity/input-source';

const BUTTON_A = 0;
const BUTTON_B = 1;
const BUTTON_Y = 3;
const BUTTON_LB = 4;
const BUTTON_RB = 5;
const BUTTON_LT = 6;
const BUTTON_RT = 7;
const DPAD_UP = 12;
const DPAD_DOWN = 13;
const DPAD_LEFT = 14;
const DPAD_RIGHT = 15;
const AXIS_LX = 0;
const AXIS_RX = 2;
const AXIS_RY = 3;

const STICK_DEADZONE = 0.15;
const TRIGGER_DEADZONE = 0.05;

/**
 * The gamepad in the Gamepad API's standard (Xbox) layout, mapped as the functional spec 3.3 says:
 * right trigger throttles, left trigger brakes, right stick steers (the left one is accepted too,
 * summed and clamped), A is the hand brake, RB and LB shift up and down, Y resets; in menus A
 * confirms, B goes back, right stick or D-pad navigates. The first gamepad plugged in is the one
 * heard; if it leaves, the next takes over.
 */
@Injectable({ providedIn: 'root' })
export class GamepadSource implements InputSource {
  readonly id: InputSourceId = 'gamepad';
  readonly actions = new InputActions();
  stickDeadzone = STICK_DEADZONE;
  triggerDeadzone = TRIGGER_DEADZONE;

  private readonly navigator: Navigator | undefined;
  private activeIndex: number | null = null;

  constructor() {
    const window = inject(DOCUMENT).defaultView;
    this.navigator = window?.navigator;
    window?.addEventListener('gamepadconnected', this.onConnected);
    window?.addEventListener('gamepaddisconnected', this.onDisconnected);
    this.activeIndex = this.firstConnected();
  }

  get connected(): boolean {
    return this.activeIndex !== null;
  }

  poll(): void {
    const pad = this.activeIndex === null ? null : this.pads()[this.activeIndex];
    if (!pad) {
      this.actions.clear();
      return;
    }
    const a = this.actions;
    a.throttle = this.trigger(pad, BUTTON_RT);
    a.brake = this.trigger(pad, BUTTON_LT);
    const rx = this.axis(pad, AXIS_RX);
    const lx = this.axis(pad, AXIS_LX);
    a.steer = clamp(rx + lx, -1, 1);
    a.handBrake = this.button(pad, BUTTON_A);
    a.reset = this.button(pad, BUTTON_Y);
    a.gearUp = this.button(pad, BUTTON_RB);
    a.gearDown = this.button(pad, BUTTON_LB);
    a.navigateX = clamp(rx + this.button(pad, DPAD_RIGHT) - this.button(pad, DPAD_LEFT), -1, 1);
    a.navigateY = clamp(
      this.axis(pad, AXIS_RY) + this.button(pad, DPAD_DOWN) - this.button(pad, DPAD_UP),
      -1,
      1,
    );
    a.confirm = this.button(pad, BUTTON_A);
    a.back = this.button(pad, BUTTON_B);
  }

  private pads(): (Gamepad | null)[] {
    return this.navigator?.getGamepads ? this.navigator.getGamepads() : [];
  }

  private firstConnected(): number | null {
    for (const pad of this.pads()) if (pad) return pad.index;
    return null;
  }

  private trigger(pad: Gamepad, index: number): number {
    const value = pad.buttons[index]?.value ?? 0;
    return value > this.triggerDeadzone ? value : 0;
  }

  private button(pad: Gamepad, index: number): number {
    const button = pad.buttons[index];
    return button && (button.pressed || button.value > 0.5) ? 1 : 0;
  }

  private axis(pad: Gamepad, index: number): number {
    const raw = pad.axes[index] ?? 0;
    const magnitude = Math.abs(raw);
    if (magnitude < this.stickDeadzone) return 0;
    return Math.sign(raw) * ((magnitude - this.stickDeadzone) / (1 - this.stickDeadzone));
  }

  private readonly onConnected = (e: GamepadEvent): void => {
    this.activeIndex ??= e.gamepad.index;
  };

  private readonly onDisconnected = (e: GamepadEvent): void => {
    if (this.activeIndex !== e.gamepad.index) return;
    this.activeIndex = null;
    this.actions.clear();
    this.activeIndex = this.firstConnected();
  };
}
