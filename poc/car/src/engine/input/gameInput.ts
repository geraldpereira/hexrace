/**
 * Generic gamepad-shaped input snapshot. Each source (keyboard, gamepad, touch)
 * normalises its hardware into this layout. Game-specific interpretation
 * (throttle, brake, steer, hand brake, …) lives in the consuming behaviors,
 * not here — keep this layout reusable across vehicles.
 *
 * Convention: stick Y positive = down/back (matches the Gamepad API). Triggers
 * are 0..1.
 */
export class GameInput {
    leftStickX = 0;
    leftStickY = 0;
    rightStickX = 0;
    rightStickY = 0;
    leftTrigger = 0;
    rightTrigger = 0;
    leftBumper = 0;
    pauseRequested = false;

    reset(): void {
        this.leftStickX = 0;
        this.leftStickY = 0;
        this.rightStickX = 0;
        this.rightStickY = 0;
        this.leftTrigger = 0;
        this.rightTrigger = 0;
        this.leftBumper = 0;
        this.pauseRequested = false;
    }
}
