import * as THREE from 'three';
import { Component, GameObject } from '../../engine/gameObject';
import { DirectionalLightComponent, MeshComponent } from '../../engine/components';

export class SunFollowBehavior extends Component {
    private targetObject!: THREE.Object3D;
    private light!: THREE.DirectionalLight;

    constructor(
        public readonly target: GameObject,
        public readonly offset: THREE.Vector3,
    ) {
        super();
    }

    override start(): void {
        this.targetObject = this.target.getOrThrow(MeshComponent).object;
        this.light = this.gameObject.getOrThrow(DirectionalLightComponent).light;
    }

    override render(): void {
        const pos = this.targetObject.position;
        this.light.target.position.copy(pos);
        this.light.position.copy(pos).add(this.offset);
    }
}

export function createSun(scene: THREE.Scene, target: GameObject): GameObject {
    const offset = new THREE.Vector3(20, 30, 10);
    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.copy(offset);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.left = -25;
    light.shadow.camera.right = 25;
    light.shadow.camera.top = 25;
    light.shadow.camera.bottom = -25;
    light.shadow.camera.near = 10;
    light.shadow.camera.far = 80;

    return new GameObject('sun', [
        new DirectionalLightComponent(scene, light),
        new SunFollowBehavior(target, offset),
    ]);
}
