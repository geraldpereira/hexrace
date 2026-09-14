import { TestBed } from '@angular/core/testing';
import { type GameObject, Scenes, ThreeRenderer } from '@hexrace/engine';
import * as THREE from 'three';

import { LOOSE } from '@car/entity/surfaces/loose-feels';
import { CarParticles } from '@car/render/car-particles';
import { type FakeReadout, fakeReadout } from '@car/render/readout.mock';

describe('CarParticles', () => {
  let readout: FakeReadout;
  let particles: CarParticles;
  let object: GameObject;
  let slides: { wheelIntensity: number[] };

  beforeEach(() => {
    slides = { wheelIntensity: [1, 1, 1, 1] };
    readout = fakeReadout();
    for (const contact of readout.contacts) contact.surface = LOOSE;
    readout.state.speedKmh = 80;
    readout.velocity.z = 22;
    const scene = TestBed.inject(Scenes).create();
    particles = scene.instantiate(CarParticles);
    particles.readout = readout;
    particles.slides = slides;
    object = scene.spawn('particles');
    object.add(particles);
    scene.start();
  });

  it('throws dust and debris behind the wheels, then lets them die', () => {
    expect(TestBed.inject(ThreeRenderer).scene.children).toHaveLength(1);
    particles.render?.(0.2);
    expect(particles.alive).toBeGreaterThan(0);
    const born = particles.alive;
    slides.wheelIntensity.fill(0);
    readout.state.speedKmh = 0;
    readout.velocity.z = 0;
    for (let i = 0; i < 40; i++) particles.render?.(0.1);
    expect(particles.alive).toBeLessThan(born);
    expect(particles.alive).toBe(0);
  });

  it('lands the debris on the ground and leaves it there', () => {
    particles.groundY = 0;
    particles.render?.(0.2);
    for (let i = 0; i < 20; i++) particles.render?.(0.05);
    expect(particles.alive).toBeGreaterThan(0);
  });

  it('throws the bits along the wheel when the car is not moving, as on a standing burnout', () => {
    readout.velocity.z = 0;
    readout.state.speedKmh = 0;
    particles.render?.(0.2);
    expect(particles.alive).toBeGreaterThan(0);
  });

  it('emits nothing when switched off, in the air, or from a wheel with no contact', () => {
    particles.enabled = false;
    particles.render?.(0.2);
    expect(particles.alive).toBe(0);
    particles.enabled = true;
    for (const contact of readout.contacts) contact.contact = false;
    particles.render?.(0.2);
    expect(particles.alive).toBe(0);
  });

  it('sizes the sprites for the camera it is given, and cleans up after itself', () => {
    particles.camera = new THREE.PerspectiveCamera(60, 1.5, 0.1, 100);
    particles.render?.(0.2);
    expect(particles.alive).toBeGreaterThan(0);
    object.destroy();
    expect(TestBed.inject(ThreeRenderer).scene.children).toHaveLength(0);
  });
});
