import { Injectable, inject } from '@angular/core';
import { Surfaces, type SurfaceQuery } from '@hexrace/car';
import { BodyComponent, GameObject, MeshComponent, type Scene } from '@hexrace/engine';
import { EnvironmentCatalog } from '@hexrace/tile';
import { type EnvironmentId } from '@hexrace/tile';
import * as THREE from 'three';

import { LabBodies } from '@ui/lab/lab-bodies';

const LENGTH = 400;
const THICKNESS = 1;
const LANE_WIDTH = 8;

/** The painted ground: the object to destroy, the lanes the probe reads, one query per strip. */
export interface GroundStrips {
  readonly object: GameObject;
  readonly lanes: readonly SurfaceQuery[];
  readonly laneWidth: number;
}

/**
 * The flat ground of POC 1, cut into one strip per rank of an environment and painted with the
 * tile palette so a surface is recognised without a legend (functional spec 8.2). One static box
 * carries the physics for the lot, in a child object of its own so that nothing moves the paint
 * to the body's pose; the lanes tell the probe what the car is standing on. Rebuilt whenever the
 * panel changes environment, body included.
 */
@Injectable({ providedIn: 'root' })
export class CarGround {
  private readonly bodies = inject(LabBodies);
  private readonly surfaces = inject(Surfaces);
  private readonly environments = inject(EnvironmentCatalog);

  build(scene: Scene, environment: EnvironmentId): GroundStrips {
    const lanes = this.surfaces.of(environment);
    const width = lanes.length * LANE_WIDTH;
    const group = new THREE.Group();
    const palette = this.environments.of(environment);
    for (const [i, lane] of lanes.entries()) {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(LANE_WIDTH, LENGTH),
        new THREE.MeshStandardMaterial({
          color: this.environments.zoneColor(palette, lane.zone, lane.rank),
        }),
      );
      strip.rotation.x = -Math.PI / 2;
      strip.position.set((i - (lanes.length - 1) / 2) * LANE_WIDTH, 0.01, LENGTH / 2 - 40);
      strip.receiveShadow = true;
      group.add(strip);
    }
    const mesh = scene.instantiate(MeshComponent);
    mesh.object = group;
    const object = scene.spawn('ground').add(mesh).gameObject;
    const solid = GameObject.named('ground-body');
    const body = scene.instantiate(BodyComponent);
    body.body = this.bodies.box({
      half: new THREE.Vector3(width / 2, THICKNESS / 2, LENGTH / 2),
      position: new THREE.Vector3(0, -THICKNESS / 2, LENGTH / 2 - 40),
      moving: false,
    });
    solid.add(body);
    object.addChild(solid);
    return { object, lanes, laneWidth: LANE_WIDTH };
  }
}
