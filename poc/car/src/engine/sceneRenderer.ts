import * as THREE from 'three';

export class SceneRenderer {
    readonly scene: THREE.Scene;
    readonly renderer: THREE.WebGLRenderer;

    constructor() {
        const container = document.getElementById('app');
        if (!container) throw new Error('#app container not found');

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.Fog(0x87ceeb, 30, 120);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        window.addEventListener('resize', () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    render(camera: THREE.PerspectiveCamera): void {
        this.renderer.render(this.scene, camera);
    }
}
