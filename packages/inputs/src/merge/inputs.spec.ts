import { TestBed } from '@angular/core/testing';

import { InputActions } from '@inputs/entity/input-actions';
import { INPUT_SOURCES, type InputSource, type InputSourceId } from '@inputs/entity/input-source';
import { Inputs } from '@inputs/merge/inputs';

class FakeSource implements InputSource {
  readonly actions = new InputActions();
  connected = true;
  polled: number[] = [];
  constructor(readonly id: InputSourceId) {}
  poll(dt: number): void {
    this.polled.push(dt);
  }
}

describe('Inputs', () => {
  it('reads actions at rest with no source at all', () => {
    TestBed.configureTestingModule({});
    const inputs = TestBed.inject(Inputs);
    inputs.poll(1 / 60);
    expect(inputs.actions.isEngaged()).toBe(false);
    expect(inputs.activeSource).toBeNull();
  });

  describe('with a keyboard and a gamepad', () => {
    let keyboard: FakeSource;
    let gamepad: FakeSource;
    let inputs: Inputs;

    beforeEach(() => {
      keyboard = new FakeSource('keyboard');
      gamepad = new FakeSource('gamepad');
      TestBed.configureTestingModule({
        providers: [
          { provide: INPUT_SOURCES, useValue: keyboard, multi: true },
          { provide: INPUT_SOURCES, useValue: gamepad, multi: true },
        ],
      });
      inputs = TestBed.inject(Inputs);
    });

    it('polls every source with the step', () => {
      inputs.poll(0.02);
      expect(keyboard.polled).toEqual([0.02]);
      expect(gamepad.polled).toEqual([0.02]);
    });

    it('takes the maximum of analogue values', () => {
      keyboard.actions.throttle = 1;
      gamepad.actions.throttle = 0.3;
      gamepad.actions.brake = 0.6;
      gamepad.actions.handBrake = 1;
      keyboard.actions.reset = 1;
      keyboard.actions.confirm = 1;
      gamepad.actions.back = 1;
      inputs.poll(1 / 60);
      const a = inputs.actions;
      expect(a.throttle).toBe(1);
      expect(a.brake).toBe(0.6);
      expect(a.handBrake).toBe(1);
      expect(a.reset).toBe(1);
      expect(a.confirm).toBe(1);
      expect(a.back).toBe(1);
    });

    it('sums and clamps steering and navigation', () => {
      keyboard.actions.steer = 0.8;
      gamepad.actions.steer = 0.7;
      keyboard.actions.navigateX = -1;
      gamepad.actions.navigateX = -1;
      keyboard.actions.navigateY = 0.5;
      inputs.poll(1 / 60);
      expect(inputs.actions.steer).toBe(1);
      expect(inputs.actions.navigateX).toBe(-1);
      expect(inputs.actions.navigateY).toBe(0.5);
    });

    it('remembers the last source engaged', () => {
      keyboard.actions.throttle = 1;
      inputs.poll(1 / 60);
      expect(inputs.activeSource).toBe('keyboard');
      keyboard.actions.throttle = 0;
      gamepad.actions.steer = 0.5;
      inputs.poll(1 / 60);
      expect(inputs.activeSource).toBe('gamepad');
      gamepad.actions.steer = 0;
      inputs.poll(1 / 60);
      expect(inputs.activeSource).toBe('gamepad');
    });

    it('starts from zero every step', () => {
      keyboard.actions.throttle = 1;
      inputs.poll(1 / 60);
      keyboard.actions.throttle = 0;
      inputs.poll(1 / 60);
      expect(inputs.actions.throttle).toBe(0);
    });
  });
});
