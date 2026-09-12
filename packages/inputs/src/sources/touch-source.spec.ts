import { TestBed } from '@angular/core/testing';

import { TouchSource } from '@inputs/sources/touch-source';

function pointer(
  type: string,
  x: number,
  y: number,
  pointerId = 1,
  pointerType = 'touch',
): PointerEvent {
  const event = new MouseEvent(type, { clientX: x, clientY: y, cancelable: true, bubbles: true });
  Object.defineProperty(event, 'pointerId', { value: pointerId });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  return event as unknown as PointerEvent;
}

function fire(event: PointerEvent): PointerEvent {
  document.dispatchEvent(event);
  return event;
}

describe('TouchSource', () => {
  let source: TouchSource;

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });
    TestBed.configureTestingModule({});
    source = TestBed.inject(TouchSource);
  });

  afterEach(() => {
    fire(pointer('pointerup', 0, 0, 1));
    fire(pointer('pointerup', 0, 0, 2));
    fire(pointer('pointerup', 0, 0, 3));
  });

  it('cuts the screen into three zones', () => {
    expect(source.zoneAt(100, 300)).toBe('drive');
    expect(source.zoneAt(900, 300)).toBe('steer');
    expect(source.zoneAt(500, 500)).toBe('handBrake');
    expect(source.zoneAt(500, 100)).toBeNull();
  });

  it("is only connected after a first touch inside a zone", () => {
    expect(source.connected).toBe(false);
    fire(pointer('pointerdown', 500, 100));
    expect(source.connected).toBe(false);
    fire(pointer('pointerdown', 100, 300));
    expect(source.connected).toBe(true);
  });

  it('throttles upwards and brakes downwards on the left paddle', () => {
    fire(pointer('pointerdown', 100, 300));
    fire(pointer('pointermove', 100, 260));
    source.poll();
    expect(source.actions.throttle).toBeCloseTo(0.5, 5);
    expect(source.actions.brake).toBe(0);
    fire(pointer('pointermove', 100, 500));
    source.poll();
    expect(source.actions.throttle).toBe(0);
    expect(source.actions.brake).toBe(1);
  });

  it('steers with the right paddle, relative to where the finger landed', () => {
    fire(pointer('pointerdown', 800, 300, 2));
    fire(pointer('pointermove', 760, 300, 2));
    source.poll();
    expect(source.actions.steer).toBeCloseTo(-0.5, 5);
    expect(source.byZone.steer.originX).toBe(800);
  });

  it('holds the hand brake while the finger is down', () => {
    fire(pointer('pointerdown', 500, 500, 3));
    source.poll();
    expect(source.actions.handBrake).toBe(1);
    fire(pointer('pointerup', 500, 500, 3));
    source.poll();
    expect(source.actions.handBrake).toBe(0);
  });

  it('follows several fingers at once', () => {
    fire(pointer('pointerdown', 100, 300, 1));
    fire(pointer('pointerdown', 900, 300, 2));
    fire(pointer('pointermove', 100, 220, 1));
    fire(pointer('pointermove', 980, 300, 2));
    source.poll();
    expect(source.actions.throttle).toBe(1);
    expect(source.actions.steer).toBe(1);
  });

  it('ignores a second finger on a zone already held, and a move it does not know', () => {
    fire(pointer('pointerdown', 100, 300, 1));
    const second = fire(pointer('pointerdown', 150, 300, 2));
    expect(second.defaultPrevented).toBe(false);
    const stray = fire(pointer('pointermove', 150, 200, 9));
    expect(stray.defaultPrevented).toBe(false);
    fire(pointer('pointerup', 0, 0, 9));
    source.poll();
    expect(source.actions.throttle).toBe(0);
  });

  it('ignores the mouse unless asked to', () => {
    fire(pointer('pointerdown', 100, 300, 1, 'mouse'));
    expect(source.connected).toBe(false);
    source.acceptMouse = true;
    fire(pointer('pointerdown', 100, 300, 1, 'mouse'));
    expect(source.connected).toBe(true);
  });

  it('keeps the page from scrolling under the finger', () => {
    const down = fire(pointer('pointerdown', 100, 300));
    const move = fire(pointer('pointermove', 100, 280));
    expect(down.defaultPrevented).toBe(true);
    expect(move.defaultPrevented).toBe(true);
  });
});
