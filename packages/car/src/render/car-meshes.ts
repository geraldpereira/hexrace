import { Injectable } from '@angular/core';
import * as THREE from 'three';

import { type CarSpec } from '@car/entity/car-spec';

const BODY_COLOUR = 0x2266dd;
const CABIN_COLOUR = 0x1a1a2a;
const TYRE_COLOUR = 0x111111;
const SPOKE_COLOUR = 0xffaa00;
const MARKER_COLOUR = 0xff2020;
const WHEEL_SEGMENTS = 24;

/** A built car: the group to hang in the scene, the wheels to place, the centre of mass marker. */
export interface CarMeshSet {
  readonly group: THREE.Group;
  readonly wheels: readonly THREE.Object3D[];
  readonly marker: THREE.Object3D;
  /** Every geometry and material built here, so `dispose` frees exactly what it made. */
  readonly owned: readonly (THREE.BufferGeometry | THREE.Material)[];
}

/**
 * The car as three.js draws it, the shapes of POC 1: a box the size of the collider, a cabin set
 * slightly back so the car has a visible front, and four cylinders on their +Y axis, which is the
 * frame the vehicle constraint is queried in, so a wheel mesh needs no rotation of its own. Each
 * wheel carries a spoke bar, without which a spinning tyre looks still. `dispose` frees it all.
 */
@Injectable({ providedIn: 'root' })
export class CarMeshes {
  build(spec: CarSpec, wheels = 4): CarMeshSet {
    const c = spec.chassis;
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(c.halfWidth * 2, c.halfHeight * 2, c.halfLength * 2),
      new THREE.MeshStandardMaterial({ color: BODY_COLOUR, roughness: 0.5, metalness: 0.4 }),
    );
    body.castShadow = true;
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(c.halfWidth * 1.6, c.halfHeight * 1.6, c.halfLength * 0.9),
      new THREE.MeshStandardMaterial({ color: CABIN_COLOUR, roughness: 0.3, metalness: 0.6 }),
    );
    cabin.position.set(0, c.halfHeight * 1.8, -c.halfLength * 0.2);
    cabin.castShadow = true;
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 8),
      new THREE.MeshBasicMaterial({ color: MARKER_COLOUR, depthTest: false }),
    );
    marker.renderOrder = 10;
    marker.visible = false;
    marker.position.set(c.comX, c.comY, c.comZ);
    group.add(body, cabin, marker);
    const owned = [body, cabin, marker].flatMap((mesh: THREE.Mesh) => [
      mesh.geometry,
      mesh.material as THREE.Material,
    ]);
    const built: THREE.Object3D[] = [];
    for (let i = 0; i < wheels; i++) {
      const wheel = this.wheel(spec);
      group.add(wheel);
      built.push(wheel);
      owned.push(wheel.geometry, wheel.material as THREE.Material);
      const spoke = wheel.children[0] as THREE.Mesh;
      owned.push(spoke.geometry, spoke.material as THREE.Material);
    }
    return { group, wheels: built, marker, owned };
  }

  /** Frees every geometry and material of a built car; the group must be out of the scene. */
  dispose(set: CarMeshSet): void {
    for (const one of set.owned) one.dispose();
  }

  private wheel(spec: CarSpec): THREE.Mesh {
    const { radius, width } = spec.wheels;
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, width, WHEEL_SEGMENTS),
      new THREE.MeshStandardMaterial({ color: TYRE_COLOUR, roughness: 0.9, metalness: 0.1 }),
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, width * 1.15, radius * 1.7),
      new THREE.MeshStandardMaterial({ color: SPOKE_COLOUR, roughness: 0.5 }),
    );
    spoke.castShadow = true;
    mesh.add(spoke);
    return mesh;
  }
}
