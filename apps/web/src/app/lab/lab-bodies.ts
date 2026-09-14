import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';

import {
  BodyComponent,
  type GameObject,
  type JoltBody,
  JoltConversions,
  JoltPhysics,
  LAYER_MOVING,
  LAYER_NON_MOVING,
  MeshComponent,
  type Scene,
} from '@hexrace/engine';

/** A box body: half extents and centre in metres, static ground or moving crate. */
export interface BoxSpec {
  readonly half: THREE.Vector3;
  readonly position: THREE.Vector3;
  readonly moving: boolean;
}

/** The lab's only shapes: boxes, as Jolt bodies alone or as scene objects with a mesh. */
@Injectable({ providedIn: 'root' })
export class LabBodies {
  private readonly physics = inject(JoltPhysics);
  private readonly conversions = inject(JoltConversions);

  /** Creates the body and adds it to the world, active. */
  box(spec: BoxSpec): JoltBody {
    const Jolt = this.physics.Jolt;
    const shape = new Jolt.BoxShape(this.conversions.vec3(spec.half));
    const settings = new Jolt.BodyCreationSettings(
      shape,
      this.conversions.rvec3(spec.position),
      this.conversions.identity(),
      spec.moving ? Jolt.EMotionType_Dynamic : Jolt.EMotionType_Static,
      spec.moving ? LAYER_MOVING : LAYER_NON_MOVING,
    );
    const body = this.physics.bodyInterface.CreateBody(settings);
    Jolt.destroy(settings);
    this.physics.bodyInterface.AddBody(body.GetID(), Jolt.EActivation_Activate);
    return body;
  }

  /** A box with a mesh and a body in one object of the scene: a ground when static, a crate when moving. */
  spawn(scene: Scene, name: string, spec: BoxSpec, colour: number): GameObject {
    const go = scene.spawn(name);
    const mesh = scene.instantiate(MeshComponent);
    const geometry = new THREE.BoxGeometry(spec.half.x * 2, spec.half.y * 2, spec.half.z * 2);
    mesh.object = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: colour }));
    mesh.object.castShadow = spec.moving;
    mesh.object.receiveShadow = true;
    go.add(mesh);
    const body = scene.instantiate(BodyComponent);
    body.body = this.box(spec);
    go.add(body);
    return go;
  }
}
