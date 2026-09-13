import { DestroyRef, inject } from '@angular/core';
import * as THREE from 'three';

import { Random } from '@hexrace/commons';
import {
  BodyComponent,
  type CameraComponent,
  FIXED_TIMESTEP,
  GameLoop,
  type GameObject,
  JoltPhysics,
  MeshComponent,
  type Scene,
  Scenes,
  ThreeRenderer,
} from '@hexrace/engine';
import { DebugPanel, type DebugFolder, type FrameSize, PerfMeter } from '@hexrace/hud';

import { type BoxSpec, boxBody } from '@ui/lab/engine/box-body';

const CRATE_HALF = 0.4;
const DROP_HEIGHT = 8;

/** Registers the showcase's folder, shows the panel, and runs `cleanup` when the page is left. From a constructor. */
export function labPanel(
  title: string,
  build: (folder: DebugFolder) => void,
  cleanup: () => void,
): void {
  const panel = inject(DebugPanel);
  panel.register(title, build, inject(DestroyRef));
  panel.show();
  inject(DestroyRef).onDestroy(cleanup);
}

/** A box with a mesh and a Jolt body in one object of the scene: a ground when static, a crate when moving. */
export function spawnBox(
  scene: Scene,
  physics: JoltPhysics,
  name: string,
  spec: BoxSpec,
  colour: number,
): GameObject {
  const go = scene.spawn(name);
  const mesh = scene.instantiate(MeshComponent);
  const geometry = new THREE.BoxGeometry(spec.half.x * 2, spec.half.y * 2, spec.half.z * 2);
  mesh.object = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: colour }));
  mesh.object.castShadow = spec.moving;
  mesh.object.receiveShadow = true;
  go.add(mesh);
  const body = scene.instantiate(BodyComponent);
  body.body = boxBody(physics, spec);
  go.add(body);
  return go;
}

/**
 * What every showcase with physics shares: the renderer and its canvas, Jolt loaded on init, the
 * loop started the game way (the scene's fixed update, then the physics step, then the frame),
 * crates to drop on whatever the page builds, and the clean-up when the page is left. A subclass
 * builds its scene in `start`, once the wasm is there, and renders through `frame`; its
 * `ngOnInit` calls `load`, a plain base class carrying no Angular hook of its own.
 */
export abstract class PhysicsLab {
  protected readonly renderer = inject(ThreeRenderer);
  readonly canvas = this.renderer.canvas;

  protected readonly physics = inject(JoltPhysics);
  protected readonly loop = inject(GameLoop);
  protected readonly meter = inject(PerfMeter);
  protected readonly random = inject(Random).fresh();
  protected readonly scene = inject(Scenes).create();
  protected readonly crates: GameObject[] = [];
  protected camera: CameraComponent | null = null;
  private alive = true;

  protected load(): void {
    void this.physics.load().then(() => {
      if (this.alive) this.begin();
    });
  }

  onResized(size: FrameSize): void {
    this.renderer.resize(size.width, size.height);
    this.camera?.setAspect(size.width, size.height);
  }

  protected abstract start(): void;

  protected abstract render(dt: number): void;

  protected leave(): void {
    this.alive = false;
    this.loop.stop();
    this.scene.destroy();
  }

  protected frame(dt: number): void {
    this.scene.render(dt);
    this.meter.step(this.loop.stepMs);
    this.meter.frame(performance.now());
  }

  /** A crate of a random colour, dropped from above within `spread` metres of the centre. */
  protected dropCrate(spread: number): void {
    if (!this.physics.ready) return;
    const half = new THREE.Vector3(CRATE_HALF, CRATE_HALF, CRATE_HALF).multiplyScalar(
      0.6 + this.random.next(),
    );
    const position = new THREE.Vector3(
      (this.random.next() - 0.5) * spread,
      DROP_HEIGHT,
      (this.random.next() - 0.5) * spread,
    );
    const colour = new THREE.Color().setHSL(this.random.next(), 0.7, 0.55).getHex();
    this.crates.push(
      spawnBox(this.scene, this.physics, 'crate', { half, position, moving: true }, colour),
    );
  }

  protected clearCrates(): void {
    for (const crate of this.crates) crate.destroy();
    this.crates.length = 0;
  }

  private begin(): void {
    this.start();
    this.scene.start();
    this.loop.start({
      fixedUpdate: () => {
        this.scene.fixedUpdate();
        this.physics.step(FIXED_TIMESTEP);
      },
      render: (dt: number) => this.render(dt),
    });
  }
}
