import { IDLE_ACTIONS, type InputActions, type InputSource } from '@hexrace/inputs';

export class MenuSource implements InputSource {
  readonly id = 'gamepad' as const;
  readonly actions: InputActions = { ...IDLE_ACTIONS };
  connected = true;

  poll(): void {
    // Nothing to poll: the spec sets the actions by hand.
  }
}
