import { inject } from '@angular/core';
import * as THREE from 'three';
import { clamp } from 'lodash-es';

import { type CameraTarget, type Vec3Like } from '@hexrace/camera';
import { degToRad } from '@hexrace/commons';
import { Component } from '@hexrace/engine';
import { Inputs } from '@hexrace/inputs';

const HULL = new THREE.BoxGeometry(1.8, 0.7, 4);
const NOSE = new THREE.BoxGeometry(1.2, 0.5, 1);
const MARKER = new THREE.RingGeometry(1.6, 2.2, 6);

/**
 * A car-shaped mobile the inputs drive kinematically, no physics: what the camera follows in the
 * lab. It is its own `CameraTarget`, and it carries a fake next tile, a ring on the ground at a
 * bearing and a distance from the heading that the debug folder sets, so the camera's lean towards
 * the next tile can be judged before `track` exists. `object` holds the hull and the ring.
 */
export class Dummy extends Component implements CameraTarget {
  readonly position = new THREE.Vector3();
  heading = 0;
  speed = 0;
  nextTileKnown = true;
  /** Degrees from the heading, positive to the left. */
  nextTileBearingDeg = 30;
  nextTileDistance = 25;
  maxSpeed = 40;
  acceleration = 12;
  braking = 20;
  /** Fraction of the speed lost per second when coasting. */
  drag = 0.4;
  /** Radians per second at full lock and speed. */
  turnRate = 1.6;
  readonly object = new THREE.Group();

  private readonly inputs = inject(Inputs);
  private readonly hull = new THREE.Group();
  private readonly marker = new THREE.Mesh(
    MARKER,
    new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide }),
  );

  get nextTile(): Vec3Like | null {
    return this.nextTileKnown ? this.marker.position : null;
  }

  override awake(): void {
    const body = new THREE.Mesh(HULL, new THREE.MeshStandardMaterial({ color: 0xd94c4c }));
    body.position.y = 0.55;
    const nose = new THREE.Mesh(NOSE, new THREE.MeshStandardMaterial({ color: 0xe8edf2 }));
    nose.position.set(0, 0.45, 2.3);
    body.castShadow = true;
    nose.castShadow = true;
    this.hull.add(body, nose);
    this.marker.rotation.x = -Math.PI / 2;
    this.object.add(this.hull, this.marker);
    this.place();
  }

  override render(dt: number): void {
    const a = this.inputs.actions;
    this.speed += (a.throttle * this.acceleration - a.brake * this.braking) * dt;
    this.speed -= this.speed * this.drag * dt;
    this.speed = clamp(this.speed, 0, this.maxSpeed);
    this.heading -= a.steer * this.turnRate * dt * Math.min(1, this.speed / 8);
    this.position.x += Math.sin(this.heading) * this.speed * dt;
    this.position.z += Math.cos(this.heading) * this.speed * dt;
    this.place();
  }

  reset(): void {
    this.position.set(0, 0, 0);
    this.heading = 0;
    this.speed = 0;
    this.place();
  }

  private place(): void {
    this.hull.position.copy(this.position);
    this.hull.rotation.y = this.heading;
    const bearing = this.heading + degToRad(this.nextTileBearingDeg);
    this.marker.position.set(
      this.position.x + Math.sin(bearing) * this.nextTileDistance,
      0.05,
      this.position.z + Math.cos(bearing) * this.nextTileDistance,
    );
    this.marker.visible = this.nextTileKnown;
  }
}
