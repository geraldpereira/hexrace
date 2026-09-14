import { Injectable, inject } from '@angular/core';
import {
  BodyComponent,
  type GameObject,
  JoltConversions,
  JoltPhysics,
  type JoltShape,
  LAYER_NON_MOVING,
  MeshComponent,
  type Scene,
} from '@hexrace/engine';
import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

import { type ObstacleSpec } from '@ui/lab/car/obstacle-spec';

const RAMP_COLOUR = 0xe0701a;
const BUMP_COLOUR = 0xf2d21b;
const FRICTION = 1;
const SINK = 0.05;

/**
 * The ramp and the speed bump of POC 1, as static Jolt bodies with the matching meshes: a wedge
 * lying flat and rising to its height, its near edge a hair under the ground so the wheels roll on
 * without a lip, and a cylinder laid across the lane and sunk so only its top shows. Each is a
 * scene object of its own, so the panel destroys and rebuilds them one at a time.
 */
@Injectable({ providedIn: 'root' })
export class CarObstacles {
  private readonly physics = inject(JoltPhysics);
  private readonly conversions = inject(JoltConversions);

  build(scene: Scene, spec: ObstacleSpec): GameObject[] {
    const built: GameObject[] = [];
    if (spec.ramp) built.push(this.ramp(scene, spec));
    if (spec.bump) built.push(this.bump(scene, spec));
    return built;
  }

  private ramp(scene: Scene, spec: ObstacleSpec): GameObject {
    const half = spec.width / 2;
    const points = [
      new THREE.Vector3(-half, -SINK, 0),
      new THREE.Vector3(half, -SINK, 0),
      new THREE.Vector3(-half, -SINK, spec.rampLength),
      new THREE.Vector3(half, -SINK, spec.rampLength),
      new THREE.Vector3(-half, spec.rampHeight, spec.rampLength),
      new THREE.Vector3(half, spec.rampHeight, spec.rampLength),
    ];
    const Jolt = this.physics.Jolt;
    const hull = new Jolt.ConvexHullShapeSettings();
    for (const point of points) hull.mPoints.push_back(this.conversions.vec3(point));
    const at = new THREE.Vector3(spec.x, 0, spec.rampZ);
    return this.place(
      scene,
      'ramp',
      hull.Create().Get(),
      new THREE.Mesh(
        new ConvexGeometry(points),
        new THREE.MeshStandardMaterial({ color: RAMP_COLOUR, roughness: 0.7 }),
      ),
      at,
    );
  }

  private bump(scene: Scene, spec: ObstacleSpec): GameObject {
    const Jolt = this.physics.Jolt;
    const shape = new Jolt.CylinderShape(spec.width / 2, spec.bumpRadius, 0.02);
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(spec.bumpRadius, spec.bumpRadius, spec.width, 32),
      new THREE.MeshStandardMaterial({ color: BUMP_COLOUR, roughness: 0.8 }),
    );
    mesh.rotation.z = Math.PI / 2;
    const at = new THREE.Vector3(spec.x, spec.bumpHeight - spec.bumpRadius, spec.bumpZ);
    return this.place(scene, 'bump', shape, mesh, at, new THREE.Euler(0, 0, Math.PI / 2));
  }

  private place(
    scene: Scene,
    name: string,
    shape: JoltShape,
    mesh: THREE.Mesh,
    at: THREE.Vector3,
    rotation = new THREE.Euler(),
  ): GameObject {
    const Jolt = this.physics.Jolt;
    const quaternion = new THREE.Quaternion().setFromEuler(rotation);
    const settings = new Jolt.BodyCreationSettings(
      shape,
      this.conversions.rvec3(at),
      new Jolt.Quat(quaternion.x, quaternion.y, quaternion.z, quaternion.w),
      Jolt.EMotionType_Static,
      LAYER_NON_MOVING,
    );
    settings.mFriction = FRICTION;
    const body = this.physics.bodyInterface.CreateBody(settings);
    this.physics.bodyInterface.AddBody(body.GetID(), Jolt.EActivation_DontActivate);
    Jolt.destroy(settings);
    mesh.position.copy(at);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const meshComponent = scene.instantiate(MeshComponent);
    meshComponent.object = mesh;
    const bodyComponent = scene.instantiate(BodyComponent);
    bodyComponent.body = body;
    const object = scene.spawn(name).add(meshComponent).gameObject;
    object.add(bodyComponent);
    return object;
  }
}
