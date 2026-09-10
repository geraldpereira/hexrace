import * as THREE from 'three';
import { Component, GameObject } from '../engine/gameObject';
import { BodyComponent, MeshComponent } from '../engine/components';
import { LAYER_NON_MOVING, type Physics } from '../engine/physics';
import { CarBehavior } from './car/carBehavior';
import { ScoreComponent } from './score';

const SIZE = 0.6;
const SPAWN_DISTANCE = 10;

const tmpForward = new THREE.Vector3();

export class BonusBehavior extends Component {
    value = 1;
    dead = false;
    private score: ScoreComponent | null = null;

    override start(): void {
        this.score = this.gameObject.findInScene(ScoreComponent) ?? null;
    }

    override onCollisionEnter(other: GameObject): void {
        if (this.dead) return;
        if (!other.get(CarBehavior)) return;
        if (this.score) this.score.points += this.value;
        this.dead = true;
    }

    override onDestroy(): void {
        const mesh = this.gameObject.get(MeshComponent)?.object as THREE.Mesh | undefined;
        if (!mesh) return;
        mesh.geometry.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) {
            for (const m of mat) m.dispose();
        } else {
            mat.dispose();
        }
    }
}

export class BonusSpawnerBehavior extends Component {
    constructor(
        private readonly physics: Physics,
        private readonly scene: THREE.Scene,
    ) {
        super();
    }

    override fixedUpdate(): void {
        const root = this.gameObject.getRoot();
        const bonuses = root.findAllInChildren(BonusBehavior);
        for (const b of bonuses) if (b.dead) b.gameObject.destroy();
        if (!root.findInChildren(BonusBehavior)) {
            const car = root.findInChildren(CarBehavior);
            if (!car) return;
            const newBonus = createBonus(this.physics, this.scene, car);
            root.addChild(newBonus);
            newBonus.startAll();
        }
    }
}

export function createBonus(
    physics: Physics,
    scene: THREE.Scene,
    car: CarBehavior,
): GameObject {
    // Pull position/orientation from the car's visual transform — the
    // CarBehavior already syncs it from the Jolt body each render tick.
    const carMesh = car.gameObject.getOrThrow(MeshComponent).object;
    tmpForward.set(0, 0, 1).applyQuaternion(carMesh.quaternion);
    tmpForward.y = 0;
    tmpForward.normalize();
    const x = carMesh.position.x + tmpForward.x * SPAWN_DISTANCE;
    const z = carMesh.position.z + tmpForward.z * SPAWN_DISTANCE;

    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(SIZE, SIZE, SIZE),
        new THREE.MeshStandardMaterial({
            color: 0xffd700,
            emissive: 0x553300,
            metalness: 0.6,
            roughness: 0.3,
        }),
    );
    mesh.castShadow = true;
    mesh.position.set(x, SIZE / 2, z);

    const Jolt = physics.Jolt;
    const shape = new Jolt.BoxShape(new Jolt.Vec3(SIZE / 2, SIZE / 2, SIZE / 2), 0.05);
    const bodySettings = new Jolt.BodyCreationSettings(
        shape,
        new Jolt.RVec3(x, SIZE / 2, z),
        new Jolt.Quat(0, 0, 0, 1),
        Jolt.EMotionType_Static,
        LAYER_NON_MOVING,
    );
    bodySettings.mIsSensor = true;
    const body = physics.bodyInterface.CreateBody(bodySettings);
    physics.bodyInterface.AddBody(body.GetID(), Jolt.EActivation_Activate);
    Jolt.destroy(bodySettings);

    return new GameObject('bonus', [
        new MeshComponent(scene, mesh),
        new BodyComponent(physics, body),
        new BonusBehavior(),
    ]);
}
