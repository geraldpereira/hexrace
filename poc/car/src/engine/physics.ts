import initJolt from 'jolt-physics';
import type { GameObject } from './gameObject';

export const PHYSICS_TIMESTEP = 1 / 60;

// Two object layers (static ground / dynamic bodies) — shared by every body
// we create, exposed so factories don't have to redeclare the constants.
export const LAYER_NON_MOVING = 0;
export const LAYER_MOVING = 1;
const NUM_OBJECT_LAYERS = 2;
const NUM_BROAD_PHASE_LAYERS = 2;

type JoltAPI = Awaited<ReturnType<typeof initJolt>>;
type JoltInterface = InstanceType<JoltAPI['JoltInterface']>;
type PhysicsSystem = InstanceType<JoltAPI['PhysicsSystem']>;
type BodyInterface = ReturnType<PhysicsSystem['GetBodyInterface']>;
type JoltBody = InstanceType<JoltAPI['Body']>;

/**
 * Engine-level Jolt wrapper. Owns the `JoltInterface`, the `PhysicsSystem`
 * and the body→GameObject map used by the ContactListener to dispatch
 * `onCollisionEnter` to game code. Construction is async because Jolt's
 * WASM is loaded lazily (`await initJolt()`).
 */
export class Physics {
    public readonly Jolt: JoltAPI;
    public readonly jolt: JoltInterface;
    public readonly physicsSystem: PhysicsSystem;
    public readonly bodyInterface: BodyInterface;

    private readonly bodyToGameObject = new Map<number, GameObject>();
    // Stored on the instance so Jolt's WASM side keeps a live reference; the
    // JS-side listener would otherwise be garbage-collected.
    public contactListener: InstanceType<JoltAPI['ContactListenerJS']> | null = null;

    private constructor(Jolt: JoltAPI, jolt: JoltInterface) {
        this.Jolt = Jolt;
        this.jolt = jolt;
        this.physicsSystem = jolt.GetPhysicsSystem();
        this.bodyInterface = this.physicsSystem.GetBodyInterface();
    }

    static async create(): Promise<Physics> {
        const Jolt = await initJolt();

        const objectFilter = new Jolt.ObjectLayerPairFilterTable(NUM_OBJECT_LAYERS);
        objectFilter.EnableCollision(LAYER_NON_MOVING, LAYER_MOVING);
        objectFilter.EnableCollision(LAYER_MOVING, LAYER_MOVING);

        const bpNonMoving = new Jolt.BroadPhaseLayer(0);
        const bpMoving = new Jolt.BroadPhaseLayer(1);
        const bpInterface = new Jolt.BroadPhaseLayerInterfaceTable(
            NUM_OBJECT_LAYERS,
            NUM_BROAD_PHASE_LAYERS,
        );
        bpInterface.MapObjectToBroadPhaseLayer(LAYER_NON_MOVING, bpNonMoving);
        bpInterface.MapObjectToBroadPhaseLayer(LAYER_MOVING, bpMoving);

        const settings = new Jolt.JoltSettings();
        settings.mObjectLayerPairFilter = objectFilter;
        settings.mBroadPhaseLayerInterface = bpInterface;
        settings.mObjectVsBroadPhaseLayerFilter = new Jolt.ObjectVsBroadPhaseLayerFilterTable(
            settings.mBroadPhaseLayerInterface,
            NUM_BROAD_PHASE_LAYERS,
            settings.mObjectLayerPairFilter,
            NUM_OBJECT_LAYERS,
        );

        const jolt = new Jolt.JoltInterface(settings);
        Jolt.destroy(settings);

        const physics = new Physics(Jolt, jolt);
        physics.installContactListener();
        return physics;
    }

    /** Bind a Jolt body to the owning GameObject so collision events can dispatch back to game code. */
    register(body: JoltBody, gameObject: GameObject): void {
        this.bodyToGameObject.set(body.GetID().GetIndexAndSequenceNumber(), gameObject);
    }

    /** Drop the body-to-GO link and free the Jolt body. Call this from the owning component's onDestroy. */
    unregister(body: JoltBody): void {
        const id = body.GetID();
        this.bodyToGameObject.delete(id.GetIndexAndSequenceNumber());
        this.bodyInterface.RemoveBody(id);
        this.bodyInterface.DestroyBody(id);
    }

    step(): void {
        // 1 collision sub-step per fixed update. Bump to 2 if we ever ship a
        // mode that lets the frame time drop, like the Jolt example does.
        this.jolt.Step(PHYSICS_TIMESTEP, 1);
    }

    private installContactListener(): void {
        const Jolt = this.Jolt;
        const listener = new Jolt.ContactListenerJS();
        const dispatch = (body1Ptr: number, body2Ptr: number): void => {
            const b1 = Jolt.wrapPointer(body1Ptr, Jolt.Body);
            const b2 = Jolt.wrapPointer(body2Ptr, Jolt.Body);
            const k1 = b1.GetID().GetIndexAndSequenceNumber();
            const k2 = b2.GetID().GetIndexAndSequenceNumber();
            const go1 = this.bodyToGameObject.get(k1);
            const go2 = this.bodyToGameObject.get(k2);
            if (!go1 || !go2) return;
            go1.dispatchCollisionEnter(go2);
            go2.dispatchCollisionEnter(go1);
        };
        // OnContactAdded fires once per new contact pair (collision-started
        // semantics). Persisted and removed events aren't needed yet; the JS
        // binding requires these slots to exist on the listener object.
        // 0 = AcceptAllContactsForThisBodyPair. The other slots are required
        // by the JS binding but we don't need their events.
        listener.OnContactValidate = (): number => 0;
        listener.OnContactAdded = dispatch;
        listener.OnContactPersisted = (): void => undefined;
        listener.OnContactRemoved = (): void => undefined;
        this.physicsSystem.SetContactListener(listener);
        this.contactListener = listener;
    }
}
