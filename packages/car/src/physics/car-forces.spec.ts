import { type CarController } from '@car/physics/car-controller';
import { type CarWorld, carWorld } from '@car/physics/car-world.mock';
import { carOptions } from '@car/entity/car.mock';

describe('CarForces', () => {
  let world: CarWorld;

  afterEach(() => {
    world.destroy();
  });

  it('loads the car with the wing, more and more as it goes faster', async () => {
    world = await carWorld((car: CarController) => {
      car.options = carOptions();
      car.options.wing.enabled = true;
    });
    world.step(60);
    expect(world.car.state.downforcePercent).toBeCloseTo(0, 1);
    world.inputs.actions.throttle = 1;
    world.step(240);
    expect(world.car.state.downforcePercent).toBeGreaterThan(5);
  });

  it('damps a spin when the touch assist is on, and reports the rate either way', async () => {
    world = await carWorld((car: CarController) => {
      car.options = carOptions();
      car.options.yawDamping.enabled = true;
      car.options.yawDamping.damping = 8;
    });
    world.step(60);
    world.inputs.actions.throttle = 1;
    world.step(120);
    world.inputs.actions.steer = 1;
    world.step(60);
    const damped = Math.abs(world.car.state.yawRateDeg);
    world.car.options.yawDamping.enabled = false;
    world.step(60);
    expect(Math.abs(world.car.state.yawRateDeg)).toBeGreaterThan(damped);
  });

  it('drags the car down on a heavy surface, and stops shaking it when the grain is off', async () => {
    world = await carWorld((car: CarController) => {
      car.defaultSurface = { environment: 'europe', zone: 'shoulder', rank: 3 };
    });
    world.step(60);
    world.inputs.actions.throttle = 1;
    world.step(240);
    const bogged = world.car.state.speedKmh;
    expect(bogged).toBeLessThan(60);
    world.car.grain = false;
    world.step(30);
    for (const contact of world.car.contacts) expect(contact.bump).toBe(0);
  });
});
