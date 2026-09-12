/**
 * What the player asks for at one step, whatever the device: the action layer of the technical
 * spec 5.1. Each source fills one of these along the mapping of the functional spec 3.3, and the
 * game reads the merge. Values stay analogue wherever the source allows: a key is 0 or 1, a
 * trigger anything in between.
 */
export class InputActions {
  /** 0 to 1. */
  throttle = 0;
  /** 0 to 1; reverse once stopped is the car's call, not this layer's. */
  brake = 0;
  /** -1 left to 1 right. */
  steer = 0;
  /** 0 to 1. */
  handBrake = 0;
  /** Held; the car counts the three seconds (functional spec 3.8). */
  reset = 0;
  /** Manual gearbox only, 0 or 1; the touch screen has none. */
  gearUp = 0;
  gearDown = 0;
  /** Menus, -1 to 1, Y positive downwards. */
  navigateX = 0;
  navigateY = 0;
  /** Menus, 0 or 1. */
  confirm = 0;
  back = 0;

  clear(): void {
    this.throttle = 0;
    this.brake = 0;
    this.steer = 0;
    this.handBrake = 0;
    this.reset = 0;
    this.gearUp = 0;
    this.gearDown = 0;
    this.navigateX = 0;
    this.navigateY = 0;
    this.confirm = 0;
    this.back = 0;
  }

  /** True as soon as any action is engaged: how the merge tells which source is playing. */
  isEngaged(): boolean {
    return (
      this.throttle > 0 ||
      this.brake > 0 ||
      this.steer !== 0 ||
      this.handBrake > 0 ||
      this.reset > 0 ||
      this.gearUp > 0 ||
      this.gearDown > 0 ||
      this.navigateX !== 0 ||
      this.navigateY !== 0 ||
      this.confirm > 0 ||
      this.back > 0
    );
  }
}
