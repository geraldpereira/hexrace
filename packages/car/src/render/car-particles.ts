import { inject } from '@angular/core';
import { Random } from '@hexrace/commons';
import { GameComponent, ThreeRenderer } from '@hexrace/engine';
import * as THREE from 'three';

import { type CarReadout, type SlideReadout, type WheelContact } from '@car/entity/car-readout';
import { type SurfaceParticles } from '@car/entity/surface-feel';
import { Puffs } from '@car/render/puffs';

const MAX_PARTICLES = 3000;
const GRAVITY = 9.81;
const ROLL_FULL_KMH = 80;
const DUST_SHARE = 0.25;
const DEBRIS_SHARE = 0.35;
const SCRUB_SHARE = 0.5;
const DUST_UP = 1.2;
const DEBRIS_UP = 3;
const DUST_SPREAD = 1;
const DEBRIS_SPREAD = 2.5;
const DUST_DRAG = 1.5;
const DUST_RISE = 0.4;

/**
 * What the wheels throw up (functional spec 8.3): puffs that grow, fade and drift, and solid bits
 * that fall and stop where they land, both taken from the surface under the wheel. The rate
 * follows the slide the marks measured and, on the loose ranks, plain rolling speed. One
 * `THREE.Points` with a sprite shader over a ring buffer simulated on the CPU, as in POC 1.
 */
export class CarParticles extends GameComponent {
  readout!: CarReadout;
  slides!: SlideReadout;
  camera: THREE.PerspectiveCamera | null = null;
  enabled = true;
  slideRate = 1;
  rollRate = 1;
  /** Particles alive this frame. */
  alive = 0;
  /** Where a thrown stone comes to rest; the lab's ground is flat at zero. */
  groundY = 0;

  private readonly renderer = inject(ThreeRenderer);
  private readonly rng = inject(Random).fresh();
  private readonly puffs = inject(Puffs);
  private readonly cloud = this.puffs.build(MAX_PARTICLES);
  private readonly carry: number[] = [];
  private readonly back = new THREE.Vector3();
  private head = 0;

  override awake(): void {
    this.carry.push(...Array.from<number>({ length: this.readout.contacts.length * 2 }).fill(0));
    this.renderer.scene.add(this.cloud.points);
  }

  override render(dt: number): void {
    if (this.enabled) this.emit(dt);
    this.simulate(dt);
    this.alive = this.puffs.upload(this.cloud, this.camera);
  }

  override onDestroy(): void {
    this.renderer.scene.remove(this.cloud.points);
    this.puffs.dispose(this.cloud);
  }

  private emit(dt: number): void {
    const velocity = this.readout.velocity;
    const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
    const roll = Math.min(this.readout.state.speedKmh / ROLL_FULL_KMH, 1);
    for (const [i, contact] of this.readout.contacts.entries()) {
      if (!contact.contact) continue;
      const kinds = contact.surface.particles;
      const slide = this.slides.wheelIntensity[i]!;
      if (speed > 0.5) this.back.set(velocity.x, velocity.y, velocity.z).multiplyScalar(-1 / speed);
      else this.back.set(-contact.longitudinal.x, -contact.longitudinal.y, -contact.longitudinal.z);
      const dust =
        (kinds.slideDust * slide * this.slideRate + kinds.rollDust * roll * this.rollRate) * dt;
      const debris =
        (kinds.slideDebris * slide * this.slideRate + kinds.rollDebris * roll * this.rollRate) * dt;
      this.spawnMany(i * 2, dust, 0, contact, kinds, speed, slide);
      this.spawnMany(i * 2 + 1, debris, 1, contact, kinds, speed, slide);
    }
  }

  private spawnMany(
    slot: number,
    rate: number,
    kind: 0 | 1,
    contact: WheelContact,
    kinds: SurfaceParticles,
    speed: number,
    slide: number,
  ): void {
    let left = this.carry[slot]! + rate;
    while (left >= 1) {
      this.spawn(kind, contact, kinds, speed, slide);
      left -= 1;
    }
    this.carry[slot] = left;
  }

  private spawn(
    kind: 0 | 1,
    contact: WheelContact,
    kinds: SurfaceParticles,
    speed: number,
    slide: number,
  ): void {
    const p = this.cloud.particles[this.head]!;
    this.head = (this.head + 1) % this.cloud.particles.length;
    const dust = kind === 0;
    p.alive = true;
    p.kind = kind;
    p.age = 0;
    p.life = (dust ? kinds.dustLife : kinds.debrisLife) * (0.7 + this.rng.next() * 0.6);
    p.size = (dust ? kinds.dustSize : kinds.debrisSize) * (0.7 + this.rng.next() * 0.6);
    p.alpha = dust ? kinds.dustAlpha : 1;
    p.color.setHex(dust ? kinds.dustColor : kinds.debrisColor);
    if (!dust) p.color.multiplyScalar(0.8 + this.rng.next() * 0.4);
    const normal = new THREE.Vector3(contact.normal.x, contact.normal.y, contact.normal.z);
    const lateral = new THREE.Vector3(contact.lateral.x, contact.lateral.y, contact.lateral.z);
    const along = new THREE.Vector3(
      contact.longitudinal.x,
      contact.longitudinal.y,
      contact.longitudinal.z,
    );
    p.pos
      .set(contact.point.x, contact.point.y, contact.point.z)
      .addScaledVector(this.back, 0.2)
      .addScaledVector(lateral, (this.rng.next() - 0.5) * contact.width)
      .addScaledVector(normal, 0.05);
    const share = dust ? DUST_SHARE : DEBRIS_SHARE;
    const spread = (dust ? DUST_SPREAD : DEBRIS_SPREAD) * (0.5 + slide);
    const up = (dust ? DUST_UP : DEBRIS_UP) * (0.5 + slide + 0.5 * this.rng.next());
    p.vel
      .copy(this.back)
      .multiplyScalar(speed * share + contact.slipSpeed * SCRUB_SHARE)
      .addScaledVector(normal, up)
      .addScaledVector(lateral, (this.rng.next() - 0.5) * 2 * spread)
      .addScaledVector(along, (this.rng.next() - 0.5) * spread);
  }

  private simulate(dt: number): void {
    for (const p of this.cloud.particles) {
      if (!p.alive) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.alive = false;
        continue;
      }
      if (p.kind === 0) {
        p.vel.multiplyScalar(Math.max(0, 1 - DUST_DRAG * dt));
        p.vel.y += DUST_RISE * dt;
        p.pos.addScaledVector(p.vel, dt);
        continue;
      }
      if (p.vel.lengthSq() === 0) continue;
      p.vel.y -= GRAVITY * dt;
      p.pos.addScaledVector(p.vel, dt);
      const floor = this.groundY + p.size * 0.5;
      if (p.pos.y >= floor) continue;
      p.pos.y = floor;
      p.vel.set(0, 0, 0);
    }
  }
}
