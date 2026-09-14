import { Injectable, inject } from '@angular/core';
import { type JoltBody, JoltPhysics } from '@hexrace/engine';
import { type TileBuild, type Triangle3, TileBodies, TileTriangles } from '@hexrace/tile';

/**
 * The colliders of a track: one static Jolt body per tile, over the very triangles the renderer
 * draws, made and freed with the tile window (functional spec 9.2) so that the number of bodies
 * stays bounded whatever the length of the track.
 */
@Injectable({ providedIn: 'root' })
export class TrackBodies {
  private readonly bodies = inject(TileBodies);
  private readonly physics = inject(JoltPhysics);
  private readonly triangles = inject(TileTriangles);

  create(build: TileBuild, triangles?: readonly Triangle3[]): JoltBody {
    return this.bodies.create(triangles ?? this.triangles.build(build));
  }

  /** Takes a tile's body out of the world; a `BodyComponent` does it on its own when destroyed. */
  remove(body: JoltBody): void {
    this.physics.unregister(body);
  }
}
