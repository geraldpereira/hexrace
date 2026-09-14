/**
 * What the player asks for at one step, whatever the device: the action layer of the technical
 * spec 5.1. Each source fills one of these along the mapping of the functional spec 3.3, and the
 * game reads the merge. Values stay analogue wherever the source allows: a key is 0 or 1, a
 * trigger anything in between.
 */
export interface InputActions {
  /** 0 to 1. */
  throttle: number;
  /** 0 to 1; reverse once stopped is the car's call, not this layer's. */
  brake: number;
  /** -1 left to 1 right. */
  steer: number;
  /** 0 to 1. */
  handBrake: number;
  /** Held; the car counts the three seconds (functional spec 3.8). */
  reset: number;
  /** Manual gearbox only, 0 or 1; the touch screen has none. */
  gearUp: number;
  gearDown: number;
  /** Menus, -1 to 1, Y positive downwards. */
  navigateX: number;
  navigateY: number;
  /** Menus, 0 or 1. */
  confirm: number;
  back: number;
}

export const IDLE_ACTIONS: Readonly<InputActions> = {
  throttle: 0,
  brake: 0,
  steer: 0,
  handBrake: 0,
  reset: 0,
  gearUp: 0,
  gearDown: 0,
  navigateX: 0,
  navigateY: 0,
  confirm: 0,
  back: 0,
};
