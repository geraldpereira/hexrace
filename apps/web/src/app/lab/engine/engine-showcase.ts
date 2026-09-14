import { ChangeDetectionStrategy, Component, type OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import * as THREE from 'three';

import { CameraComponent, LightComponent } from '@hexrace/engine';
import { CanvasFrame, type DebugFolder } from '@hexrace/hud';

import { PhysicsLab, labPanel } from '@ui/lab/lab-scene';

const GROUND_HALF = new THREE.Vector3(20, 0.5, 20);
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
export class EngineShowcase extends PhysicsLab implements OnInit {
  readonly status = signal('Loading the physics…');

  private readonly readout = new EngineReadout();

  constructor() {
    super();
    labPanel(
      'Engine',
      (f: DebugFolder) => this.buildFolder(f),
      () => this.leave(),
    );
  }

  ngOnInit(): void {
    this.load();
  }

  protected start(): void {
    this.readout.wasmMs = Math.round(this.physics.loadMs);
    this.status.set(
      `Physics ready in ${this.readout.wasmMs} ms. Drop crates from the Engine folder.`,
    );
    const ground = { half: GROUND_HALF, position: new THREE.Vector3(0, -0.5, 0), moving: false };
    this.bodies.spawn(this.scene, 'ground', ground, 0x556b2f);
    this.scene.spawn('sun', LightComponent);
    const camera = this.scene.spawn('camera', CameraComponent).getOrThrow(CameraComponent);
    camera.camera.position.set(0, 10, 18);
    camera.camera.lookAt(0, 1, 0);
    camera.setAspect(this.renderer.width, this.renderer.height);
    this.camera = camera;
    this.dropCrate(SPREAD);
  }

  protected render(dt: number): void {
    this.frame(dt);
    this.readout.bodies = this.physics.physicsSystem.GetNumBodies();
    this.renderer.render(this.camera!.camera);
  }

  private buildFolder(folder: DebugFolder): void {
    folder.add(this.readout, 'wasmMs').name('Wasm start-up (ms)').listen().disable();
    folder.add(this.readout, 'bodies').name('Bodies').listen().disable();
    folder.add({ drop: () => this.dropCrate(SPREAD) }, 'drop').name('Drop a crate');
    folder.add({ clear: () => this.clearCrates() }, 'clear').name('Clear crates');
  }
}
