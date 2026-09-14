import { Injectable, inject } from '@angular/core';
import { type JoltBody, JoltConversions, JoltPhysics, LAYER_NON_MOVING } from '@hexrace/engine';

import { type Triangle3 } from '@tile/entity/triangle';

/**
 * Builds the collider of a tile: a static Jolt mesh shape over the same triangles the renderer
 * draws, degenerate ones dropped by Jolt's sanitising. The body is added to the world at once,
 * inactive as static bodies are; the caller frees it through `JoltPhysics.unregister`.
 */
@Injectable({ providedIn: 'root' })
export class TileBodies {
  private readonly physics = inject(JoltPhysics);
  private readonly conversions = inject(JoltConversions);

  create(triangles: readonly Triangle3[]): JoltBody {
    const Jolt = this.physics.Jolt;
    const list = new Jolt.TriangleList();
    list.reserve(triangles.length);
    for (const t of triangles) {
      const a = this.conversions.vec3(t.a);
      const b = this.conversions.vec3(t.b);
      const c = this.conversions.vec3(t.c);
      const triangle = new Jolt.Triangle(a, b, c);
      list.push_back(triangle);
      for (const temporary of [a, b, c, triangle]) Jolt.destroy(temporary);
    }
    const shapeSettings = new Jolt.MeshShapeSettings(list);
    Jolt.destroy(list);
    shapeSettings.Sanitize();
    const shape = shapeSettings.Create().Get();
    const settings = new Jolt.BodyCreationSettings(
      shape,
      this.conversions.rvec3({ x: 0, y: 0, z: 0 }),
      this.conversions.identity(),
      Jolt.EMotionType_Static,
      LAYER_NON_MOVING,
    );
    const body = this.physics.bodyInterface.CreateBody(settings);
    Jolt.destroy(settings);
    this.physics.bodyInterface.AddBody(body.GetID(), Jolt.EActivation_DontActivate);
    return body;
  }
}
