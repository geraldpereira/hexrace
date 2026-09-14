import { TestBed } from '@angular/core/testing';
import { JoltPhysics } from '@hexrace/engine';

import { carSpec } from '@car/entity/car.mock';
import { CarBodies } from '@car/physics/car-bodies';

describe('CarBodies', () => {
  it('builds the four wheels and frees everything again, whatever the transmission', async () => {
    const physics = TestBed.inject(JoltPhysics);
    await physics.load();
    const bodies = TestBed.inject(CarBodies);
    for (const transmission of ['front', 'rear', 'all'] as const) {
      const spec = carSpec();
      spec.transmission = transmission;
      const rig = bodies.create(spec, { x: 0, y: 2, z: 0 }, { x: 0, y: 0, z: 0, w: 1 });
      expect(rig.wheels).toHaveLength(4);
      expect(rig.wheels[0]?.GetSettings().mMaxSteerAngle).toBeGreaterThan(0);
      expect(rig.wheels[2]?.GetSettings().mMaxSteerAngle).toBe(0);
      expect(rig.controller.GetEngine().get_mMaxRPM()).toBe(spec.engine.maxRpm);
      expect(1 / rig.body.GetMotionProperties().GetInverseMass()).toBeCloseTo(spec.chassis.mass);
      bodies.destroy(rig);
    }
    expect(physics.physicsSystem.GetNumBodies()).toBe(0);
  });
});
