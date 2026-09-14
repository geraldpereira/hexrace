import { type GameObject } from '@engine/scene/game-object';
/**
 * A behaviour attached to a GameObject, named apart from Angular's components. Dependencies come from `inject()` at construction, so a
 * component is built inside a scene's injection context (`Scene.instantiate`); its data comes
 * from public fields set before it is added. The hooks are optional and called by the tree.
 */

export abstract class GameComponent {
  /** Set by `GameObject.add`. */
  gameObject!: GameObject;
  /** Flipped by `GameObject.startAll`. */
  started = false;

  awake?(): void;
  start?(): void;
  fixedUpdate?(): void;
  render?(dt: number): void;
  onCollisionEnter?(other: GameObject): void;
  onDestroy?(): void;
}
