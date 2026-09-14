import { type EnvironmentInjector, runInInjectionContext } from '@angular/core';

import { type Component } from '@engine/scene/component';
import { GameObject } from '@engine/scene/game-object';

/**
 * One screen's worth of game objects and the child injector they live in (technical spec 2.2):
 * the race, the editor, the garage. Components are instantiated inside that injector so their
 * `inject()` calls resolve, providers given at creation live only as long as the scene, and
 * `destroy` takes the tree and the injector down together, which is what frees bodies and meshes.
 */
export class Scene {
  readonly root = GameObject.named('root');
  injector!: EnvironmentInjector;
  private destroyed = false;

  /** Builds a component inside the scene's injection context. */
  instantiate<T extends Component>(ctor: new () => T): T {
    return runInInjectionContext(this.injector, () => new ctor());
  }

  /** A new object under the root, with components built here and added in order. */
  spawn(name: string, ...components: (new () => Component)[]): GameObject {
    const go = GameObject.named(name);
    for (const ctor of components) go.add(this.instantiate(ctor));
    this.root.addChild(go);
    return go;
  }

  start(): void {
    this.root.startAll();
  }

  fixedUpdate(): void {
    this.root.fixedUpdate();
  }

  render(dt: number): void {
    this.root.render(dt);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.root.destroy();
    this.injector.destroy();
  }
}
