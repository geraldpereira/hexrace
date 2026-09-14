import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

import { type InputActions, IDLE_ACTIONS } from '@inputs/entity/input-actions';
import { type InputSource, type InputSourceId } from '@inputs/entity/input-source';

const PADDLE_TRAVEL_PX = 50;
const PADDLE_ZONE_SHARE = 0.4;
const HAND_BRAKE_FROM_SHARE = 0.55;

export type TouchZone = 'drive' | 'steer' | 'handBrake';

/** What a finger does on one zone, for whoever draws the paddles. */
export interface TouchPaddle {
  readonly zone: TouchZone;
  /** True while a finger is down. */
  active: boolean;
  /** Where the finger landed, in screen pixels. */
  originX: number;
  originY: number;
  /** -1 to 1: X for `steer`, Y for `drive`, positive downwards. */
  deflection: number;
}

/**
 * The touch screen of the functional spec 3.3: the left 40 % of the screen is a vertical paddle
 * (up throttles, down brakes), the right 40 % a horizontal one for steering, and the bottom of the
 * middle band is the hand brake button. A paddle is relative: where the finger lands is its zero
 * and full action sits `travelPx` away. This source draws nothing; it exposes `paddles` so a
 * component can, and it swallows the pointer events it takes so the page never scrolls or zooms.
 */
@Injectable({ providedIn: 'root' })
export class TouchSource implements InputSource {
  readonly id: InputSourceId = 'touch';
  readonly actions: InputActions = { ...IDLE_ACTIONS };
  travelPx = PADDLE_TRAVEL_PX;
  /** Lets the mouse stand in for a finger, to try the paddles on a desktop. */
  acceptMouse = false;
  readonly byZone: Readonly<Record<TouchZone, TouchPaddle>> = {
    drive: { zone: 'drive', active: false, originX: 0, originY: 0, deflection: 0 },
    steer: { zone: 'steer', active: false, originX: 0, originY: 0, deflection: 0 },
    handBrake: { zone: 'handBrake', active: false, originX: 0, originY: 0, deflection: 0 },
  };
  readonly paddles: readonly TouchPaddle[] = Object.values(this.byZone);

  private readonly document = inject(DOCUMENT);
  private readonly pointers = new Map<number, TouchPaddle>();
  private touched = false;

  constructor() {
    const d = this.document;
    d.addEventListener('pointerdown', this.onDown);
    d.addEventListener('pointermove', this.onMove);
    d.addEventListener('pointerup', this.onUp);
    d.addEventListener('pointercancel', this.onUp);
  }

  get connected(): boolean {
    return this.touched;
  }

  poll(): void {
    const { drive, steer, handBrake } = this.byZone;
    const a = this.actions;
    a.throttle = drive.active && drive.deflection < 0 ? -drive.deflection : 0;
    a.brake = drive.active && drive.deflection > 0 ? drive.deflection : 0;
    a.steer = steer.active ? steer.deflection : 0;
    a.handBrake = handBrake.active ? 1 : 0;
  }

  /** The zone under a screen point, or null when it touches none; menus are tapped directly. */
  zoneAt(x: number, y: number): TouchZone | null {
    const view = this.document.defaultView as Window;
    const width = view.innerWidth;
    const height = view.innerHeight;
    if (x < width * PADDLE_ZONE_SHARE) return 'drive';
    if (x > width * (1 - PADDLE_ZONE_SHARE)) return 'steer';
    if (y > height * HAND_BRAKE_FROM_SHARE) return 'handBrake';
    return null;
  }

  private accepts(e: PointerEvent): boolean {
    return e.pointerType === 'touch' || (this.acceptMouse && e.pointerType === 'mouse');
  }

  private readonly onDown = (e: PointerEvent): void => {
    if (!this.accepts(e)) return;
    const zone = this.zoneAt(e.clientX, e.clientY);
    if (!zone) return;
    const paddle = this.byZone[zone];
    if (paddle.active) return;
    e.preventDefault();
    this.touched = true;
    paddle.active = true;
    paddle.originX = e.clientX;
    paddle.originY = e.clientY;
    paddle.deflection = 0;
    this.pointers.set(e.pointerId, paddle);
  };

  private readonly onMove = (e: PointerEvent): void => {
    const paddle = this.pointers.get(e.pointerId);
    if (!paddle) return;
    e.preventDefault();
    const dx = (e.clientX - paddle.originX) / this.travelPx;
    const dy = (e.clientY - paddle.originY) / this.travelPx;
    const raw = paddle.zone === 'steer' ? dx : dy;
    paddle.deflection = Math.max(-1, Math.min(1, raw));
  };

  private readonly onUp = (e: PointerEvent): void => {
    const paddle = this.pointers.get(e.pointerId);
    if (!paddle) return;
    this.pointers.delete(e.pointerId);
    paddle.active = false;
    paddle.deflection = 0;
  };
}
