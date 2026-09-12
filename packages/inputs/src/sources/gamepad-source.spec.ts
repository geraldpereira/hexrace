import { TestBed } from '@angular/core/testing';

import { GamepadSource } from '@inputs/sources/gamepad-source';

interface FakePad {
  index: number;
  buttons: { pressed: boolean; value: number }[];
  axes: number[];
}

function pad(index: number, overrides: Partial<FakePad> = {}): FakePad {
  return {
    index,
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    axes: [0, 0, 0, 0],
    ...overrides,
  };
}

function connect(gamepad: FakePad): void {
  const event = new Event('gamepadconnected');
  Object.defineProperty(event, 'gamepad', { value: gamepad });
  window.dispatchEvent(event);
}

function disconnect(gamepad: FakePad): void {
  const event = new Event('gamepaddisconnected');
  Object.defineProperty(event, 'gamepad', { value: gamepad });
  window.dispatchEvent(event);
}

describe('GamepadSource', () => {
  let pads: (FakePad | null)[];
  let source: GamepadSource;

  beforeEach(() => {
    pads = [];
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => pads });
    TestBed.configureTestingModule({});
    source = TestBed.inject(GamepadSource);
  });

  it("is not connected without a gamepad and reads actions at rest", () => {
    expect(source.connected).toBe(false);
    source.poll();
    expect(source.actions.throttle).toBe(0);
  });

  it('hears the first gamepad plugged in', () => {
    const p = pad(0);
    pads = [p];
    connect(p);
    expect(source.connected).toBe(true);
  });

  it('maps triggers, right stick, bumpers, Y, A and B', () => {
    const p = pad(0);
    p.buttons[7] = { pressed: true, value: 0.8 };
    p.buttons[6] = { pressed: false, value: 0.02 };
    p.axes[2] = 0.575;
    p.buttons[5] = { pressed: true, value: 1 };
    p.buttons[3] = { pressed: true, value: 1 };
    p.buttons[0] = { pressed: false, value: 0.7 };
    p.buttons[1] = { pressed: true, value: 1 };
    pads = [p];
    connect(p);
    source.poll();
    const a = source.actions;
    expect(a.throttle).toBe(0.8);
    expect(a.brake).toBe(0);
    expect(a.steer).toBeCloseTo(0.5, 5);
    expect(a.handBrake).toBe(1);
    expect(a.reset).toBe(1);
    expect(a.confirm).toBe(1);
    expect(a.back).toBe(1);
  });

  it('sums both sticks to steer, clamped to 1, and ignores the dead zone', () => {
    const p = pad(0);
    p.axes[0] = 1;
    p.axes[2] = 1;
    pads = [p];
    connect(p);
    source.poll();
    expect(source.actions.steer).toBe(1);
    p.axes[0] = 0.1;
    p.axes[2] = -0.1;
    source.poll();
    expect(source.actions.steer).toBe(0);
  });

  it('navigates with the right stick or the D-pad', () => {
    const p = pad(0);
    p.buttons[15] = { pressed: true, value: 1 };
    p.buttons[12] = { pressed: true, value: 1 };
    pads = [p];
    connect(p);
    source.poll();
    expect(source.actions.navigateX).toBe(1);
    expect(source.actions.navigateY).toBe(-1);
  });

  it('moves to the next gamepad when its own is unplugged', () => {
    const first = pad(0);
    const second = pad(1);
    second.buttons[7] = { pressed: true, value: 1 };
    pads = [first, second];
    connect(first);
    pads = [null, second];
    disconnect(first);
    expect(source.connected).toBe(true);
    source.poll();
    expect(source.actions.throttle).toBe(1);
  });

  it('ignores the unplugging of a gamepad it was not hearing', () => {
    const first = pad(0);
    pads = [first];
    connect(first);
    disconnect(pad(3));
    expect(source.connected).toBe(true);
  });

  it('goes back to rest if the gamepad vanishes without an event', () => {
    const p = pad(0);
    p.buttons[7] = { pressed: true, value: 1 };
    pads = [p];
    connect(p);
    source.poll();
    expect(source.actions.throttle).toBe(1);
    pads = [null];
    source.poll();
    expect(source.actions.throttle).toBe(0);
  });

  it('copes with a gamepad that has fewer buttons and axes than the standard layout', () => {
    const p = pad(0, { buttons: [{ pressed: true, value: 1 }], axes: [] });
    pads = [p];
    connect(p);
    source.poll();
    expect(source.actions.confirm).toBe(1);
    expect(source.actions.throttle).toBe(0);
    expect(source.actions.steer).toBe(0);
  });

  it('takes a gamepad already plugged in at start', () => {
    pads = [pad(2)];
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    expect(TestBed.inject(GamepadSource).connected).toBe(true);
  });
});
