import { TestBed } from '@angular/core/testing';

import { FIRM } from '@car/entity/surfaces/sealed-feels';
import { WheelContacts } from '@car/physics/wheel-contacts';
import { type CarWorld, type RigWorld, carWorld, rigWorld } from '@car/physics/car-world.mock';

describe('WheelContacts', () => {
  it('reads the contacts, skipping the wheels the caller did not make room for', async () => {
    const world: RigWorld = await rigWorld();
    world.step(60);
    const contacts = TestBed.inject(WheelContacts);
    const room = contacts.create(2, FIRM);
    const lengths: number[] = [];
    contacts.read(world.rig, room, lengths, 1 / 60);
    expect(room[0]?.contact).toBe(true);
    expect(room[0]?.suspensionVelocity).toBe(0);
    expect(lengths).toHaveLength(2);
    contacts.read(world.rig, room, lengths, 1 / 60);
    expect(room[0]?.width).toBeCloseTo(0.22);
    expect(room[0]?.normal.y).toBeCloseTo(1);
    world.destroy();
  });

  it('zeroes the slip speed of a wheel in the air', async () => {
    const world: CarWorld = await carWorld();
    world.car.reset();
    world.step(1);
    expect(world.car.state.airborne).toBe(true);
    expect(world.car.contacts[0]?.slipSpeed).toBe(0);
    world.destroy();
  });
});
