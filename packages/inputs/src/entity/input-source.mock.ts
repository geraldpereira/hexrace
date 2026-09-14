import { type InputActions, IDLE_ACTIONS } from '@inputs/entity/input-actions';
import { type InputSource, type InputSourceId } from '@inputs/entity/input-source';

export class FakeSource implements InputSource {
  readonly actions: InputActions = { ...IDLE_ACTIONS };
  connected = true;
  polled: number[] = [];

  constructor(readonly id: InputSourceId) {}

  poll(dt: number): void {
    this.polled.push(dt);
  }
}
