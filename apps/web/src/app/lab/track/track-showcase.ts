import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, type OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LightComponent, type GameObject } from '@hexrace/engine';
import { CanvasFrame, type DebugFolder, type FrameSize } from '@hexrace/hud';
import { type TileBuild, EnvironmentCatalog, TileTriangles, UNIT_METERS } from '@hexrace/tile';
import {
  type Placement,
  type PlayerPose,
  type Track,
  type TrackIssue,
  TrackBodies,
  TrackExamples,
  TrackFiles,
  TrackGenerator,
  TrackMeshes,
  TrackProfiles,
  TrackSweeps,
  TrackValidation,
  TrackWindow,
} from '@hexrace/track';
import * as THREE from 'three';

import { IssueList } from '@ui/lab/issue-list';
import { labPanel } from '@ui/lab/lab-scene';
import { OrbitLab } from '@ui/lab/orbit-lab';
import { TrackDraft } from '@ui/lab/track/track-draft';
import { TrackMap } from '@ui/lab/track/track-map';
import { type TrackPage, TrackPanel } from '@ui/lab/track/track-panel';

const CRATE_SPREAD = 2;

/**
 * The track showcase (plan de construction 2.6): the POC 2 in the real code. A track comes from an
 * example, from the text area or from a seed; it is laid, validated and built tile by tile, and
 * only the window around the player carries a mesh and a collider. The 2D map beside the frame
 * shows the placement at a glance, and crates dropped on the road prove the colliders.
 */
@Component({
  selector: 'hr-track-showcase',
  imports: [RouterLink, CanvasFrame, IssueList],
  templateUrl: './track-showcase.html',
  styleUrl: './track-showcase.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackShowcase extends OrbitLab implements OnInit, TrackPage {
  readonly draft = new TrackDraft();
  readonly issues = signal<readonly string[]>([]);
  readonly status = signal('Loading the physics…');
  readonly text = signal('');
  readonly mapCanvas = inject(DOCUMENT).createElement('canvas');

  private readonly environments = inject(EnvironmentCatalog);
  private readonly examples = inject(TrackExamples);
  private readonly files = inject(TrackFiles);
  private readonly generator = inject(TrackGenerator);
  private readonly painter = inject(TrackMap);
  private readonly panel = inject(TrackPanel);
  private readonly profiles = inject(TrackProfiles);
  private readonly sweeps = inject(TrackSweeps);
  private readonly trackBodies = inject(TrackBodies);
  private readonly trackMeshes = inject(TrackMeshes);
  private readonly triangles = inject(TileTriangles);
  private readonly validation = inject(TrackValidation);
  private readonly tiles = inject(TrackWindow);

  private readonly loaded = new Map<number, GameObject>();
  private environment = this.environments.of('europe');
  private shown: { track: Track; laid: Placement } | null = null;
  private builds: TileBuild[] = [];
  private faulty: ReadonlySet<number> = new Set<number>();

  constructor() {
    super();
    this.eye.camera.far = 4000;
    this.eye.camera.position.set(0, 60, 60);
    this.scene.spawn('sun', LightComponent);
    labPanel(
      'Track',
      (folder: DebugFolder) => {
        this.panel.build(folder, this);
      },
      () => {
        this.leave();
      },
    );
  }

  /** Reads the track the draft asks for, lays it, validates it and shows the window. */
  rebuild(): void {
    if (!this.physics.ready) return;
    const load = this.draft.load(this.examples, this.files, this.generator);
    this.clearWindow();
    this.shown = null;
    this.builds = [];
    const track = load.track;
    if (!track) {
      this.issues.set(load.errors);
      this.status.set('The file does not read.');
      this.paintMap(null);
      return;
    }
    if (this.draft.source !== 'text') this.text.set(this.files.serialize(track));
    this.environment = this.environments.of(track.environment);
    const review = this.validation.validate(track);
    this.shown = { track, laid: review.placement };
    this.faulty = review.faulty;
    this.issues.set(review.issues.map((issue: TrackIssue) => this.validation.format(issue)));
    this.builds = this.sweeps.builds(track, review.placement);
    this.status.set(
      `${track.name} · ${String(this.builds.length)} tiles · ` +
        (review.issues.length === 0 ? 'the model accepts it' : 'see what it refuses below'),
    );
    this.panel.onTrackLoaded(this.builds.length);
    this.moveTo(Math.min(this.draft.position, Math.max(0, this.builds.length - 1)));
  }

  /** Puts the player at a position along the track and loads the window around it. */
  moveTo(position: number): void {
    const shown = this.shown;
    if (!shown) return;
    this.draft.position = position;
    const pose = this.tiles.playerPose(shown.track, shown.laid, position);
    this.syncWindow(
      this.tiles.indices(
        this.builds.length,
        pose?.cursor.tile ?? 0,
        this.profiles.isClosed(shown.track),
        this.draft.ahead,
        this.draft.behind,
      ),
    );
    if (pose && this.draft.follow) this.lookAt(pose);
    this.paintMap(pose);
  }

  /** Drops a crate above the player, which the colliders of the window must catch. */
  dropOnPlayer(): void {
    const shown = this.shown;
    const pose = shown ? this.tiles.playerPose(shown.track, shown.laid, this.draft.position) : null;
    if (!pose) return;
    this.dropCrate(CRATE_SPREAD, this.metres(pose));
  }

  clearAllCrates(): void {
    this.clearCrates();
  }

  /** The map canvas follows the box the page gives it, and is painted again at its new size. */
  onMapResized(size: FrameSize): void {
    this.mapCanvas.width = Math.max(1, size.width);
    this.mapCanvas.height = Math.max(1, size.height);
    this.moveTo(this.draft.position);
  }

  onText(value: string): void {
    this.draft.text = value;
    this.text.set(value);
  }

  /** Reads the text area as a track file. */
  loadText(): void {
    this.draft.source = 'text';
    this.rebuild();
  }

  ngOnInit(): void {
    this.load();
  }

  protected start(): void {
    this.rebuild();
  }

  private syncWindow(wanted: ReadonlySet<number>): void {
    for (const [index, object] of [...this.loaded]) {
      if (wanted.has(index)) continue;
      object.destroy();
      this.loaded.delete(index);
    }
    for (const index of wanted) {
      if (!this.loaded.has(index))
        this.loaded.set(index, this.spawnTile(index, this.builds[index]!));
    }
  }

  private spawnTile(index: number, build: TileBuild): GameObject {
    const triangles = this.triangles.build(build);
    const group = this.trackMeshes.tile(build, this.environment, {
      smooth: this.draft.smooth,
      outline: this.draft.outline,
      faulty: this.faulty.has(index),
      triangles,
    });
    return this.solid(`tile-${String(index)}`, group, this.trackBodies.create(build, triangles));
  }

  private clearWindow(): void {
    for (const object of this.loaded.values()) object.destroy();
    this.loaded.clear();
    this.clearCrates();
  }

  private lookAt(pose: PlayerPose): void {
    const target = this.controls.target;
    const to = this.metres(pose);
    this.eye.camera.position.add(to.clone().sub(target));
    target.copy(to);
  }

  private metres(pose: PlayerPose): THREE.Vector3 {
    return new THREE.Vector3(
      pose.point.x * UNIT_METERS,
      pose.height * UNIT_METERS,
      -pose.point.y * UNIT_METERS,
    );
  }

  private paintMap(pose: PlayerPose | null): void {
    const shown = this.shown;
    if (!shown || !this.draft.map) return;
    this.painter.draw(this.mapCanvas, {
      track: shown.track,
      placement: shown.laid,
      environment: this.environment,
      faulty: this.faulty,
      window: new Set(this.loaded.keys()),
      player: pose,
    });
  }
}
