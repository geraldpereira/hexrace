import { TestBed } from '@angular/core/testing';

import { EventBus } from '@commons/events/event-bus';

declare module '@commons/events/event-bus' {
  interface HexraceEvents {
    'test/ping': { n: number };
    'test/pong': string;
  }
}

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    bus = TestBed.inject(EventBus);
  });

  it('calls every handler of a name in order, and nobody else', () => {
    const seen: string[] = [];
    bus.on('test/ping', (e) => seen.push(`a${String(e.n)}`));
    bus.on('test/ping', (e) => seen.push(`b${String(e.n)}`));
    bus.on('test/pong', (s) => seen.push(s));
    bus.publish('test/ping', { n: 1 });
    bus.publish('test/pong', 'p');
    expect(seen).toEqual(['a1', 'b1', 'p']);
  });

  it('does nothing for a name nobody listens to', () => {
    expect(() => {
      bus.publish('test/pong', 'lost');
    }).not.toThrow();
  });

  it('unsubscribes, even from inside a handler, without skipping the others', () => {
    const seen: number[] = [];
    const off = bus.on('test/ping', (e) => {
      seen.push(e.n);
      off();
    });
    bus.on('test/ping', (e) => seen.push(e.n * 10));
    bus.publish('test/ping', { n: 1 });
    bus.publish('test/ping', { n: 2 });
    expect(seen).toEqual([1, 10, 20]);
  });

  it('runs a once handler a single time', () => {
    const seen: number[] = [];
    bus.once('test/ping', (e) => seen.push(e.n));
    bus.publish('test/ping', { n: 1 });
    bus.publish('test/ping', { n: 2 });
    expect(seen).toEqual([1]);
  });
});
