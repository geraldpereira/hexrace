import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import initJolt, { type default as Jolt } from 'jolt-physics';

import { type GameObject } from '@engine/scene/game-object';

export type JoltApi = typeof Jolt;
export type JoltBody = Jolt.Body;
export type JoltBodyInterface = Jolt.BodyInterface;
export type JoltPhysicsSystem = Jolt.PhysicsSystem;
export type JoltVec3 = Jolt.Vec3;

/** Two object layers, static ground and moving bodies, shared by every body the game creates. */
export const LAYER_NON_MOVING = 0;
export const LAYER_MOVING = 1;

const NUM_OBJECT_LAYERS = 2;
const NUM_BROAD_PHASE_LAYERS = 2;

/**
 * The physics, and it is Jolt: nothing abstracts it, the game speaks Jolt where it builds bodies
 * (decision of 2026-09-13, technical spec 2.2). The wasm loads on `load()`, lazily, and reading
 * `Jolt` before that throws; then one `JoltInterface` and `PhysicsSystem` with two layers that
 * collide except ground with ground, and a contact listener that turns new contacts into
 * `onCollisionEnter` on the two registered objects. Jolt's binding keeps the listener alive.
 */
@Injectable({ providedIn: 'root' })
export class JoltPhysics {
  /** How long the wasm took to load and initialise, in ms; 0 before. */
  loadMs = 0;

  private readonly window = inject(DOCUMENT).defaultView as Window;
  private api: JoltApi | null = null;
  private jolt: Jolt.JoltInterface | null = null;
  private system: JoltPhysicsSystem | null = null;
  private bodies: JoltBodyInterface | null = null;
  private loading: Promise<void> | null = null;
  private readonly bodyToGameObject = new Map<number, GameObject>();

  get ready(): boolean {
    return this.api !== null;
  }

  get Jolt(): JoltApi {
    return this.required(this.api);
  }

  get bodyInterface(): JoltBodyInterface {
    return this.required(this.bodies);
  }

  get physicsSystem(): JoltPhysicsSystem {
    return this.required(this.system);
  }

  load(): Promise<void> {
    this.loading ??= this.initialise();
    return this.loading;
  }

  step(dt: number): void {
    this.required(this.jolt).Step(dt, 1);
  }

  /** Links a body to its object so contacts reach the components. */
  register(body: JoltBody, gameObject: GameObject): void {
    this.bodyToGameObject.set(body.GetID().GetIndexAndSequenceNumber(), gameObject);
  }

  /** Drops the link and frees the body. */
  unregister(body: JoltBody): void {
    const id = body.GetID();
    this.bodyToGameObject.delete(id.GetIndexAndSequenceNumber());
    this.bodyInterface.RemoveBody(id);
    this.bodyInterface.DestroyBody(id);
  }

  private required<T>(value: T | null): T {
    if (value === null) throw new Error('JoltPhysics: load() has not resolved yet');
    return value;
  }

  private async initialise(): Promise<void> {
    const started = this.window.performance.now();
    const Jolt = await initJolt();
    const objectFilter = new Jolt.ObjectLayerPairFilterTable(NUM_OBJECT_LAYERS);
    objectFilter.EnableCollision(LAYER_NON_MOVING, LAYER_MOVING);
    objectFilter.EnableCollision(LAYER_MOVING, LAYER_MOVING);
    const broadPhase = new Jolt.BroadPhaseLayerInterfaceTable(
      NUM_OBJECT_LAYERS,
      NUM_BROAD_PHASE_LAYERS,
    );
    broadPhase.MapObjectToBroadPhaseLayer(LAYER_NON_MOVING, new Jolt.BroadPhaseLayer(0));
    broadPhase.MapObjectToBroadPhaseLayer(LAYER_MOVING, new Jolt.BroadPhaseLayer(1));
    const settings = new Jolt.JoltSettings();
    settings.mObjectLayerPairFilter = objectFilter;
    settings.mBroadPhaseLayerInterface = broadPhase;
    settings.mObjectVsBroadPhaseLayerFilter = new Jolt.ObjectVsBroadPhaseLayerFilterTable(
      broadPhase,
      NUM_BROAD_PHASE_LAYERS,
      objectFilter,
      NUM_OBJECT_LAYERS,
    );
    const jolt = new Jolt.JoltInterface(settings);
    Jolt.destroy(settings);
    this.system = jolt.GetPhysicsSystem();
    this.bodies = this.system.GetBodyInterface();
    this.jolt = jolt;
    this.api = Jolt;
    this.installContactListener(Jolt, this.system);
    this.loadMs = this.window.performance.now() - started;
  }

  private installContactListener(Jolt: JoltApi, system: JoltPhysicsSystem): void {
    const listener = new Jolt.ContactListenerJS();
    listener.OnContactValidate = (): number => 0;
    listener.OnContactAdded = (body1: number, body2: number): void => {
      const go1 = this.objectOf(Jolt, body1);
      const go2 = this.objectOf(Jolt, body2);
      if (!go1 || !go2) return;
      go1.dispatchCollisionEnter(go2);
      go2.dispatchCollisionEnter(go1);
    };
    listener.OnContactPersisted = (): void => undefined;
    listener.OnContactRemoved = (): void => undefined;
    system.SetContactListener(listener);
  }

  private objectOf(Jolt: JoltApi, bodyPointer: number): GameObject | undefined {
    const body = Jolt.wrapPointer(bodyPointer, Jolt.Body);
    return this.bodyToGameObject.get(body.GetID().GetIndexAndSequenceNumber());
  }
}
