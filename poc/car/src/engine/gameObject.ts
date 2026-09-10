import type GUI from 'lil-gui';

type ComponentClass<T extends Component> = abstract new (...args: never[]) => T;

let nextGameObjectId = 0;

export class GameObject {
    readonly id = nextGameObjectId++;
    name: string;
    parent: GameObject | null = null;
    readonly children: GameObject[] = [];
    private readonly components: Component[] = [];
    private destroyed = false;

    constructor(name = '', components: Component[] = []) {
        this.name = name;
        for (const c of components) this.add(c);
    }

    add<T extends Component>(component: T): T {
        component.gameObject = this;
        this.components.push(component);
        component.awake?.();
        return component;
    }

    get<T extends Component>(ctor: ComponentClass<T>): T | undefined {
        for (const c of this.components) if (c instanceof ctor) return c;
        return undefined;
    }

    getOrThrow<T extends Component>(ctor: ComponentClass<T>): T {
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

    getRoot(): GameObject {
        return this.parent ? this.parent.getRoot() : this;
    }

    findInChildren<T extends Component>(ctor: ComponentClass<T>): T | undefined {
        const here = this.get(ctor);
        if (here) return here;
        for (const child of this.children) {
            const found = child.findInChildren(ctor);
            if (found) return found;
        }
        return undefined;
    }

    findAllInChildren<T extends Component>(ctor: ComponentClass<T>, out: T[] = []): T[] {
        for (const c of this.components) if (c instanceof ctor) out.push(c);
        for (const child of this.children) child.findAllInChildren(ctor, out);
        return out;
    }

    findInScene<T extends Component>(ctor: ComponentClass<T>): T | undefined {
        return this.getRoot().findInChildren(ctor);
    }

    findAllInScene<T extends Component>(ctor: ComponentClass<T>): T[] {
        return this.getRoot().findAllInChildren(ctor);
    }

    dispatchCollisionEnter(other: GameObject): void {
        for (const c of this.components) c.onCollisionEnter?.(other);
    }

    /** Recursively register lil-gui tweaks for every component in the subtree. */
    registerDebugAll(gui: GUI): void {
        for (const c of this.components) c.registerDebug?.(gui);
        for (const child of this.children) child.registerDebugAll(gui);
    }

    /**
     * Recursively run `start()` on every component that hasn't been started yet.
     * Called once after the scene tree is built so cross-GO lookups can resolve.
     */
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
        if (this.children.length === 0) return;
        // Snapshot in case a behavior destroys/reparents siblings during the tick.
        const snapshot = [...this.children];
        for (const child of snapshot) {
            if (child.parent === this && !child.destroyed) child.fixedUpdate();
        }
    }

    render(dt: number): void {
        if (this.destroyed) return;
        for (const c of this.components) c.render?.(dt);
        if (this.children.length === 0) return;
        const snapshot = [...this.children];
        for (const child of snapshot) {
            if (child.parent === this && !child.destroyed) child.render(dt);
        }
    }

    destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;
        // Destroy children first (depth-first cleanup).
        for (const child of [...this.children]) child.destroy();
        for (const c of this.components) c.onDestroy?.();
        if (this.parent) {
            const i = this.parent.children.indexOf(this);
            if (i >= 0) this.parent.children.splice(i, 1);
            this.parent = null;
        }
    }
}

export abstract class Component {
    /** Set by GameObject.add — never assign manually. */
    gameObject!: GameObject;
    /** Framework-internal flag flipped by GameObject.startAll. Do not assign manually. */
    started = false;

    /** Called when the component is attached to its GameObject. The GO may not yet be in the scene. */
    awake?(): void;
    /** Called once after the scene tree is built. Use for cross-GO lookups. */
    start?(): void;
    fixedUpdate?(): void;
    render?(dt: number): void;
    onCollisionEnter?(other: GameObject): void;
    onDestroy?(): void;
    registerDebug?(gui: GUI): void;
}
