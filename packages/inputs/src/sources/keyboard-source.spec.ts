import { TestBed } from '@angular/core/testing';

import { KeyboardSource } from '@inputs/sources/keyboard-source';

function press(code: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { code, cancelable: true }));
}

function release(code: string): void {
  window.dispatchEvent(new KeyboardEvent('keyup', { code }));
}

describe('KeyboardSource', () => {
  let source: KeyboardSource;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    source = TestBed.inject(KeyboardSource);
    source.smoothingTime = 0;
  });

  afterEach(() => {
    window.dispatchEvent(new Event('blur'));
  });

  it('is only connected after a first key', () => {
    expect(source.connected).toBe(false);
    press('KeyW');
    expect(source.connected).toBe(true);
  });

  it('ignores a key that means nothing', () => {
    const event = new KeyboardEvent('keydown', { code: 'KeyZ', cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(source.connected).toBe(false);
  });

  it("keeps the page from reacting to the game's keys", () => {
    const event = new KeyboardEvent('keydown', { code: 'Space', cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('maps WASD and the arrows to throttle, brake and steer', () => {
    press('KeyW');
    press('ArrowRight');
    source.poll(1 / 60);
    expect(source.actions.throttle).toBe(1);
    expect(source.actions.steer).toBe(1);
    release('KeyW');
    press('ArrowDown');
    press('KeyA');
    source.poll(1 / 60);
    expect(source.actions.throttle).toBe(0);
    expect(source.actions.brake).toBe(1);
    expect(source.actions.steer).toBe(0);
  });

  it('maps Space, R, E, Q, Enter and Escape', () => {
    press('Space');
    press('KeyR');
    press('KeyE');
    press('KeyQ');
    press('Enter');
    press('Escape');
    source.poll(1 / 60);
    expect(source.actions.handBrake).toBe(1);
    expect(source.actions.reset).toBe(1);
    expect(source.actions.gearUp).toBe(1);
    expect(source.actions.gearDown).toBe(1);
    expect(source.actions.confirm).toBe(1);
    expect(source.actions.back).toBe(1);
  });

  it('navigates menus with the same keys, Y positive downwards', () => {
    press('KeyS');
    press('KeyD');
    source.poll(1 / 60);
    expect(source.actions.navigateY).toBe(1);
    expect(source.actions.navigateX).toBe(1);
  });

  it('ramps up when smoothing is on', () => {
    source.smoothingTime = 0.1;
    press('KeyW');
    source.poll(0.05);
    expect(source.actions.throttle).toBeGreaterThan(0.3);
    expect(source.actions.throttle).toBeLessThan(0.5);
    source.poll(1);
    expect(source.actions.throttle).toBeCloseTo(1, 3);
  });

  it('does not count a repeated key twice', () => {
    press('KeyW');
    press('KeyW');
    release('KeyW');
    source.poll(1 / 60);
    expect(source.actions.throttle).toBe(0);
  });

  it('ignores the release of a key never pressed', () => {
    press('KeyW');
    release('KeyZ');
    source.poll(1 / 60);
    expect(source.actions.throttle).toBe(1);
  });

  it('releases everything when the window loses focus', () => {
    press('KeyW');
    source.poll(1 / 60);
    window.dispatchEvent(new Event('blur'));
    expect(source.actions.throttle).toBe(0);
    source.poll(1 / 60);
    expect(source.actions.throttle).toBe(0);
  });
});
