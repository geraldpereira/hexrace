import { inject } from '@angular/core';
import { FIXED_TIMESTEP, GameComponent } from '@hexrace/engine';
import { Inputs } from '@hexrace/inputs';

/**
 * Reads the pad, the keyboard and the paddles once at the head of every fixed step, before any
 * other component looks at the actions. It is spawned first, and the tree ticks in the order
 * things were added, so the car always sees the inputs of this step and not of the last one.
 */
export class InputPoller extends GameComponent {
  private readonly inputs = inject(Inputs);

  override fixedUpdate(): void {
    this.inputs.poll(FIXED_TIMESTEP);
  }
}
