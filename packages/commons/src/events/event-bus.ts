import { Injectable } from '@angular/core';

/**
 * The events that cross modules, by name. Empty here: each package that publishes an event adds
 * its own entries by declaration merging (`declare module '@hexrace/commons' { interface
 * HexraceEvents { 'car/collision': Collision } }`), so the bus stays typed end to end without
 * `commons` knowing a single event.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- the shape is filled by declaration merging elsewhere.
export interface HexraceEvents {}

export type EventName = keyof HexraceEvents;
export type EventHandler<K extends EventName> = (event: HexraceEvents[K]) => void;

/**
 * The bus for what crosses modules without a direct link (technical spec 2.2): a collision that has
 * to make a sound, light a damage and shake the camera. Publishing calls every handler registered
 * for that name, synchronously, in registration order; `on` returns the function that unsubscribes.
 */
@Injectable({ providedIn: 'root' })
export class EventBus {
  private readonly handlers = new Map<PropertyKey, Set<(event: never) => void>>();

  publish<K extends EventName>(name: K, event: HexraceEvents[K]): void {
    const set = this.handlers.get(name);
    if (!set) return;
    for (const handler of [...set]) (handler as EventHandler<K>)(event);
  }

  /** Registers `handler` for `name`; returns the unsubscribe. */
  on<K extends EventName>(name: K, handler: EventHandler<K>): () => void {
    let set = this.handlers.get(name);
    if (!set) {
      set = new Set();
      this.handlers.set(name, set);
    }
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  }

  /** Registers a handler that runs once, then unsubscribes itself. */
  once<K extends EventName>(name: K, handler: EventHandler<K>): () => void {
    const off = this.on(name, (event) => {
      off();
      handler(event);
    });
    return off;
  }
}
