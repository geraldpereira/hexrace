import { type InputActions } from '@inputs/entity/input-actions';

export type InputSourceId = 'gamepad' | 'keyboard' | 'touch';

/**
 * One source of inputs: it normalises its hardware into actions at every step. The merge knows
 * nothing more; dead zones, smoothing and mapping are each source's own business.
 */
export interface InputSource {
  readonly id: InputSourceId;
  /** The actions after the last `poll`. */
  readonly actions: InputActions;
  /** True when the device is there: a gamepad plugged in, a screen touched at least once. */
  readonly connected: boolean;
  /** Reads the hardware and updates `actions`; `dt` in seconds, for the keyboard's ramps. */
  poll(dt: number): void;
}
