import { IDLE_ACTIONS, type InputActions, type InputSource } from '@hexrace/inputs';

export class ScriptedSource implements InputSource {
  readonly id = 'gamepad' as const;
  readonly actions: InputActions = { ...IDLE_ACTIONS };
  connected = true;

  poll(): void {
    // Nothing to poll: the test sets the actions by hand.
  }
}
