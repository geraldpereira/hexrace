import { TestBed } from '@angular/core/testing';

import { CarPoses } from '@car/physics/car-poses';
import { type RigWorld, rigWorld } from '@car/physics/car-world.mock';

describe('CarPoses', () => {
  let world: RigWorld;

  afterEach(() => {
    world.destroy();
  });

  it('places the chassis and the wheels, and does not mind a missing contact', async () => {
    world = await rigWorld();
    world.step(30);
    const poses = TestBed.inject(CarPoses);
    const pose = poses.create(4);
    expect(pose.wheels).toHaveLength(4);
    poses.read(world.rig, [], pose);
    expect(pose.rotation.w).not.toBe(0);
    expect(pose.position.y).toBeGreaterThan(0);
    expect(pose.wheels[0]?.position.x).toBeLessThan(0);
    expect(pose.wheels[1]?.position.x).toBeGreaterThan(0);
  });
});
