/**
 * The words every package shares. `EventBus` carries what crosses modules, typed by the
 * `HexraceEvents` interface each package augments; `Random` is the one source of randomness,
 * seeded and replayable or fresh, `Clock` the one source of real time; `Maths`, `Polygons` and
 * `Noise` are the arithmetic more than one module needs, `Vec2` and `Vec3` its value objects. No
 * DOM, no three.js, no Jolt: a package that reads this stays testable on its own.
 */
export {
  EventBus,
  type EventHandler,
  type EventName,
  type HexraceEvents,
} from '@commons/events/event-bus';
export { Maths } from '@commons/math/maths';
export { Noise } from '@commons/math/noise';
export { Polygons } from '@commons/math/polygons';
export { Vec2 } from '@commons/math/vec2';
export { Vec3 } from '@commons/math/vec3';
export { Random } from '@commons/random/random';
export { type Rng } from '@commons/random/rng';
export { RngFactory } from '@commons/random/rng-factory';
export { Clock } from '@commons/time/clock';
