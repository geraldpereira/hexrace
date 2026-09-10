import * as THREE from 'three';
import type GUI from 'lil-gui';
import { Component, GameObject } from '../../engine/gameObject';
import { MeshComponent, PerspectiveCameraComponent } from '../../engine/components';

const tmpDesiredPos = new THREE.Vector3();
const tmpForward = new THREE.Vector3();
const tmpOffset = new THREE.Vector3();
const tmpYaw = new THREE.Quaternion();
const yAxis = new THREE.Vector3(0, 1, 0);

export class CameraFollowBehavior extends Component {
    offset = new THREE.Vector3(0, 4, -9);
    lerp = 4;

    private targetObject!: THREE.Object3D;
    private camera!: THREE.PerspectiveCamera;

    constructor(public readonly target: GameObject) {
        super();
    }

    override start(): void {
        // Read the target's visual transform rather than its physics body —
        // the DFS render order guarantees the target's render() ran first and
        // synced the mesh from the body.
        this.targetObject = this.target.getOrThrow(MeshComponent).object;
        this.camera = this.gameObject.getOrThrow(PerspectiveCameraComponent).camera;
    }

    override render(dt: number): void {
        const obj = this.targetObject;
        const camera = this.camera;

        tmpForward.set(0, 0, 1).applyQuaternion(obj.quaternion);
        const yawAngle = Math.atan2(tmpForward.x, tmpForward.z);
        tmpYaw.setFromAxisAngle(yAxis, yawAngle);

        tmpOffset.copy(this.offset).applyQuaternion(tmpYaw);
        tmpDesiredPos.copy(obj.position).add(tmpOffset);

        const lerpFactor = 1 - Math.exp(-this.lerp * dt);
        camera.position.lerp(tmpDesiredPos, lerpFactor);
        camera.lookAt(obj.position);
    }

    override registerDebug(gui: GUI): void {
        const folder = gui.addFolder('Camera');
        folder.add(this.offset, 'y', 1, 20, 0.5).name('Height');
        folder.add(this.offset, 'z', 2, 30, 0.5).name('Distance');
        folder.add(this, 'lerp', 0.5, 20, 0.1).name('Smoothing');
    }
}

export function createCamera(target: GameObject): GameObject {
    const camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        500,
    );
    camera.position.set(0, 8, 12);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });

    return new GameObject('camera', [
        new PerspectiveCameraComponent(camera),
        new CameraFollowBehavior(target),
    ]);
}
