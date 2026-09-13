import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type OnInit,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import * as THREE from 'three';

import { Random } from '@hexrace/commons';
import {
  BodyComponent,
  CameraComponent,
  FIXED_TIMESTEP,
  GameLoop,
  LightComponent,
  MeshComponent,
  JoltPhysics,
  Scenes,
  ThreeRenderer,
  type GameObject,
} from '@hexrace/engine';
import { CanvasFrame, DebugPanel, PerfMeter, type DebugFolder, type FrameSize } from '@hexrace/hud';

import { boxBody, type BoxSpec } from '@ui/lab/engine/box-body';

const GROUND_HALF = new THREE.Vector3(20, 0.5, 20);
const DROP_HEIGHT = 8;
const SPREAD = 4;

/** What the Engine folder reads: the wasm's start-up cost and how many bodies are in the world. */
class EngineReadout {
  wasmMs = 0;
  bodies = 0;
}

/**
 * The engine showcase: one scene with a ground, a sun, a camera and crates dropped from the debug
 * panel, run by the fixed-step loop and drawn in the shared canvas. This is where the wasm's weight
 * and start-up time get measured on a phone (technical spec 1.4), and where the loop's step and
 * frame times feed the performance meter.
 */
@Component({
  selector: 'hr-engine-showcase',
  imports: [RouterLink, CanvasFrame],
  template: `
    <main>
      <header>
        <a routerLink="/lab">← lab</a>
        <h1>engine</h1>
        <p>{{ status() }}</p>
      </header>
      <div class="frame">
        <hr-canvas-frame [canvas]="canvas" (resized)="onResized($event)" />
      </div>
    </main>
  `,
  styles: `
    main {
      display: flex;
      flex-direction: column;
      height: 100vh;
      padding: 1rem;
      box-sizing: border-box;
      gap: 0.5rem;
    }
    header a {
      font-size: 0.9rem;
    }
    h1 {
      margin: 0.2rem 0;
    }
    p {
      margin: 0;
      font-size: 0.85rem;
      opacity: 0.7;
    }
    .frame {
      flex: 1;
      min-height: 0;
      border-radius: 0.5rem;
      overflow: hidden;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EngineShowcase implements OnInit {
  readonly status = signal('Loading the physics…');

  private readonly renderer = inject(ThreeRenderer);
  readonly canvas = this.renderer.canvas;

  private readonly readout = new EngineReadout();
  private readonly physics = inject(JoltPhysics);
  private readonly loop = inject(GameLoop);
  private readonly meter = inject(PerfMeter);
  private readonly random = inject(Random).fresh();
  private readonly scene = inject(Scenes).create();
  private readonly crates: GameObject[] = [];
  private camera: CameraComponent | null = null;
  private alive = true;

  constructor() {
    inject(DebugPanel).register(
      'Engine',
      (f: DebugFolder) => this.buildFolder(f),
      inject(DestroyRef),
    );
    inject(DebugPanel).show();
    inject(DestroyRef).onDestroy(() => {
      this.alive = false;
      this.loop.stop();
      this.scene.destroy();
    });
  }

  ngOnInit(): void {
    void this.physics.load().then(() => {
      this.build();
    });
  }

  onResized(size: FrameSize): void {
    this.renderer.resize(size.width, size.height);
    this.camera?.setAspect(size.width, size.height);
  }

  private build(): void {
    if (!this.alive) return;
    this.readout.wasmMs = Math.round(this.physics.loadMs);
    this.status.set(
      `Physics ready in ${this.readout.wasmMs} ms. Drop crates from the Engine folder.`,
    );
    this.addBox(
      'ground',
      { half: GROUND_HALF, position: new THREE.Vector3(0, -0.5, 0), moving: false },
      0x556b2f,
    );
    this.scene.spawn('sun', LightComponent);
    const camera = this.scene.spawn('camera', CameraComponent).getOrThrow(CameraComponent);
    camera.camera.position.set(0, 10, 18);
    camera.camera.lookAt(0, 1, 0);
    camera.setAspect(this.renderer.width, this.renderer.height);
    this.camera = camera;
    this.dropCrate();
    this.scene.start();
    this.loop.start({
      fixedUpdate: () => {
        this.scene.fixedUpdate();
        this.physics.step(FIXED_TIMESTEP);
      },
      render: (dt: number) => this.render(dt, camera),
    });
  }

  private render(dt: number, camera: CameraComponent): void {
    this.scene.render(dt);
    this.meter.step(this.loop.stepMs);
    this.meter.frame(performance.now());
    this.readout.bodies = this.physics.physicsSystem.GetNumBodies();
    this.renderer.render(camera.camera);
  }

  private dropCrate(): void {
    if (!this.physics.ready) return;
    const half = new THREE.Vector3(0.5, 0.5, 0.5).multiplyScalar(0.6 + this.random.next());
    const position = new THREE.Vector3(
      (this.random.next() - 0.5) * SPREAD,
      DROP_HEIGHT,
      (this.random.next() - 0.5) * SPREAD,
    );
    const hue = this.random.next();
    const crate = this.addBox(
      'crate',
      { half, position, moving: true },
      new THREE.Color().setHSL(hue, 0.7, 0.55).getHex(),
    );
    this.crates.push(crate);
  }

  private clearCrates(): void {
    for (const crate of this.crates) crate.destroy();
    this.crates.length = 0;
  }

  private addBox(name: string, spec: BoxSpec, colour: number): GameObject {
    const go = this.scene.spawn(name);
    const mesh = this.scene.instantiate(MeshComponent);
    const geometry = new THREE.BoxGeometry(spec.half.x * 2, spec.half.y * 2, spec.half.z * 2);
    mesh.object = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: colour }));
    mesh.object.castShadow = spec.moving;
    mesh.object.receiveShadow = true;
    go.add(mesh);
    const body = this.scene.instantiate(BodyComponent);
    body.body = boxBody(this.physics, spec);
    go.add(body);
    return go;
  }

  private buildFolder(folder: DebugFolder): void {
    folder.add(this.readout, 'wasmMs').name('Wasm start-up (ms)').listen().disable();
    folder.add(this.readout, 'bodies').name('Bodies').listen().disable();
    folder.add({ drop: () => this.dropCrate() }, 'drop').name('Drop a crate');
    folder.add({ clear: () => this.clearCrates() }, 'clear').name('Clear crates');
  }
}
