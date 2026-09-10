import type * as THREE from 'three';
import type initJolt from 'jolt-physics';
import { Component } from './gameObject';
import type { Physics } from './physics';

type JoltAPI = Awaited<ReturnType<typeof initJolt>>;
type JoltBody = InstanceType<JoltAPI['Body']>;

export class MeshComponent extends Component {
    constructor(
        private readonly scene: THREE.Scene,
        public readonly object: THREE.Object3D,
    ) {
        super();
        scene.add(object);
    }

    override onDestroy(): void {
        this.scene.remove(this.object);
    }
}

/** Wraps a Jolt body so the owning GameObject is registered for collision dispatch and the body is freed on destroy. */
export class BodyComponent extends Component {
    constructor(
        private readonly physics: Physics,
        public readonly body: JoltBody,
    ) {
        super();
    }

    override awake(): void {
        this.physics.register(this.body, this.gameObject);
    }

    override onDestroy(): void {
        this.physics.unregister(this.body);
    }
}

export class PerspectiveCameraComponent extends Component {
    constructor(public readonly camera: THREE.PerspectiveCamera) {
        super();
    }
}

export class DirectionalLightComponent extends Component {
    constructor(
        private readonly scene: THREE.Scene,
        public readonly light: THREE.DirectionalLight,
    ) {
        super();
        scene.add(light);
        // Three uses light.target.matrixWorld to orient the shadow camera; adding
        // the target to the scene ensures its matrix is updated each frame.
        scene.add(light.target);
    }

    override onDestroy(): void {
        this.scene.remove(this.light);
        this.scene.remove(this.light.target);
    }
}
