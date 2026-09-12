import { InputActions } from '@inputs/entity/input-actions';

describe('InputActions', () => {
  it('starts at rest and is not engaged', () => {
    const actions = new InputActions();
    expect(actions.throttle).toBe(0);
    expect(actions.steer).toBe(0);
    expect(actions.isEngaged()).toBe(false);
  });

  it.each([
    ['throttle', 0.5],
    ['brake', 1],
    ['steer', -0.2],
    ['handBrake', 1],
    ['reset', 1],
    ['gearUp', 1],
    ['gearDown', 1],
    ['navigateX', 1],
    ['navigateY', -1],
    ['confirm', 1],
    ['back', 1],
  ] as const)('is engaged once %s is used', (field, value) => {
    const actions = new InputActions();
    actions[field] = value;
    expect(actions.isEngaged()).toBe(true);
  });

  it('goes back to rest on clear', () => {
    const actions = new InputActions();
    actions.throttle = 1;
    actions.steer = 0.3;
    actions.back = 1;
    actions.clear();
    expect(actions).toEqual(new InputActions());
  });
});
