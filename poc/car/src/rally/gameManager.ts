import * as THREE from 'three';
import type { Debug } from '../engine/debug/debug';
import { installGuiExport } from '../engine/debug/debugExport';
import { installGuiPersistence } from '../engine/debug/debugPersistence';
import { Physics } from '../engine/physics';
import { SceneRenderer } from '../engine/sceneRenderer';
import { GameObject } from '../engine/gameObject';
import { PerspectiveCameraComponent } from '../engine/components';
import { createInput } from '../engine/input/input';
import { CameraFollowBehavior, createCamera } from './rendering/camera';
import { createSun } from './rendering/sun';
import { createHud } from './rendering/hud';
import { TerrainData, createTerrain } from './terrain/terrain';
import { createCar } from './car/car';
import { createEngineSound } from './car/engineSound';
import { createSkidMarks } from './rendering/skidMarks';
import { ScoreComponent } from './score';
import { BonusSpawnerBehavior } from './bonus';

/** Top-level scene orchestrator built on top of Jolt. */
export class GameManager {
    public readonly physics: Physics;
    public readonly sceneRenderer = new SceneRenderer();
    public readonly root = new GameObject('root');

    private constructor(physics: Physics) {
        this.physics = physics;
    }

    static async create(debug?: Debug): Promise<GameManager> {
        const physics = await Physics.create();
        const manager = new GameManager(physics);
        manager.buildScene();
        if (debug) {
            manager.root.registerDebugAll(debug.gui);
            installGuiExport(debug.gui);
            installGuiPersistence(debug.gui);
        }
        manager.root.startAll();
        return manager;
    }

    private buildScene(): void {
        const scene = this.sceneRenderer.scene;
        scene.add(new THREE.AmbientLight(0xffffff, 0.4));

        // Input first — its fixedUpdate must run before any consumer in the DFS.
        this.root.addChild(createInput());

        const terrainGO = this.root.addChild(createTerrain(this.physics, scene, { amplitude: 0.8 }));
        const terrain = terrainGO.getOrThrow(TerrainData);

        const carGO = this.root.addChild(createCar(this.physics, scene, terrain));

        this.root.addChild(createSun(scene, carGO));
        this.root.addChild(createCamera(carGO));
        this.root.addChild(createHud());
        this.root.addChild(createEngineSound());
        this.root.addChild(createSkidMarks(scene));

        this.root.addChild(new GameObject('score', [new ScoreComponent()]));
        this.root.addChild(
            new GameObject('bonusSpawner', [new BonusSpawnerBehavior(this.physics, scene)]),
        );
    }

    public fixedUpdate(): void {
        this.root.fixedUpdate();
        this.physics.step();
    }

    public render(dt: number): void {
        this.root.render(dt);
        const camera = this.root
            .findInChildren(CameraFollowBehavior)
            ?.gameObject.getOrThrow(PerspectiveCameraComponent).camera;
        if (camera) this.sceneRenderer.render(camera);
    }
}
