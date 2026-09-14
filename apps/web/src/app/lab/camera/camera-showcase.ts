import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import * as THREE from 'three';

import { CameraTuning, FollowCamera } from '@hexrace/camera';
import { Maths } from '@hexrace/commons';
import {
  CameraComponent,
  FIXED_TIMESTEP,
  GameLoop,
  LightComponent,
  MeshComponent,
  Scenes,
  ThreeRenderer,
} from '@hexrace/engine';
import { Inputs, TouchSource } from '@hexrace/inputs';
import {
  CanvasFrame,
  PerfMeter,
  TouchPaddles,
  type DebugFolder,
  type FrameSize,
} from '@hexrace/hud';

import { Dummy } from '@ui/lab/camera/dummy';
import { labPanel } from '@ui/lab/lab-scene';

const GROUND_SIZE = 400;

/**
 * The camera showcase: a dummy driven with the stick or the keys on a gridded ground, the follow
 * camera behind it, every knob of `CameraTuning` in the debug panel, and a ring standing for the
 * next tile whose bearing and distance the panel sets, to judge the lean (functional spec 3.9).
 */
@Component({
  selector: 'hr-camera-showcase',
  imports: [RouterLink, CanvasFrame, TouchPaddles],
  template: `
    <main>
      <header>
        <a routerLink="/lab">← lab</a>
        <h1>camera</h1>
        <p>{{ speedKmh() }} km/h, heading {{ headingDeg() }}°. Drive with the stick or WASD.</p>
      </header>
      <div class="frame">
        <hr-canvas-frame [canvas]="canvas" (resized)="onResized($event)" />
      </div>
    </main>
    @if (showPaddles()) {
      <hr-touch-paddles [source]="touch" />
    }
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
      font-variant-numeric: tabular-nums;
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
export class CameraShowcase {
  readonly touch = inject(TouchSource);
  readonly speedKmh = signal(0);
  readonly headingDeg = signal(0);

  private readonly renderer = inject(ThreeRenderer);
  readonly canvas = this.renderer.canvas;

  private readonly document = inject(DOCUMENT);
  readonly showPaddles = signal(this.prefersTouch());

  private readonly inputs = inject(Inputs);
  private readonly maths = inject(Maths);
  private readonly loop = inject(GameLoop);
  private readonly meter = inject(PerfMeter);
  private readonly tuning = inject(CameraTuning);
  private readonly scene = inject(Scenes).create();
  private readonly dummy = this.scene.instantiate(Dummy);
  private readonly follow = this.scene.instantiate(FollowCamera);
  private readonly camera: CameraComponent;

  constructor() {
    this.addGround();
    this.scene.spawn('sun', LightComponent);
    const dummyMesh = this.scene.instantiate(MeshComponent);
    dummyMesh.object = this.dummy.object;
    this.scene.spawn('dummy').add(dummyMesh).gameObject.add(this.dummy);
    const cameraObject = this.scene.spawn('camera', CameraComponent);
    this.follow.target = this.dummy;
    cameraObject.add(this.follow);
    this.camera = cameraObject.getOrThrow(CameraComponent);
    this.camera.setAspect(this.renderer.width, this.renderer.height);
    this.scene.start();

    labPanel(
      'Camera',
      (f: DebugFolder) => this.buildFolder(f),
      () => {
        this.loop.stop();
        this.scene.destroy();
      },
    );
    this.loop.start({
      fixedUpdate: () => {
        this.inputs.poll(FIXED_TIMESTEP);
      },
      render: (dt: number) => this.render(dt),
    });
  }

  onResized(size: FrameSize): void {
    this.renderer.resize(size.width, size.height);
    this.camera.setAspect(size.width, size.height);
  }

  private render(dt: number): void {
    this.scene.render(dt);
    this.meter.step(this.loop.stepMs);
    this.meter.frame(performance.now());
    this.speedKmh.set(Math.round(this.maths.mpsToKmh(this.dummy.speed)));
    this.headingDeg.set(Math.round(this.maths.radToDeg(this.dummy.heading)));
    this.renderer.render(this.camera.camera);
  }

  private addGround(): void {
    const ground = new THREE.Group();
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
      new THREE.MeshStandardMaterial({ color: 0x556b2f }),
    );
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    const grid = new THREE.GridHelper(GROUND_SIZE, GROUND_SIZE / 10, 0x8fa860, 0x6b7f3f);
    grid.position.y = 0.01;
    ground.add(plane, grid);
    const mesh = this.scene.instantiate(MeshComponent);
    mesh.object = ground;
    this.scene.spawn('ground').add(mesh);
  }

  private buildFolder(folder: DebugFolder): void {
    const t = this.tuning;
    folder.add(t, 'distance', 2, 30, 0.5).name('Distance (m)');
    folder.add(t, 'heightAtRest', 1, 30, 0.5).name('Height at rest (m)');
    folder.add(t, 'heightAtSpeed', 1, 40, 0.5).name('Height at speed (m)');
    folder.add(t, 'speedForFullHeight', 5, 80, 1).name('Full height at (m/s)');
    folder.add(t, 'lookAhead', 0, 30, 0.5).name('Look ahead (m)');
    folder.add(t, 'anticipation', 0, 1, 0.05).name('Next tile lean');
    folder.add(t, 'anticipationMaxDeg', 0, 90, 1).name('Lean cap (°)');
    folder.add(t, 'smoothing', 0.5, 20, 0.5).name('Smoothing (/s)');
    folder.add({ snap: () => this.follow.snap() }, 'snap').name('Snap camera');
    const d = this.dummy;
    const dummy = folder.addFolder('Dummy');
    dummy.add(d, 'nextTileKnown').name('Next tile known');
    dummy.add(d, 'nextTileBearingDeg', -120, 120, 5).name('Next tile bearing (°)');
    dummy.add(d, 'nextTileDistance', 5, 60, 1).name('Next tile distance (m)');
    dummy.add(d, 'maxSpeed', 5, 80, 1).name('Top speed (m/s)');
    dummy.add(d, 'turnRate', 0.2, 4, 0.1).name('Turn rate (rad/s)');
    dummy
      .add(
        {
          reset: () => {
            d.reset();
            this.follow.snap();
          },
        },
        'reset',
      )
      .name('Reset dummy');
  }

  private prefersTouch(): boolean {
    const view = this.document.defaultView as Window;
    return view.matchMedia('(pointer: coarse)').matches;
  }
}
