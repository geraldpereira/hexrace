import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  GamepadSource,
  INPUT_SOURCES,
  Inputs,
  KeyboardSource,
  TouchSource,
  type InputActions,
} from '@hexrace/inputs';

import { startFrameLoop } from '@ui/lab/frame-loop';
import { Bar } from '@ui/lab/inputs/bar';
import { TouchPaddles } from '@ui/lab/inputs/touch-paddles';

const ACTION_NAMES = [
  'throttle',
  'brake',
  'steer',
  'handBrake',
  'reset',
  'gearUp',
  'gearDown',
  'navigateX',
  'navigateY',
  'confirm',
  'back',
] as const satisfies readonly (keyof InputActions)[];

type ActionName = (typeof ACTION_NAMES)[number];

const SIGNED: ReadonlySet<ActionName> = new Set<ActionName>(['steer', 'navigateX', 'navigateY']);

/** One row of the readout table: an action's merged value and each source's own. */
export interface ActionRow {
  readonly name: ActionName;
  /** Signed actions run from -1 to 1 and are drawn from the middle. */
  readonly signed: boolean;
  readonly merged: number;
  readonly perSource: readonly number[];
}

/**
 * The inputs showcase: every action live, merged and per source, with the touch paddles drawn
 * over the page. It runs its own animation loop because the engine does not exist yet; the loop
 * only polls the inputs and refreshes signals. `showPaddles` is initialised after `document`
 * because field initialisers run in order.
 */
@Component({
  selector: 'hr-inputs-showcase',
  imports: [RouterLink, Bar, TouchPaddles],
  templateUrl: './inputs-showcase.html',
  styleUrl: './inputs-showcase.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputsShowcase {
  readonly inputs = inject(Inputs);
  readonly sources = inject(INPUT_SOURCES);
  readonly keyboard = inject(KeyboardSource);
  readonly gamepad = inject(GamepadSource);
  readonly touch = inject(TouchSource);

  readonly rows = signal<readonly ActionRow[]>([]);
  readonly connected = signal<readonly boolean[]>([]);
  readonly activeSource = signal<string>('none');

  private readonly document = inject(DOCUMENT);
  readonly showPaddles = signal(this.prefersTouch());
  private last = performance.now();

  constructor() {
    startFrameLoop(this.tick);
  }

  /** Shows or hides the paddles; while shown, the mouse stands in for a finger. */
  togglePaddles(): void {
    this.showPaddles.update((v) => !v);
    this.touch.acceptMouse = this.showPaddles();
  }

  setKeyboardSmoothing(value: string): void {
    this.keyboard.smoothingTime = Number(value);
  }

  setStickDeadzone(value: string): void {
    this.gamepad.stickDeadzone = Number(value);
  }

  setTravel(value: string): void {
    this.touch.travelPx = Number(value);
  }

  private prefersTouch(): boolean {
    const view = this.document.defaultView;
    return view?.matchMedia?.('(pointer: coarse)').matches ?? false;
  }

  private readonly tick = (now: number): void => {
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    this.inputs.poll(dt);
    this.rows.set(
      ACTION_NAMES.map((name) => ({
        name,
        signed: SIGNED.has(name),
        merged: this.inputs.actions[name],
        perSource: this.sources.map((s) => s.actions[name]),
      })),
    );
    this.connected.set(this.sources.map((s) => s.connected));
    this.activeSource.set(this.inputs.activeSource ?? 'none');
  };
}
