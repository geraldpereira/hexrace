import { type InputActions, IDLE_ACTIONS } from '@inputs/entity/input-actions';

describe('IDLE_ACTIONS', () => {
  it('rests every action at zero and copies into a fresh, independent set', () => {
    const actions: InputActions = { ...IDLE_ACTIONS };
    expect(Object.values(actions).every((v: number) => v === 0)).toBe(true);
    actions.throttle = 1;
    expect(IDLE_ACTIONS.throttle).toBe(0);
    Object.assign(actions, IDLE_ACTIONS);
    expect(actions).toEqual(IDLE_ACTIONS);
  });
});
