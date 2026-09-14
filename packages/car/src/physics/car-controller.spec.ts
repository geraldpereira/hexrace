import { TestBed } from '@angular/core/testing';
import { EventBus } from '@hexrace/commons';
import { GameObject } from '@hexrace/engine';

import { type CarShift } from '@car/entity/car-events';
import { carOptions } from '@car/entity/car.mock';
import type { CarController } from '@car/physics/car-controller';
import { type CarWorld, FlatProbe, carWorld } from '@car/physics/car-world.mock';

describe('CarController', () => {
  let world: CarWorld;

  afterEach(() => {
    world.destroy();
  });

  function idle(): void {
    Object.assign(world.inputs.actions, {
      throttle: 0,
      brake: 0,
      steer: 0,
      handBrake: 0,
      reset: 0,
      gearUp: 0,
      gearDown: 0,
    });
  }

  it('settles on its wheels, then drives forward and revs up under throttle', async () => {
    world = await carWorld();
    world.step(60);
    idle();
    expect(world.car.state.airborne).toBe(false);
    expect(world.car.pose.wheels).toHaveLength(4);
    expect(world.car.nextTile).toBeNull();
    expect(world.car.position.y).toBeGreaterThan(0);
    expect(world.car.state.speedKmh).toBeLessThan(1);

    world.inputs.actions.throttle = 1;
    world.step(180);
    expect(world.car.state.speedKmh).toBeGreaterThan(20);
    expect(world.car.state.rpm).toBeGreaterThan(world.car.state.minRpm);
    expect(world.car.state.gear).toBeGreaterThan(1);
    expect(world.car.position.z).toBeGreaterThan(5);
    expect(world.car.speed).toBeCloseTo(world.car.state.speedKmh / 3.6);
  });

  it('steers, and turns less at speed than at rest because the lock shrinks', async () => {
    world = await carWorld();
    world.step(60);
    world.inputs.actions.throttle = 1;
    world.step(30);
    const atRest = world.car.state.steerMaxDeg;
    world.step(240);
    expect(world.car.state.steerMaxDeg).toBeLessThan(atRest);
    world.inputs.actions.steer = 1;
    world.step(60);
    expect(Math.abs(world.car.heading)).toBeGreaterThan(0.05);
    expect(Math.abs(world.car.state.yawRateDeg)).toBeGreaterThan(1);
  });

  it('brakes while rolling and takes reverse once stopped', async () => {
    world = await carWorld();
    world.step(60);
    world.inputs.actions.throttle = 1;
    world.step(120);
    idle();
    world.inputs.actions.brake = 1;
    world.step(240);
    expect(world.car.state.gear).toBeLessThan(0);
    expect(world.car.velocity.z).toBeLessThan(0);
  });

  it('lets the throttle win over a lingering brake so reverse never traps the car', async () => {
    world = await carWorld();
    world.step(60);
    idle();
    world.inputs.actions.brake = 1;
    world.step(120);
    expect(world.car.velocity.z).toBeLessThan(-0.5);
    world.inputs.actions.brake = 0.01;
    world.inputs.actions.throttle = 1;
    world.step(240);
    expect(world.car.state.gear).toBeGreaterThan(0);
    expect(world.car.velocity.z).toBeGreaterThan(1);
  });

  it('cuts the throttle when traction control is bought and the wheels spin', async () => {
    world = await carWorld((car: CarController) => {
      car.options = carOptions();
      car.options.tractionControl.enabled = true;
      car.defaultSurface = { environment: 'north', zone: 'road', rank: 3 };
    });
    world.step(60);
    world.inputs.actions.throttle = 1;
    world.step(120);
    expect(world.car.state.tractionCut).toBeGreaterThan(0);
  });

  it('drops the rear grip while the hand brake is pulled, and puts it back after', async () => {
    world = await carWorld();
    world.step(60);
    world.inputs.actions.throttle = 1;
    world.step(120);
    world.inputs.actions.handBrake = 1;
    world.step(30);
    expect(world.car.state.handBrake).toBe(1);
    world.inputs.actions.handBrake = 0;
    world.step(10);
    expect(world.car.state.handBrake).toBe(0);
  });

  it('asks the probe for the ground under each wheel and only re-reads on a change', async () => {
    const probe = new FlatProbe();
    world = await carWorld((car: CarController) => {
      car.probe = probe;
    });
    world.step(60);
    expect(probe.seen).toBeGreaterThan(0);
    expect(world.car.contacts[0]?.surface.key).toBe('firm');
    probe.answer = { environment: 'africa', zone: 'shoulder', rank: 3 };
    world.step(5);
    expect(world.car.contacts[0]?.surface.key).toBe('boggy');
    probe.answer = null;
    world.step(5);
    expect(world.car.contacts[0]?.surface.key).toBe('firm');
  });

  it('puts the car back home after three seconds of reset, and says so', async () => {
    const bus = TestBed.inject(EventBus);
    const held: number[] = [];
    bus.on('car/reset', (event) => held.push(event.held));
    world = await carWorld((car: CarController) => {
      car.home = { x: 4, y: 0, z: -7 };
      car.homeHeading = Math.PI / 2;
    });
    world.step(30);
    world.inputs.actions.throttle = 1;
    world.step(120);
    idle();
    world.inputs.actions.reset = 1;
    world.step(120);
    expect(world.car.state.resetHeld).toBeGreaterThan(1);
    expect(held).toHaveLength(0);
    while (held.length === 0) world.step(1);
    expect(held).toEqual([3]);
    expect(world.car.position.x).toBeCloseTo(4, 1);
    expect(world.car.position.z).toBeCloseTo(-7, 1);
    expect(world.car.state.resetHeld).toBeLessThan(1);
    world.inputs.actions.reset = 0;
    world.step(1);
    expect(world.car.state.resetHeld).toBe(0);
  });

  it('publishes what it hits and what gear it takes', async () => {
    const bus = TestBed.inject(EventBus);
    const shifts: CarShift[] = [];
    const hits: string[] = [];
    bus.on('car/shift', (event) => shifts.push(event));
    bus.on('car/collision', (event) => hits.push(event.other));
    world = await carWorld();
    world.step(60);
    world.inputs.actions.throttle = 1;
    world.step(180);
    expect(shifts.length).toBeGreaterThan(0);
    world.car.onCollisionEnter?.(GameObject.named('barrier'));
    expect(hits).toEqual(['barrier']);
  });

  it('runs the manual box on the bumpers and hints at the next gear', async () => {
    world = await carWorld((car: CarController) => {
      car.manualGearbox = true;
    });
    world.step(30);
    world.inputs.actions.gearUp = 1;
    world.step(2);
    world.inputs.actions.gearUp = 0;
    world.inputs.actions.throttle = 1;
    world.step(180);
    expect(world.car.state.gear).toBe(1);
    expect(world.car.state.shiftHint).toBe(true);
    world.inputs.actions.gearDown = 1;
    world.step(2);
    expect(world.car.state.gear).toBe(0);
  });

  it('stays put while frozen, whatever the driver asks, then drives again once released', async () => {
    world = await carWorld();
    world.step(60);
    world.car.frozen = true;
    world.inputs.actions.throttle = 1;
    world.inputs.actions.steer = 1;
    world.step(180);
    expect(world.car.state.speedKmh).toBeLessThan(1);
    expect(world.car.state.steer).toBe(0);
    expect(world.car.state.brake).toBe(1);
    world.car.frozen = false;
    world.step(120);
    expect(world.car.state.speedKmh).toBeGreaterThan(5);
  });

  it('does nothing once it has been destroyed', async () => {
    world = await carWorld();
    world.step(10);
    world.object.destroy();
    world.car.reset();
    world.car.fixedUpdate?.();
    world.car.render?.();
    expect(world.car.heading).toBe(0);
  });
});
