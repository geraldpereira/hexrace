import { ChangeDetectionStrategy, Component, type OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Vec2 } from '@hexrace/commons';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import {
  BodyComponent,
  CameraComponent,
  LightComponent,
  MeshComponent,
  type GameObject,
} from '@hexrace/engine';
import { CanvasFrame, type DebugFolder } from '@hexrace/hud';
import {
  Environments,
  TileBodies,
  TileMeshes,
  TilePaths,
  TileSurfaces,
  TileTriangles,
  TileValidation,
  UNIT_METERS,
  Units,
} from '@hexrace/tile';

import { PhysicsLab, labPanel } from '@ui/lab/lab-scene';
import { type ProbeReadout, TileDraft, probeReadout } from '@ui/lab/tile/tile-draft';

const HEADINGS = {
  north: 0,
  'north-east': 1,
  'south-east': 2,
  south: 3,
  'south-west': 4,
  'north-west': 5,
};
const EXITS = {
  '12 h, straight': 12,
  '2 h, wide right': 2,
  '4 h, sharp right': 4,
  '8 h, sharp left': 8,
  '10 h, wide left': 10,
};

/**
 * The tile showcase: one tile built from the draft the debug panel edits, its mesh and its Jolt
 * collider rebuilt on every change, a free camera, the surface the model reads under the pointer,
 * and crates to drop on the collider (plan de construction 2.5).
 */
@Component({
  selector: 'hr-tile-showcase',
  imports: [RouterLink, CanvasFrame],
  template: `
    <main>
      <header>
        <a routerLink="/lab">← lab</a>
        <h1>tile</h1>
        <p [class.error]="errors().length > 0">{{ status() }}</p>
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
    p.error {
      color: var(--hr-danger, #ff5a5a);
      opacity: 1;
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
export class TileShowcase extends PhysicsLab implements OnInit {
  readonly draft = new TileDraft();
  readonly errors = signal<string[]>([]);
  readonly status = signal('Loading the physics…');
  readonly probe: ProbeReadout = probeReadout(null);

  private readonly environments = inject(Environments);
  private readonly validation = inject(TileValidation);
  private readonly paths = inject(TilePaths);
  private readonly units = inject(Units);
  private readonly surfaces = inject(TileSurfaces);
  private readonly triangles = inject(TileTriangles);
  private readonly meshes = inject(TileMeshes);
  private readonly bodies = inject(TileBodies);

  private readonly eye = this.scene.spawn('camera', CameraComponent).getOrThrow(CameraComponent);
  private readonly controls = new OrbitControls(this.eye.camera, this.canvas);
  private tile: GameObject | null = null;
  private tileMesh: THREE.Mesh | null = null;

  constructor() {
    super();
    this.camera = this.eye;
    this.eye.camera.position.set(0, 22, 32);
    this.controls.target.set(0, 2, 0);
    this.scene.spawn('sun', LightComponent);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    labPanel(
      'Tile',
      (f: DebugFolder) => this.buildFolder(f),
      () => {
        this.canvas.removeEventListener('pointermove', this.onPointerMove);
        this.controls.dispose();
        this.leave();
      },
    );
  }

  /** Throws the current tile away and builds the draft again, mesh and collider. */
  rebuild(): void {
    if (!this.physics.ready) return;
    this.tile?.destroy();
    this.errors.set(this.draft.errors(this.validation, this.paths));
    this.status.set(
      this.errors().length > 0 ? this.errors().join(' · ') : 'The model accepts the tile.',
    );
    const build = this.draft.build(this.paths, this.units);
    const triangles = this.triangles.build(build);
    const environment = this.environments.of(this.draft.environment);
    const mesh = this.meshes.mesh(build, environment, this.draft.smooth, triangles);
    const group = new THREE.Group();
    group.add(mesh);
    if (this.draft.outline) group.add(this.meshes.outline(build.sweep));
    const meshComponent = this.scene.instantiate(MeshComponent);
    meshComponent.object = group;
    const bodyComponent = this.scene.instantiate(BodyComponent);
    bodyComponent.body = this.bodies.create(triangles);
    this.tile = this.scene
      .spawn('tile')
      .add(meshComponent)
      .gameObject.add(bodyComponent).gameObject;
    this.tileMesh = mesh;
  }

  ngOnInit(): void {
    this.load();
  }

  protected start(): void {
    this.rebuild();
  }

  protected render(dt: number): void {
    this.frame(dt);
    this.controls.update();
    this.renderer.render(this.eye.camera);
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.tileMesh) return;
    const rect = this.canvas.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
      -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1,
    );
    this.eye.camera.updateMatrixWorld();
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, this.eye.camera);
    const hit = raycaster.intersectObject(this.tileMesh)[0];
    if (!hit) return;
    const plane = new Vec2(hit.point.x / UNIT_METERS, -hit.point.z / UNIT_METERS);
    const surface = this.surfaces.at(this.draft.sweep(this.paths), plane, this.draft.obstacles());
    Object.assign(this.probe, probeReadout(surface));
  };

  private buildFolder(folder: DebugFolder): void {
    const d = this.draft;
    const rebuild = (): void => {
      this.rebuild();
    };
    folder
      .add(d, 'environment', [...this.environments.ids])
      .name('Environment')
      .onChange(rebuild);
    folder.add(d, 'heading', HEADINGS).name('Heading').onChange(rebuild);
    folder.add(d, 'exit', EXITS).name('Exit face').onChange(rebuild);
    folder.add(d, 'transitionExtent', 0.1, 1, 0.05).name('Transition extent').onChange(rebuild);
    folder.add(d, 'smooth').name('Smooth shading').onChange(rebuild);
    folder.add(d, 'outline').name('Hexagon outline').onChange(rebuild);
    folder.add(d, 'line').name('Chequered line').onChange(rebuild);
    this.profileFolder(folder.addFolder('Entry profile'), d.entry, rebuild);
    this.profileFolder(folder.addFolder('Exit profile'), d.exitProfile, rebuild);
    const slopes = folder.addFolder('Slopes (from the neighbours)');
    slopes.add(d, 'entrySlope', -0.15, 0.15, 0.005).name('Entry slope').onChange(rebuild);
    slopes.add(d, 'exitSlope', -0.15, 0.15, 0.005).name('Exit slope').onChange(rebuild);
    const obstacles = folder.addFolder('Obstacles');
    for (const key of ['leftBarrier', 'rightBarrier', 'hazard', 'ramp', 'patch'] as const) {
      obstacles.add(d, key).onChange(rebuild);
    }
    const probe = folder.addFolder('Under the pointer');
    probe.add(this.probe, 'zone').name('Zone').listen().disable();
    probe.add(this.probe, 'type').name('Type').listen().disable();
    probe.add(this.probe, 's').name('Axis s').listen().disable();
    probe.add(this.probe, 'offset').name('Offset (units)').listen().disable();
    folder.add({ drop: () => this.dropCrate(8) }, 'drop').name('Drop a crate');
    folder.add({ clear: () => this.clearCrates() }, 'clear').name('Clear crates');
  }

  private profileFolder(
    folder: DebugFolder,
    profile: TileDraft['entry'],
    rebuild: () => void,
  ): void {
    folder.add(profile, 'position', 0, 7, 1).onChange(rebuild);
    folder.add(profile, 'roadWidth', 1, 5, 1).name('Road width').onChange(rebuild);
    folder.add(profile, 'leftShoulder', [0, 1]).name('Left shoulder').onChange(rebuild);
    folder.add(profile, 'rightShoulder', [0, 1]).name('Right shoulder').onChange(rebuild);
    folder.add(profile, 'height', 0, 60, 1).name('Height (steps)').onChange(rebuild);
    folder.add(profile, 'road', [1, 2, 3]).name('Road type').onChange(rebuild);
    folder.add(profile, 'shoulder', [1, 2, 3]).name('Shoulder type').onChange(rebuild);
    folder.add(profile, 'landscape', [1, 2]).name('Landscape type').onChange(rebuild);
  }
}
