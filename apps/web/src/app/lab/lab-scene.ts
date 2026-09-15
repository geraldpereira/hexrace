import { DestroyRef, inject } from '@angular/core';
import * as THREE from 'three';

import { Random } from '@hexrace/commons';
import {
  BodyComponent,
  type GameObject,
  type JoltBody,
  MeshComponent,
} from '@hexrace/engine';
import { DebugPanel, type DebugFolder } from '@hexrace/hud';

import { LabBodies } from '@ui/lab/lab-bodies';
import { ScenePage } from '@ui/scene/scene-page';

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
 * What a showcase adds to `ScenePage`: the developer's tools. The performance corner is lit and
 * the debug panel opened, because every lab page is there to be measured and tuned; crates are on
 * hand to drop on whatever the page builds. The game inherits none of it: it takes `ScenePage`
 * straight, which is why the two are separate classes rather than one with a flag.
 */
export abstract class PhysicsLab extends ScenePage {
  protected readonly random = inject(Random).fresh();
  protected readonly bodies = inject(LabBodies);
  private readonly debugPanel = inject(DebugPanel);
  private readonly ownDestroyRef = inject(DestroyRef);
  protected readonly crates: GameObject[] = [];

  protected override load(): void {
    this.meter.cornerVisible.set(true);
    super.load();
  }

  /** Puts the page's folder in the debug panel, shown, and takes it away when the page is left. */
  protected showPanel(title: string, build: (folder: DebugFolder) => void): void {
    this.debugPanel.register(title, build, this.ownDestroyRef);
    this.debugPanel.show();
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
}
