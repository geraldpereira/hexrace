import { inject } from '@angular/core';
import { GameComponent, ThreeRenderer } from '@hexrace/engine';
import * as THREE from 'three';

import { Ramps } from '@car/drive/ramps';
import { type CarReadout, type SlideReadout, type WheelContact } from '@car/entity/car-readout';

const MAX_SEGMENTS = 6000;
const VERTICES = 6;
const SEGMENT_LENGTH = 0.12;
const LIFT = 0.015;
const HORIZON_METERS = 90;

/**
 * A ribbon per wheel laid on the ground while the tyre scrubs (POC 1): locked under braking or
 * the hand brake, optionally sideways too. One non-indexed geometry with a ring of quads, RGBA
 * vertex colours, so each edge fades with the slip and takes the surface's own mark colour. The
 * intensity it computes is the one the tyre noise and the dust follow, so all three agree. A mark
 * further than `horizon` from the car is rubbed out, because the tile that carried it is gone.
 */
export class SkidMarks extends GameComponent implements SlideReadout {
  readout!: CarReadout;
  enabled = true;
  lockSlipStart = 0.4;
  lockSlipFull = 0.8;
  slipSpeedStart = 0.5;
  slipSpeedFull = 2.5;
  lateralEnabled = false;
  lateralStartDeg = 12;
  lateralFullDeg = 25;
  attack = 0.05;
  release = 0.2;
  widthScale = 1;
  /** How far behind the car a mark survives, in metres; 0 keeps every one of them. */
  horizon = HORIZON_METERS;
  /** Quads standing right now; the ring buffer bounds them and the horizon rubs them out. */
  segments = 0;
  readonly wheelIntensity: number[] = [];

  private readonly renderer = inject(ThreeRenderer);
  private readonly ramps = inject(Ramps);
  private readonly positions = new THREE.BufferAttribute(
    new Float32Array(MAX_SEGMENTS * VERTICES * 3),
    3,
  );
  private readonly colors = new THREE.BufferAttribute(
    new Float32Array(MAX_SEGMENTS * VERTICES * 4),
    4,
  );
  private readonly mesh = new THREE.Mesh();
  private readonly trails: {
    active: boolean;
    left: THREE.Vector3;
    right: THREE.Vector3;
    alpha: number;
  }[] = [];
  private readonly left = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly mid = new THREE.Vector3();
  private readonly lastMid = new THREE.Vector3();
  private readonly colour = new THREE.Color();
  private head = 0;
  private tail = 0;

  override awake(): void {
    const geometry = new THREE.BufferGeometry();
    this.positions.setUsage(THREE.DynamicDrawUsage);
    this.colors.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', this.positions);
    geometry.setAttribute('color', this.colors);
    this.mesh.geometry = geometry;
    this.mesh.material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    const wheels = this.readout.contacts.length;
    this.trails.push(
      ...Array.from({ length: wheels }, () => ({
        active: false,
        left: new THREE.Vector3(),
        right: new THREE.Vector3(),
        alpha: 0,
      })),
    );
    this.wheelIntensity.push(...Array.from<number>({ length: wheels }).fill(0));
    this.renderer.scene.add(this.mesh);
  }

  override render(dt: number): void {
    let dirty = false;
    for (const [i, contact] of this.readout.contacts.entries()) {
      const trail = this.trails[i]!;
      const intensity = this.smooth(i, contact.contact ? this.intensity(contact) : 0, dt);
      if (intensity <= 0 || !this.enabled) {
        trail.active = false;
        continue;
      }
      this.edges(contact);
      if (trail.active && this.far(trail)) {
        this.push(trail, intensity, contact);
        dirty = true;
      } else if (trail.active) continue;
      trail.active = true;
      trail.left.copy(this.left);
      trail.right.copy(this.right);
      trail.alpha = intensity;
    }
    if (this.rubOut()) dirty = true;
    if (!dirty) return;
    this.positions.needsUpdate = true;
    this.colors.needsUpdate = true;
  }

  /** Wipes every ribbon; the panel's Clear, and what a new race starts from. */
  clear(): void {
    (this.positions.array as Float32Array).fill(0);
    (this.colors.array as Float32Array).fill(0);
    this.positions.needsUpdate = true;
    this.colors.needsUpdate = true;
    this.head = 0;
    this.tail = 0;
    this.segments = 0;
    for (const trail of this.trails) trail.active = false;
  }

  override onDestroy(): void {
    this.renderer.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }

  private rubOut(): boolean {
    if (this.horizon <= 0) return false;
    const far = this.horizon * this.horizon;
    let rubbed = false;
    while (this.segments > 0 && this.beyond(this.tail, far)) {
      for (let i = 0; i < VERTICES; i++) this.colors.setW(this.tail * VERTICES + i, 0);
      this.tail = (this.tail + 1) % MAX_SEGMENTS;
      this.segments--;
      rubbed = true;
    }
    return rubbed;
  }

  private beyond(segment: number, far: number): boolean {
    const at = segment * VERTICES;
    const car = this.readout.pose.position;
    const dx = this.positions.getX(at) - car.x;
    const dy = this.positions.getY(at) - car.y;
    const dz = this.positions.getZ(at) - car.z;
    return dx * dx + dy * dy + dz * dz > far;
  }

  private smooth(index: number, raw: number, dt: number): number {
    const previous = this.wheelIntensity[index]!;
    const tau = raw > previous ? this.attack : this.release;
    const k = tau > 0 ? 1 - Math.exp(-dt / tau) : 1;
    let value = previous + (raw - previous) * k;
    if (value < 0.01) value = 0;
    this.wheelIntensity[index] = value;
    return value;
  }

  private intensity(contact: WheelContact): number {
    const scrub = this.ramps.at(contact.slipSpeed, this.slipSpeedStart, this.slipSpeedFull);
    const lock =
      this.ramps.at(Math.abs(contact.longitudinalSlip), this.lockSlipStart, this.lockSlipFull) *
      scrub;
    const sideways = this.lateralEnabled
      ? this.ramps.at(Math.abs(contact.lateralSlipDeg), this.lateralStartDeg, this.lateralFullDeg)
      : 0;
    return Math.max(lock, sideways);
  }

  private edges(contact: WheelContact): void {
    const half = (contact.width * this.widthScale) / 2;
    const point = new THREE.Vector3(contact.point.x, contact.point.y, contact.point.z);
    const normal = new THREE.Vector3(contact.normal.x, contact.normal.y, contact.normal.z);
    const lateral = new THREE.Vector3(contact.lateral.x, contact.lateral.y, contact.lateral.z);
    this.left.copy(point).addScaledVector(normal, LIFT).addScaledVector(lateral, -half);
    this.right.copy(point).addScaledVector(normal, LIFT).addScaledVector(lateral, half);
  }

  private far(trail: { left: THREE.Vector3; right: THREE.Vector3 }): boolean {
    this.mid.addVectors(this.left, this.right).multiplyScalar(0.5);
    this.lastMid.addVectors(trail.left, trail.right).multiplyScalar(0.5);
    return this.mid.distanceTo(this.lastMid) >= SEGMENT_LENGTH;
  }

  private push(
    trail: { left: THREE.Vector3; right: THREE.Vector3; alpha: number },
    intensity: number,
    contact: WheelContact,
  ): void {
    const base = this.head * VERTICES;
    const colour = this.colour.setHex(contact.surface.markColor);
    const before = trail.alpha * contact.surface.markOpacity;
    const now = intensity * contact.surface.markOpacity;
    this.vertex(base, trail.left, colour, before);
    this.vertex(base + 1, trail.right, colour, before);
    this.vertex(base + 2, this.right, colour, now);
    this.vertex(base + 3, trail.left, colour, before);
    this.vertex(base + 4, this.right, colour, now);
    this.vertex(base + 5, this.left, colour, now);
    this.head = (this.head + 1) % MAX_SEGMENTS;
    this.segments++;
  }

  private vertex(index: number, at: THREE.Vector3, colour: THREE.Color, alpha: number): void {
    this.positions.setXYZ(index, at.x, at.y, at.z);
    this.colors.setXYZW(index, colour.r, colour.g, colour.b, alpha);
  }
}
