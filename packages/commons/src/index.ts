/**
 * The words every package shares. `EventBus` carries what crosses modules, typed by the
 * `HexraceEvents` interface each package augments; `Random` is the one source of randomness,
 * seeded and replayable or fresh; `math` is the arithmetic more than one module needs, `Vec2` and `Vec3` its value objects. No DOM,
 * no three.js, no Jolt: a package that reads this stays testable on its own.
 */
export {
  EventBus,
  type EventHandler,
  type EventName,
  type HexraceEvents,
} from '@commons/events/event-bus';
export {
  degToRad,
  hermite,
  inverseLerp,
  kmhToMps,
  lerp,
  mpsToKmh,
  radToDeg,
  ramp,
} from '@commons/math/math';
export { insideConvex, polygonArea } from '@commons/math/polygon';
export { Vec2 } from '@commons/math/vec2';
export { Vec3 } from '@commons/math/vec3';
export { Random } from '@commons/random/random';
export { createRng, type Rng } from '@commons/random/rng';
