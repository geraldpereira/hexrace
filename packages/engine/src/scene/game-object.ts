import { type GameComponent } from '@engine/scene/game-component';

type ComponentClass<T extends GameComponent> = abstract new () => T;

let nextId = 0;

/**
 * A node of the scene tree carrying components, from rally-game: children are ticked after their
 * parent, depth first, over a snapshot so a component may destroy or re-parent siblings mid-tick.
 * Built by `GameObject.named` and attached with `addChild`; `destroy` takes the subtree down,
 * children first, then tells every component.
 */
export class GameObject {
  readonly id = nextId++;
  name = '';
  parent: GameObject | null = null;
  readonly children: GameObject[] = [];
  private readonly components: GameComponent[] = [];
  private destroyed = false;

  static named(name: string): GameObject {
    const go = new GameObject();
    go.name = name;
    return go;
  }

  /** Attaches a component and wakes it; the object may not be in a scene yet. */
  add<T extends GameComponent>(component: T): T {
    component.gameObject = this;
    this.components.push(component);
    component.awake?.();
    return component;
  }

  get<T extends GameComponent>(ctor: ComponentClass<T>): T | undefined {
    return this.components.find((c): c is T => c instanceof ctor);
  }

  getOrThrow<T extends GameComponent>(ctor: ComponentClass<T>): T {
    const c = this.get(ctor);
    if (!c) throw new Error(`GameObject "${this.name}": missing ${ctor.name}`);
    return c;
  }

  addChild(child: GameObject): GameObject {
    if (child.parent) throw new Error(`GameObject "${child.name}" already has a parent`);
    child.parent = this;
    this.children.push(child);
    return child;
  }

  root(): GameObject {
    return this.parent ? this.parent.root() : this;
  }

  /** The first component of that class in this subtree, depth first. */
  findInChildren<T extends GameComponent>(ctor: ComponentClass<T>): T | undefined {
    const here = this.get(ctor);
    if (here) return here;
    for (const child of this.children) {
      const found = child.findInChildren(ctor);
      if (found) return found;
    }
    return undefined;
  }

  findAllInChildren<T extends GameComponent>(ctor: ComponentClass<T>, out: T[] = []): T[] {
    for (const c of this.components) if (c instanceof ctor) out.push(c);
    for (const child of this.children) child.findAllInChildren(ctor, out);
    return out;
  }

  findInScene<T extends GameComponent>(ctor: ComponentClass<T>): T | undefined {
    return this.root().findInChildren(ctor);
  }

  findAllInScene<T extends GameComponent>(ctor: ComponentClass<T>): T[] {
    return this.root().findAllInChildren(ctor);
  }

  dispatchCollisionEnter(other: GameObject): void {
    for (const c of this.components) c.onCollisionEnter?.(other);
  }

  /** Starts every component not started yet, once the tree is built so lookups resolve. */
  startAll(): void {
    for (const c of this.components) {
      if (!c.started) {
        c.started = true;
        c.start?.();
      }
    }
    for (const child of this.children) child.startAll();
  }

  fixedUpdate(): void {
    if (this.destroyed) return;
    for (const c of this.components) c.fixedUpdate?.();
    for (const child of [...this.children]) {
      if (child.parent === this && !child.destroyed) child.fixedUpdate();
    }
  }

  render(dt: number): void {
    if (this.destroyed) return;
    for (const c of this.components) c.render?.(dt);
    for (const child of [...this.children]) {
      if (child.parent === this && !child.destroyed) child.render(dt);
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const child of [...this.children]) child.destroy();
    for (const c of this.components) c.onDestroy?.();
    if (this.parent) {
      const i = this.parent.children.indexOf(this);
      this.parent.children.splice(i, 1);
      this.parent = null;
    }
  }
}
