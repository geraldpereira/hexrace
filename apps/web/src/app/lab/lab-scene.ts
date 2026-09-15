import { DestroyRef, inject } from '@angular/core';
import * as THREE from 'three';

import { type FollowCamera } from '@hexrace/camera';
import { Random } from '@hexrace/commons';
import {
  BodyComponent,
  CameraComponent,
  FIXED_TIMESTEP,
  GameLoop,
  type GameObject,
  type JoltBody,
  JoltPhysics,
  MeshComponent,
  Scenes,
  ThreeRenderer,
} from '@hexrace/engine';
import { DebugPanel, type DebugFolder, type FrameSize, PerfMeter } from '@hexrace/hud';

import { LabBodies } from '@ui/lab/lab-bodies';

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
  protected readonly bodies = inject(LabBodies);
  private readonly debugPanel = inject(DebugPanel);
  private readonly ownDestroyRef = inject(DestroyRef);
  protected readonly crates: GameObject[] = [];
  protected camera: CameraComponent | null = null;
  private alive = true;

  protected load(): void {
    this.meter.cornerVisible.set(true);
    void this.physics.load().then(() => {
      if (this.alive) this.begin();
    });
  }

  onResized(size: FrameSize): void {
    this.renderer.resize(size.width, size.height);
    this.camera?.setAspect(size.width, size.height);
  }

  /** Puts the page's folder in the debug panel, shown, and takes it away when the page is left. */
  protected showPanel(title: string, build: (folder: DebugFolder) => void): void {
    this.debugPanel.register(title, build, this.ownDestroyRef);
    this.debugPanel.show();
  }

  /** The scene's camera, driven by `follow` and sized to the canvas: what a driving page renders through. */
  protected followCamera(follow: FollowCamera): CameraComponent {
    const object = this.scene.spawn('camera', CameraComponent);
    object.add(follow);
    const eye = object.getOrThrow(CameraComponent);
    this.camera = eye;
    eye.setAspect(this.renderer.width, this.renderer.height);
    return eye;
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
  protected dropCrate(spread: number, over = new THREE.Vector3()): void {
    if (!this.physics.ready) return;
    const half = new THREE.Vector3(CRATE_HALF, CRATE_HALF, CRATE_HALF).multiplyScalar(
      0.6 + this.random.next(),
    );
    const position = new THREE.Vector3(
      over.x + (this.random.next() - 0.5) * spread,
      over.y + DROP_HEIGHT,
      over.z + (this.random.next() - 0.5) * spread,
    );
    const colour = new THREE.Color().setHSL(this.random.next(), 0.7, 0.55).getHex();
    this.crates.push(
      this.bodies.spawn(this.scene, 'crate', { half, position, moving: true }, colour),
    );
  }

  /** A scene object carrying a mesh and a body: what every solid of a showcase is made of. */
  protected solid(name: string, object: THREE.Object3D, body: JoltBody): GameObject {
    const mesh = this.scene.instantiate(MeshComponent);
    mesh.object = object;
    const attached = this.scene.instantiate(BodyComponent);
    attached.body = body;
    return this.scene.spawn(name).add(mesh).gameObject.add(attached).gameObject;
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
