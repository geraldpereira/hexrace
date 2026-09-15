import { inject } from '@angular/core';
import { Vec2, type Vec3 } from '@hexrace/commons';
import { BodyComponent, GameComponent, MeshComponent, Scene, type Vec3Like } from '@hexrace/engine';
import {
  type Environment,
  type TileBuild,
  EnvironmentCatalog,
  TileTriangles,
  Units,
} from '@hexrace/tile';
import {
  type Placement,
  type Track,
  ORIGIN,
  TILES_AHEAD,
  TILES_BEHIND,
  TrackBodies,
  TrackMeshes,
  TrackPlacement,
  TrackProfiles,
  TrackSweeps,
  TrackWindow,
} from '@hexrace/track';

import { type FadingTile, TileFader } from '@game-commons/stage/tile-fader';

const EMPTY_PLACEMENT: Placement = { tiles: [], next: ORIGIN };

/** A track laid once and kept: what every tile of the window is built from. */
interface LaidTrack {
  readonly track: Track;
  readonly placement: Placement;
  readonly environment: Environment;
  readonly builds: readonly TileBuild[];
  readonly closed: boolean;
}

/**
 * The track in the scene (functional spec 9.2): it lays a track once, then keeps only the tiles
 * around the player alive, each a GameObject carrying its mesh and its collider, faded in when the
 * window reaches it and faded out before it is dropped. That bounds the polygons and the bodies
 * whatever the length of the track. It owns no player: `follow` is told which tile to centre on.
 */
export class TrackStage extends GameComponent {
  ahead = TILES_AHEAD;
  behind = TILES_BEHIND;
  /** Smooth shading rather than facets, as the track showcase offers. */
  smooth = false;
  /** The hexagon's edge drawn on the ground; off in play, it is an editing aid. */
  outlines = false;

  private readonly bodies = inject(TrackBodies);
  private readonly environments = inject(EnvironmentCatalog);
  private readonly fader = inject(TileFader);
  private readonly meshes = inject(TrackMeshes);
  private readonly placer = inject(TrackPlacement);
  private readonly profiles = inject(TrackProfiles);
  private readonly scene = inject(Scene);
  private readonly sweeps = inject(TrackSweeps);
  private readonly triangles = inject(TileTriangles);
  private readonly units = inject(Units);
  private readonly window = inject(TrackWindow);
  private readonly loaded = new Map<number, FadingTile>();
  private laid: LaidTrack | null = null;

  get track(): Track | null {
    return this.laid?.track ?? null;
  }

  /** Never null: a track that is not laid yet is an empty placement, which owns no point. */
  get placement(): Placement {
    return this.laid?.placement ?? EMPTY_PLACEMENT;
  }

  get builds(): readonly TileBuild[] {
    return this.laid?.builds ?? [];
  }

  get environment(): Environment | null {
    return this.laid?.environment ?? null;
  }

  /** The tiles the window holds right now, by index; the ones fading out have left it. */
  get shown(): ReadonlySet<number> {
    const shown = new Set<number>();
    for (const [index, tile] of this.loaded) if (tile.target === 1) shown.add(index);
    return shown;
  }

  /** Lays a track on the grid and makes it the one to walk; whatever was shown is dropped. */
  load(track: Track): void {
    this.clear();
    const placement = this.placer.place(track);
    this.laid = {
      track,
      placement,
      environment: this.environments.of(track.environment),
      builds: this.sweeps.builds(track, placement),
      closed: this.profiles.isClosed(track),
    };
  }

  /** Aims the window at `index`: what enters starts fading in, what leaves starts fading out. */
  follow(index: number): void {
    const laid = this.laid;
    if (!laid) return;
    const wanted = this.window.indices(
      laid.builds.length,
      index,
      laid.closed,
      this.ahead,
      this.behind,
    );
    for (const [shown, tile] of this.loaded) tile.target = wanted.has(shown) ? 1 : 0;
    for (const wants of wanted) {
      if (!this.loaded.has(wants)) this.loaded.set(wants, this.spawn(wants, laid));
    }
  }

  /** A point of the track plane, in units, put in the world in metres at that ground height. */
  metres(point: Vec2, height: number): Vec3 {
    return this.units.toWorld(point, height);
  }

  /** The way back: a world point in metres read as a point of the track plane, in units. */
  plane(point: Vec3Like): Vec2 {
    return new Vec2(this.units.metersToUnits(point.x), -this.units.metersToUnits(point.z));
  }

  override render(dt: number): void {
    for (const [index, tile] of [...this.loaded]) {
      if (!this.fader.advance(tile, dt)) continue;
      tile.object.destroy();
      this.loaded.delete(index);
    }
  }

  override onDestroy(): void {
    this.clear();
  }

  private spawn(index: number, laid: LaidTrack): FadingTile {
    const build = laid.builds[index]!;
    const triangles = this.triangles.build(build);
    const mesh = this.scene.instantiate(MeshComponent);
    mesh.object = this.meshes.tile(build, laid.environment, { smooth: this.smooth, outline: this.outlines, triangles });
    const body = this.scene.instantiate(BodyComponent);
    body.body = this.bodies.create(build, triangles);
    const object = this.scene.spawn(`tile-${String(index)}`);
    object.add(mesh);
    object.add(body);
    this.fader.paint(mesh.object, 0);
    return { object, drawn: mesh.object, opacity: 0, target: 1 };
  }

  private clear(): void {
    for (const tile of this.loaded.values()) tile.object.destroy();
    this.loaded.clear();
  }
}
