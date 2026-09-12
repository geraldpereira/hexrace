import { GameInput } from '@inputs/entity/game-input';

describe('GameInput', () => {
  it('démarre au repos', () => {
    const input = new GameInput();
    expect(input.leftStickX).toBe(0);
    expect(input.rightTrigger).toBe(0);
    expect(input.pauseRequested).toBe(false);
  });

  it('revient au repos après reset', () => {
    const input = new GameInput();
    input.leftStickX = 0.5;
    input.rightTrigger = 1;
    input.buttonA = 1;
    input.pauseRequested = true;
    input.reset();
    expect(input).toEqual(new GameInput());
  });
});
